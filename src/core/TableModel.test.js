import { describe, it, expect } from 'vitest';
import { TableModel } from './TableModel.js';

const baseColumns = [
  { key: 'score', type: 'number', label: 'Score' },
  { key: 'label', label: 'Label' },
];

const baseOptions = {
  allowAddEmptyRow: false,
};

function getColumnValues(model, columnKey) {
  return model
    .getViewRows({ includeEmptyRow: false })
    .map(({ data }) => data[columnKey]);
}

describe('TableModel sorting', () => {
  it('sorts ascending then descending when cycling a numeric column', () => {
    const rows = [
      { score: 5, label: 'third' },
      { score: 1, label: 'first' },
      { score: 3, label: 'second' },
    ];
    const model = new TableModel({ columns: baseColumns, data: rows, options: baseOptions });

    const originalScores = getColumnValues(model, 'score');
    expect(originalScores).toEqual([5, 1, 3]);

    model.cycleSort('score');
    expect(getColumnValues(model, 'score')).toEqual([1, 3, 5]);

    model.cycleSort('score');
    expect(getColumnValues(model, 'score')).toEqual([5, 3, 1]);
  });

  it('restores the original order after sorting is cleared', () => {
    const rows = [
      { score: 10, label: 'second' },
      { score: 10, label: 'first' },
      { score: 10, label: 'third' },
    ];
    const model = new TableModel({ columns: baseColumns, data: rows, options: baseOptions });

    const initialLabels = getColumnValues(model, 'label');
    expect(initialLabels).toEqual(['second', 'first', 'third']);

    model.cycleSort('score'); // ascending (no visible change because values match)
    model.cycleSort('score'); // descending (reverses order)
    expect(getColumnValues(model, 'label')).toEqual(['third', 'first', 'second']);

    model.cycleSort('score'); // back to original
    expect(getColumnValues(model, 'label')).toEqual(initialLabels);
  });
});

describe('TableModel merging', () => {
  const mergeColumns = [
    { key: 'name', label: 'Name', unique: true },
    { key: 'status', label: 'Status' },
    { key: 'score', label: 'Score', type: 'number' },
  ];

  it('merges rows using selected columns and replaces missing entries', () => {
    const rows = [
      { name: 'Ava', status: 'draft', score: 10 },
      { name: 'Ben', status: 'approved', score: 20 },
    ];

    const model = new TableModel({ columns: mergeColumns, data: rows, options: { allowAddEmptyRow: false } });

    const summary = model.mergeRows([
      { name: 'Ben', status: 'updated', score: 25 },
      { name: 'Cara', status: 'new', score: 30 },
    ], {
      updateColumns: ['status', 'score'],
    });

    expect(model.getRawData()).toEqual([
      { name: 'Ben', status: 'updated', score: 25 },
      { name: 'Cara', status: 'new', score: 30 },
    ]);

    expect(summary?.type).toBe('merge');
    expect(summary?.meta?.merge.added).toHaveLength(1);
    expect(summary?.meta?.merge.removed).toHaveLength(1);
    expect(summary?.meta?.merge.updated).toHaveLength(1);
  });

  it('requires at least one merge key column', () => {
    const model = new TableModel({ columns: mergeColumns, data: [], options: { allowAddEmptyRow: false } });
    expect(() => model.mergeRows([], { updateColumns: ['name', 'status', 'score'] }))
      .toThrow(/merge key column/i);
  });

  it('supports undo and redo for merge operations', () => {
    const rows = [
      { name: 'Ava', status: 'draft', score: 10 },
      { name: 'Ben', status: 'approved', score: 20 },
    ];

    const model = new TableModel({ columns: mergeColumns, data: rows, options: { allowAddEmptyRow: false } });

    model.mergeRows([
      { name: 'Ben', status: 'updated', score: 25 },
    ], { updateColumns: ['status', 'score'] });

    expect(model.getRawData()).toEqual([
      { name: 'Ben', status: 'updated', score: 25 },
    ]);

    model.undo();
    expect(model.getRawData()).toEqual(rows);

    model.redo();
    expect(model.getRawData()).toEqual([
      { name: 'Ben', status: 'updated', score: 25 },
    ]);
  });
});
