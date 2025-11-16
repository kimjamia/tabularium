import { describe, it, expect, vi } from 'vitest';
import { TableModel } from '../TableModel.js';

const baseColumns = [
  { key: 'name', type: 'text', sortable: true },
  { key: 'age', type: 'number', sortable: true },
];

const baseData = [
  { name: 'Charlie', age: 30 },
  { name: 'Alice', age: 42 },
  { name: 'Bob', age: 25 },
];

function createModel(overrides = {}) {
  return new TableModel({
    columns: overrides.columns ?? baseColumns,
    data: overrides.data ?? baseData,
    options: { allowAddEmptyRow: false, ...(overrides.options ?? {}) },
  });
}

function extractColumn(model, key) {
  return model.getViewRows({ includeEmptyRow: false }).map(({ data }) => data[key]);
}

describe('TableModel sorting', () => {
  it('sorts text columns ascending and descending', () => {
    const model = createModel();

    model.setSort('name', 'asc');
    expect(extractColumn(model, 'name')).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(model.getSortState()).toEqual({ columnKey: 'name', direction: 'asc' });

    model.setSort('name', 'desc');
    expect(extractColumn(model, 'name')).toEqual(['Charlie', 'Bob', 'Alice']);
    expect(model.getSortState()).toEqual({ columnKey: 'name', direction: 'desc' });
  });

  it('sorts numeric columns with empty values placed last', () => {
    const model = createModel({
      columns: [{ key: 'score', type: 'number', sortable: true }],
      data: [{ score: 5 }, { score: null }, { score: 10 }],
    });

    model.setSort('score', 'asc');
    expect(extractColumn(model, 'score')).toEqual([5, 10, null]);
  });

  it('emits a sort summary when the order changes', () => {
    const model = createModel();
    const listener = vi.fn();
    model.registerChangeListener(listener);

    model.setSort('age', 'desc');

    expect(listener).toHaveBeenCalledTimes(1);
    const summary = listener.mock.calls[0][0];
    expect(summary.type).toBe('sort');
    expect(summary.sortState).toEqual({ columnKey: 'age', direction: 'desc' });
    expect(summary.rows.map(({ data }) => data.age)).toEqual([42, 30, 25]);
  });

  it('restores insertion order after clearing sort state', () => {
    const model = createModel();
    model.setSort('age', 'asc');
    expect(extractColumn(model, 'name')).toEqual(['Bob', 'Charlie', 'Alice']);

    model.clearSort();
    expect(model.getSortState()).toBeNull();
    expect(extractColumn(model, 'name')).toEqual(['Charlie', 'Alice', 'Bob']);
  });
});
