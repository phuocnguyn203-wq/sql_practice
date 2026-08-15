import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { databaseSql, tableCatalog } from '../data/database.js';

let sqlPromise;
const expectedResultCache = new Map();
const tablePreviewCache = new Map();

export function loadSqlEngine() {
  if (!sqlPromise) {
    const resolvedWasmUrl = typeof window === 'undefined' && typeof process !== 'undefined' && wasmUrl.startsWith('/')
      ? `${process.cwd()}${wasmUrl}`
      : wasmUrl;
    sqlPromise = initSqlJs({ locateFile: () => resolvedWasmUrl });
  }
  return sqlPromise;
}

export async function createDatabase() {
  const SQL = await loadSqlEngine();
  const db = new SQL.Database();
  db.run(databaseSql);
  return db;
}

function lastResult(results) {
  return results.length ? results[results.length - 1] : { columns: [], values: [] };
}

function preparedResult(db, sql) {
  const statement = db.prepare(sql);
  try {
    const columns = statement.getColumnNames();
    const values = [];
    while (statement.step()) values.push(statement.get());
    return { columns, values };
  } finally {
    statement.free();
  }
}

function cleanValue(value) {
  if (typeof value === 'number') return Math.round(value * 1e8) / 1e8;
  return value;
}

export function normalizeResult(result, orderMatters = false) {
  const normalized = {
    columns: (result?.columns || []).map((column) => column.toLowerCase()),
    values: (result?.values || []).map((row) => row.map(cleanValue)),
  };
  if (!orderMatters) {
    normalized.values.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return normalized;
}

export function resultsEqual(actual, expected, orderMatters = false) {
  return JSON.stringify(normalizeResult(actual, orderMatters)) === JSON.stringify(normalizeResult(expected, orderMatters));
}

export async function getExpectedResult(exercise) {
  if (expectedResultCache.has(exercise.id)) return expectedResultCache.get(exercise.id);
  let db;
  try {
    db = await createDatabase();
    const solutionRun = db.exec(exercise.solutionSql);
    if (exercise.displaySql) {
      const displayed = lastResult(db.exec(exercise.displaySql));
      if (displayed.columns.length) {
        expectedResultCache.set(exercise.id, displayed);
        return displayed;
      }
    }
    if (exercise.mode === 'mutation' || exercise.mode === 'schema') {
      const verified = lastResult(db.exec(exercise.verifierSql));
      expectedResultCache.set(exercise.id, verified);
      return verified;
    }
    const result = lastResult(solutionRun);
    const completeResult = result.columns.length ? result : preparedResult(db, exercise.solutionSql);
    expectedResultCache.set(exercise.id, completeResult);
    return completeResult;
  } finally {
    db?.close();
  }
}

export async function getTablePreview(table) {
  if (!Object.hasOwn(tableCatalog, table)) throw new Error('Bảng không tồn tại trong dữ liệu thực hành.');
  if (tablePreviewCache.has(table)) return tablePreviewCache.get(table);
  let db;
  try {
    db = await createDatabase();
    const data = lastResult(db.exec(`SELECT * FROM "${table}" LIMIT 50;`));
    const count = lastResult(db.exec(`SELECT COUNT(*) AS total_rows FROM "${table}";`));
    const preview = { ...data, totalRows: count.values[0]?.[0] || 0 };
    tablePreviewCache.set(table, preview);
    return preview;
  } finally {
    db?.close();
  }
}

function validateQuery(query) {
  if (!query.trim()) throw new Error('Hãy nhập câu lệnh SQL trước khi chạy.');
  if (query.length > 12000) throw new Error('Query quá dài cho phòng lab này.');
  const blocked = /\b(attach|detach|load_extension|writable_schema)\b/i;
  if (blocked.test(query)) throw new Error('Lệnh này bị khóa để giữ môi trường thực hành an toàn.');
}

export async function gradeExercise(exercise, query) {
  try {
    validateQuery(query);
  } catch (error) {
    return {
      correct: false,
      result: { columns: [], values: [] },
      message: error.message,
      error: true,
    };
  }

  let userDb;
  let expectedDb;
  try {
    userDb = await createDatabase();
    expectedDb = await createDatabase();
    const userRun = userDb.exec(query);
    expectedDb.exec(exercise.solutionSql);

    let actual;
    let expected;
    if (exercise.mode === 'mutation' || exercise.mode === 'schema') {
      actual = lastResult(userDb.exec(exercise.verifierSql));
      expected = lastResult(expectedDb.exec(exercise.verifierSql));
    } else {
      actual = lastResult(userRun);
      expected = lastResult(expectedDb.exec(exercise.solutionSql));
    }

    const correct = resultsEqual(actual, expected, exercise.orderMatters);
    const visible = exercise.displaySql
      ? lastResult(userDb.exec(exercise.displaySql))
      : actual;

    return {
      correct,
      result: visible,
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
    userDb?.close();
    expectedDb?.close();
  }
}
