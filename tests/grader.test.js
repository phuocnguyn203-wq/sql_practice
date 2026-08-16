import { describe, expect, it } from 'vitest';
import { chapters, exercises, exercisesByChapter } from '../src/data/exercises.js';
import { exerciseContextCount } from '../src/data/exerciseContexts.js';
import { createDatabase, getExpectedResult, getTablePreview, gradeExercise } from '../src/lib/grader.js';
import { tableCatalog } from '../src/data/database.js';

describe('exercise catalog', () => {
  it('contains exactly 36 exercises for every requested chapter', () => {
    expect(chapters.map((chapter) => chapter.id)).toEqual([7, 8, 9, 10, 12, 13]);
    for (const chapter of chapters) {
      expect(exercisesByChapter[chapter.id]).toHaveLength(36);
    }
    expect(exercises).toHaveLength(216);
  });

  it('has unique IDs and complete grading metadata', () => {
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length);
    for (const exercise of exercises) {
      expect(exercise.title.trim()).not.toBe('');
      expect(exercise.context.trim()).not.toBe('');
      expect(exercise.context.length).toBeLessThanOrEqual(120);
      expect(exercise.task.trim()).not.toBe('');
      expect(exercise.solutionSql.trim()).not.toBe('');
      expect(['beginner', 'intermediate', 'advanced']).toContain(exercise.level);
      if (exercise.mode === 'schema' || exercise.mode === 'mutation') {
        expect(exercise.verifierSql?.trim()).not.toBe('');
      }
    }
  });

  it('provides a short, separate context for all 216 exercises', () => {
    expect(exerciseContextCount).toBe(216);
    expect(exercises.every((exercise) => exercise.context !== exercise.task)).toBe(true);
  });

  it('keeps chapter 8 requirements outcome-focused instead of spelling out DDL syntax', () => {
    const syntaxHeavy = /\b(INTEGER|TEXT|REAL|PRIMARY KEY|NOT NULL|UNIQUE|CHECK|REFERENCES|CREATE TABLE|SELECT \*|DEFAULT|ON DELETE|IS NOT NULL)\b/i;
    for (const exercise of exercisesByChapter[8]) {
      expect(exercise.task, exercise.id).not.toMatch(syntaxHeavy);
    }
  });

  it('states columns and data types for every from-scratch schema task in chapter 8', () => {
    const expectedColumns = {
      1: ['id', 'name'],
      2: ['code', 'country_name'],
      3: ['id', 'code', 'title'],
      4: ['id', 'name', 'fee'],
      5: ['id', 'subject', 'status'],
      6: ['id', 'course_id', 'title'],
      7: ['id', 'post_id'],
      8: ['student_id', 'course_id', 'enrolled_at'],
      9: ['list_id', 'list_name', 'created_at'],
      19: ['id', 'rating', 'note'],
      20: ['id', 'title', 'minimum_salary'],
      21: ['id', 'channel'],
      22: ['id', 'shipment_id', 'note'],
      23: ['list_id', 'product_id', 'added_at'],
      24: ['id', 'message', 'created_at'],
      25: ['id', 'code', 'city', 'capacity'],
      27: ['id', 'customer_id', 'address'],
      32: ['id', 'table_name', 'row_id', 'action', 'changed_at'],
      35: ['id', 'label', 'min_price', 'max_price'],
      36: ['id', 'customer_id', 'status', 'created_at'],
    };

    for (const [number, columns] of Object.entries(expectedColumns)) {
      const task = exercisesByChapter[8][Number(number) - 1].task;
      for (const column of columns) expect(task, `8.${number} thiếu ${column}`).toContain(column);
      expect(task, `8.${number} thiếu kiểu dữ liệu`).toMatch(/số nguyên|văn bản|số thực|mốc thời gian/);
    }
  });
});

describe('SQL grading engine', () => {
  it('runs an actual PostgreSQL engine', async () => {
    const db = await createDatabase();
    try {
      const result = await db.query('SELECT version() AS engine_version;');
      expect(result.rows[0].engine_version).toMatch(/^PostgreSQL /);
    } finally {
      await db.close();
    }
  });

  for (const chapter of chapters) {
    it(`accepts all official solutions in chapter ${chapter.id}`, async () => {
      for (const exercise of exercisesByChapter[chapter.id]) {
        const outcome = await gradeExercise(exercise, exercise.solutionSql);
        expect(outcome.correct, `${exercise.id}: ${outcome.message}`).toBe(true);
      }
    });
  }

  it('rejects a valid query with the wrong result', async () => {
    const outcome = await gradeExercise(exercisesByChapter[7][0], 'SELECT id AS order_id, name AS customer_name, total_spent AS total FROM customers;');
    expect(outcome.correct).toBe(false);
    expect(outcome.error).not.toBe(true);
    expect(outcome.difference?.join(' ')).toMatch(/Số hàng|Thiếu hàng|Hàng thừa/);
  });

  it('explains missing result columns without revealing solution SQL', async () => {
    const outcome = await gradeExercise(exercisesByChapter[7][0], 'SELECT id AS order_id FROM orders;');
    expect(outcome.correct).toBe(false);
    expect(outcome.difference?.join(' ')).toMatch(/Thiếu cột: customer_name, total/);
    expect(outcome.difference?.join(' ')).not.toContain('SELECT');
  });

  it('explains when correct rows are returned in the wrong order', async () => {
    const exercise = exercisesByChapter[12][34];
    const reversedQuery = exercise.solutionSql.replace('ORDER BY order_date,id;', 'ORDER BY order_date DESC,id DESC;');
    const outcome = await gradeExercise(exercise, reversedQuery);
    expect(outcome.correct).toBe(false);
    expect(outcome.difference?.join(' ')).toMatch(/chưa đúng thứ tự/);
  });

  it('rejects a services fee rule that still allows zero', async () => {
    const exercise = exercisesByChapter[8][3];
    const outcome = await gradeExercise(exercise, 'CREATE TABLE services (id INTEGER PRIMARY KEY, name TEXT NOT NULL, fee REAL NOT NULL CHECK (fee >= 0));');
    expect(outcome.correct).toBe(false);
    expect(outcome.error).not.toBe(true);
  });

  it('accepts an equivalent audit timestamp default using now()', async () => {
    const exercise = exercisesByChapter[8][23];
    const outcome = await gradeExercise(exercise, `
      CREATE TABLE audit_entries (
        id INTEGER PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    expect(outcome.correct, outcome.message).toBe(true);
  });

  it('accepts equivalent PostgreSQL schema syntax throughout chapter 8', async () => {
    const cases = [
      {
        exercise: exercisesByChapter[8][0],
        sql: 'CREATE TABLE mentors (id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL);',
      },
      {
        exercise: exercisesByChapter[8][3],
        sql: 'CREATE TABLE services (id BIGINT PRIMARY KEY, name VARCHAR NOT NULL, fee NUMERIC NOT NULL CHECK (fee > 0));',
      },
      {
        exercise: exercisesByChapter[8][4],
        sql: "CREATE TABLE tickets (id BIGINT PRIMARY KEY, subject VARCHAR NOT NULL, status VARCHAR NOT NULL DEFAULT 'open');",
      },
      {
        exercise: exercisesByChapter[8][31],
        sql: `
          CREATE TABLE change_log (
            id INTEGER PRIMARY KEY,
            table_name TEXT NOT NULL,
            row_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            changed_at TIMESTAMPTZ DEFAULT now()
          );
        `,
      },
    ];

    for (const testCase of cases) {
      const outcome = await gradeExercise(testCase.exercise, testCase.sql);
      expect(outcome.correct, `${testCase.exercise.id}: ${outcome.message}\n${outcome.difference?.join('\n') || ''}`).toBe(true);
    }
  });

  it('still rejects missing or incorrect defaults required by an exercise', async () => {
    const wrongTicketDefault = await gradeExercise(
      exercisesByChapter[8][4],
      "CREATE TABLE tickets (id INTEGER PRIMARY KEY, subject TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'closed');",
    );
    expect(wrongTicketDefault.correct).toBe(false);

    const missingChangeLogDefault = await gradeExercise(
      exercisesByChapter[8][31],
      'CREATE TABLE change_log (id INTEGER PRIMARY KEY, table_name TEXT NOT NULL, row_id INTEGER NOT NULL, action TEXT NOT NULL, changed_at TIMESTAMP);',
    );
    expect(missingChangeLogDefault.correct).toBe(false);
  });

  it('returns a readable SQL error', async () => {
    const outcome = await gradeExercise(exercisesByChapter[7][0], 'SELECT definitely_missing FROM orders;');
    expect(outcome.correct).toBe(false);
    expect(outcome.error).toBe(true);
    expect(outcome.message.length).toBeGreaterThan(0);
    expect(outcome.difference).toBeUndefined();
  });

  it('blocks unsafe database attachment commands', async () => {
    const outcome = await gradeExercise(exercisesByChapter[7][0], "ATTACH DATABASE 'x.db' AS other;");
    expect(outcome.correct).toBe(false);
    expect(outcome.error).toBe(true);
    expect(outcome.message).toMatch(/bị khóa/);
  });

  it('handles an empty query without throwing', async () => {
    const outcome = await gradeExercise(exercisesByChapter[7][0], '   ');
    expect(outcome.correct).toBe(false);
    expect(outcome.error).toBe(true);
    expect(outcome.message).toMatch(/nhập câu lệnh SQL/i);
  });

  it('can generate a non-SQL reference result for every exercise', async () => {
    for (const exercise of exercises) {
      const preview = await getExpectedResult(exercise);
      expect(preview.columns.length, exercise.id).toBeGreaterThan(0);
      expect(Array.isArray(preview.values), exercise.id).toBe(true);
    }
  });

  it('can browse every source table', async () => {
    for (const table of Object.keys(tableCatalog)) {
      const preview = await getTablePreview(table);
      expect(preview.columns.length, table).toBeGreaterThan(0);
      expect(preview.values.length, table).toBeGreaterThan(0);
      expect(preview.totalRows, table).toBeGreaterThanOrEqual(preview.values.length);
    }
  });
});
