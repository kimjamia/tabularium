import { describe, it, expect } from 'vitest';
import { TableModel } from '../src/core/TableModel.js';

const COLUMNS = [
  { key: 'colA', editable: true },
  { key: 'colB', editable: true },
  { key: 'colC', editable: true },
  { key: 'colD', editable: true },
];

function createModel(data) {
  return new TableModel({
    columns: COLUMNS,
    data,
    options: {
      allowAddEmptyRow: false,
    },
  });
}

describe('TableModel.fill directions', () => {
  it('fills downward by repeating the selected rows', () => {
    const model = createModel([
      { colA: 'down-a', colB: 'down-b', colC: null, colD: null },
    ]);

    const selection = { startRow: 0, endRow: 0, startCol: 0, endCol: 1 };
    const target = { startRow: 0, endRow: 2, startCol: 0, endCol: 1 };

    const summary = model.fill(selection, target);

    expect(summary).not.toBeNull();
    expect(model.getRowCount()).toBe(3);
    expect(model.getRow(1)).toMatchObject({ colA: 'down-a', colB: 'down-b' });
    expect(model.getRow(2)).toMatchObject({ colA: 'down-a', colB: 'down-b' });
  });

  it('fills upward into rows above the selection', () => {
    const model = createModel([
      { colA: null, colB: null, colC: null, colD: null },
      { colA: null, colB: null, colC: null, colD: null },
      { colA: 'up-a', colB: 'up-b', colC: null, colD: null },
    ]);

    const selection = { startRow: 2, endRow: 2, startCol: 0, endCol: 1 };
    const target = { startRow: 0, endRow: 2, startCol: 0, endCol: 1 };

    const summary = model.fill(selection, target);

    expect(summary).not.toBeNull();
    expect(model.getRow(0)).toMatchObject({ colA: 'up-a', colB: 'up-b' });
    expect(model.getRow(1)).toMatchObject({ colA: 'up-a', colB: 'up-b' });
  });

  it('fills rightward across additional columns', () => {
    const model = createModel([
      { colA: 'right-a', colB: 'right-b', colC: null, colD: null },
    ]);

    const selection = { startRow: 0, endRow: 0, startCol: 0, endCol: 1 };
    const target = { startRow: 0, endRow: 0, startCol: 0, endCol: 3 };

    const summary = model.fill(selection, target);

    expect(summary).not.toBeNull();
    expect(model.getRow(0)).toMatchObject({
      colA: 'right-a',
      colB: 'right-b',
      colC: 'right-a',
      colD: 'right-b',
    });
  });

  it('fills leftward into columns preceding the selection', () => {
    const model = createModel([
      { colA: null, colB: null, colC: 'left', colD: null },
    ]);

    const selection = { startRow: 0, endRow: 0, startCol: 2, endCol: 2 };
    const target = { startRow: 0, endRow: 0, startCol: 0, endCol: 2 };

    const summary = model.fill(selection, target);

    expect(summary).not.toBeNull();
    expect(model.getRow(0)).toMatchObject({
      colA: 'left',
      colB: 'left',
      colC: 'left',
    });
  });
});

