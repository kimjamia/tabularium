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
