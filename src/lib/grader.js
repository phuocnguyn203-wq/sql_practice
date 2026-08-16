import { PGlite } from '@electric-sql/pglite';
import { databaseSql, tableCatalog } from '../data/database.js';

let enginePromise;
let canonicalDatabasePromise;
let databaseSnapshotPromise;
const expectedResultCache = new Map();
const expectedGradeCache = new Map();
const tablePreviewCache = new Map();

export function loadSqlEngine() {
  if (!enginePromise) enginePromise = getCanonicalDatabase().then(() => true);
  return enginePromise;
}

async function initializeDatabase() {
  const db = await PGlite.create({ dataDir: 'memory://' });
  await db.exec(databaseSql);
  return db;
}

function getCanonicalDatabase() {
  if (!canonicalDatabasePromise) canonicalDatabasePromise = initializeDatabase();
  return canonicalDatabasePromise;
}

function getDatabaseSnapshot() {
  if (!databaseSnapshotPromise) {
    databaseSnapshotPromise = getCanonicalDatabase().then((db) => db.dumpDataDir());
  }
  return databaseSnapshotPromise;
}

export async function createDatabase() {
  await loadSqlEngine();
  const snapshot = await getDatabaseSnapshot();
  return PGlite.create({ dataDir: 'memory://', loadDataDir: snapshot });
}

function toResult(result) {
  const columns = (result?.fields || []).map((field) => field.name);
  const values = (result?.rows || []).map((row) => (Array.isArray(row) ? row : columns.map((column) => row[column])));
  return { columns, values };
}

function lastResult(results) {
  return results.length ? toResult(results[results.length - 1]) : { columns: [], values: [] };
}

function execute(db, sql) {
  return db.exec(sql, { rowMode: 'array' });
}

function cleanValue(value) {
  if (typeof value === 'number') return Math.round(value * 1e8) / 1e8;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function normalizeResult(result, orderMatters = false) {
  const normalized = {
    columns: (result?.columns || []).map((column) => column.toLowerCase()),
    values: (result?.values || []).map((row) => row.map(cleanValue)),
  };
  if (!orderMatters) normalized.values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return normalized;
}

export function resultsEqual(actual, expected, orderMatters = false) {
  return JSON.stringify(normalizeResult(actual, orderMatters)) === JSON.stringify(normalizeResult(expected, orderMatters));
}

function countValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

function subtractRows(sourceRows, comparisonRows) {
  const available = countValues(comparisonRows.map((row) => JSON.stringify(row)));
  return sourceRows.filter((row) => {
    const key = JSON.stringify(row);
    const count = available.get(key) || 0;
    if (!count) return true;
    available.set(key, count - 1);
    return false;
  });
}

function clippedValue(value) {
  const valueText = value === null ? 'NULL' : String(value);
  return valueText.length > 32 ? `${valueText.slice(0, 29)}…` : valueText;
}

function describeRows(label, rows, columns) {
  const samples = rows.slice(0, 2).map((row) => row
    .slice(0, 4)
    .map((value, index) => `${columns[index] || `cột ${index + 1}`}=${clippedValue(value)}`)
    .join(' · '));
  const remaining = rows.length - samples.length;
  return `${label}: ${samples.join(' | ')}${remaining > 0 ? ` (+${remaining} hàng khác)` : ''}.`;
}

export function describeResultDifference(actual, expected, orderMatters = false) {
  const actualNormalized = normalizeResult(actual, true);
  const expectedNormalized = normalizeResult(expected, true);
  const actualColumns = actualNormalized.columns;
  const expectedColumns = expectedNormalized.columns;
  const messages = [];

  if (actualNormalized.values.length !== expectedNormalized.values.length) {
    messages.push(`Số hàng: kết quả của bạn ${actualNormalized.values.length}, đáp án ${expectedNormalized.values.length}.`);
  }

  const missingColumns = expectedColumns.filter((column) => !actualColumns.includes(column));
  const extraColumns = actualColumns.filter((column) => !expectedColumns.includes(column));
  if (missingColumns.length) messages.push(`Thiếu cột: ${missingColumns.join(', ')}.`);
  if (extraColumns.length) messages.push(`Thừa cột: ${extraColumns.join(', ')}.`);

  const sameColumnSet = missingColumns.length === 0
    && extraColumns.length === 0
    && actualColumns.length === expectedColumns.length;
  const sameColumnOrder = JSON.stringify(actualColumns) === JSON.stringify(expectedColumns);
  if (sameColumnSet && !sameColumnOrder) messages.push(`Thứ tự cột cần là: ${expectedColumns.join(', ')}.`);

  if (sameColumnOrder) {
    const missingRows = subtractRows(expectedNormalized.values, actualNormalized.values);
    const extraRows = subtractRows(actualNormalized.values, expectedNormalized.values);
    if (orderMatters && missingRows.length === 0 && extraRows.length === 0
      && JSON.stringify(actualNormalized.values) !== JSON.stringify(expectedNormalized.values)) {
      messages.push('Các hàng có dữ liệu đúng nhưng chưa đúng thứ tự yêu cầu.');
    } else {
      if (missingRows.length) messages.push(describeRows('Thiếu hàng', missingRows, expectedColumns));
      if (extraRows.length) messages.push(describeRows('Hàng thừa hoặc sai', extraRows, actualColumns));
    }
  }

  if (!messages.length) messages.push('Giá trị hoặc kiểu dữ liệu chưa khớp với kết quả mong đợi.');
  return messages;
}

async function getExpectedGradeResult(exercise) {
  if (expectedGradeCache.has(exercise.id)) return expectedGradeCache.get(exercise.id);
  if (exercise.mode !== 'mutation' && exercise.mode !== 'schema') {
    const db = await getCanonicalDatabase();
    const result = lastResult(await execute(db, exercise.solutionSql));
    expectedGradeCache.set(exercise.id, result);
    expectedResultCache.set(exercise.id, result);
    return result;
  }
  let db;
  try {
    db = await createDatabase();
    const solutionRun = await execute(db, exercise.solutionSql);
    const result = exercise.mode === 'mutation' || exercise.mode === 'schema'
      ? lastResult(await execute(db, exercise.verifierSql))
      : lastResult(solutionRun);
    expectedGradeCache.set(exercise.id, result);
    return result;
  } finally {
    await db?.close();
  }
}

export async function getExpectedResult(exercise) {
  if (expectedResultCache.has(exercise.id)) return expectedResultCache.get(exercise.id);
  if (exercise.mode !== 'mutation' && exercise.mode !== 'schema') return getExpectedGradeResult(exercise);
  let db;
  try {
    db = await createDatabase();
    const solutionRun = await execute(db, exercise.solutionSql);
    let result;
    if (exercise.displaySql) result = lastResult(await execute(db, exercise.displaySql));
    else if (exercise.mode === 'mutation' || exercise.mode === 'schema') result = lastResult(await execute(db, exercise.verifierSql));
    else result = lastResult(solutionRun);
    expectedResultCache.set(exercise.id, result);
    return result;
  } finally {
    await db?.close();
  }
}

export async function getTablePreview(table) {
  if (!Object.hasOwn(tableCatalog, table)) throw new Error('Bảng không tồn tại trong dữ liệu thực hành.');
  if (tablePreviewCache.has(table)) return tablePreviewCache.get(table);
  let db;
  try {
    db = await createDatabase();
    const data = lastResult(await execute(db, `SELECT * FROM "${table}" LIMIT 50;`));
    const count = lastResult(await execute(db, `SELECT COUNT(*) AS total_rows FROM "${table}";`));
    const preview = { ...data, totalRows: Number(count.values[0]?.[0] || 0) };
    tablePreviewCache.set(table, preview);
    return preview;
  } finally {
    await db?.close();
  }
}

function validateQuery(query) {
  if (!query.trim()) throw new Error('Hãy nhập câu lệnh SQL trước khi chạy.');
  if (query.length > 12000) throw new Error('Query quá dài cho phòng lab này.');
  const blocked = /\b(attach|detach|copy\s+[^;]+\s+program|create\s+extension|alter\s+system|pg_read_file|pg_write_file|lo_import|lo_export|dblink)\b/i;
  if (blocked.test(query)) throw new Error('Lệnh này bị khóa để giữ môi trường thực hành an toàn.');
}

export async function gradeExercise(exercise, query) {
  try {
    validateQuery(query);
  } catch (error) {
    return { correct: false, result: { columns: [], values: [] }, message: error.message, error: true };
  }

  let userDb;
  try {
    userDb = await createDatabase();
    const userRun = await execute(userDb, query);
    const actual = exercise.mode === 'mutation' || exercise.mode === 'schema'
      ? lastResult(await execute(userDb, exercise.verifierSql))
      : lastResult(userRun);
    const expected = await getExpectedGradeResult(exercise);
    const correct = resultsEqual(actual, expected, exercise.orderMatters);
    const visible = exercise.displaySql ? lastResult(await execute(userDb, exercise.displaySql)) : actual;

    return {
      correct,
      result: visible,
      difference: correct ? null : describeResultDifference(actual, expected, exercise.orderMatters),
      message: correct
        ? 'Kết quả chính xác. Bài tập đã hoàn thành.'
        : 'Query chạy được nhưng kết quả chưa khớp yêu cầu.',
    };
  } catch (error) {
    return {
      correct: false,
      result: { columns: [], values: [] },
      message: error.message || 'Không thể thực thi query.',
      error: true,
    };
  } finally {
    await userDb?.close();
  }
}
