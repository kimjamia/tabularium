import { describe, it, expect } from 'vitest';
import { deepClone } from './deepClone.js';

describe('deepClone', () => {
  it('creates a deep copy of nested objects and arrays', () => {
    const original = {
      name: 'sheet',
      columns: [{ key: 'a' }, { key: 'b' }],
      meta: {
        frozen: true,
      },
    };

    const copy = deepClone(original);

    // mutate original to ensure clone is not affected
    original.columns[0].key = 'changed';
    original.meta.frozen = false;

    expect(copy).toEqual({
      name: 'sheet',
      columns: [{ key: 'a' }, { key: 'b' }],
      meta: {
        frozen: true,
      },
    });
  });
});
