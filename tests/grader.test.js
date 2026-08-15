import { describe, expect, it } from 'vitest';
import { chapters, exercises, exercisesByChapter } from '../src/data/exercises.js';
import { getExpectedResult, getTablePreview, gradeExercise } from '../src/lib/grader.js';
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
      expect(exercise.task.trim()).not.toBe('');
      expect(exercise.solutionSql.trim()).not.toBe('');
      expect(['beginner', 'intermediate', 'advanced']).toContain(exercise.level);
      if (exercise.mode === 'schema' || exercise.mode === 'mutation') {
        expect(exercise.verifierSql?.trim()).not.toBe('');
      }
    }
  });
});

describe('SQL grading engine', () => {
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
  });

  it('returns a readable SQL error', async () => {
    const outcome = await gradeExercise(exercisesByChapter[7][0], 'SELECT definitely_missing FROM orders;');
    expect(outcome.correct).toBe(false);
    expect(outcome.error).toBe(true);
    expect(outcome.message.length).toBeGreaterThan(0);
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
