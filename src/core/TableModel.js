import { DEFAULT_OPTIONS, CHANGE_SOURCES, TRUE_VALUES, FALSE_VALUES } from './constants.js';
import { parseClipboardData } from './clipboard.js';
import { prepareDropdown, matchDropdownOption, getDropdownDisplay, getDropdownValue, buildDropdownValue } from './dropdown.js';
import { deepClone } from '../utils/deepClone.js';

function valuesEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }

  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeNumber(value) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }

  const normalized = Number(String(value).replace(/,/g, ''));
  return Number.isNaN(normalized) ? null : normalized;
}

function normalizeCheckbox(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (TRUE_VALUES.has(value)) {
    return true;
  }

  if (FALSE_VALUES.has(value)) {
    return false;
  }

  return Boolean(value);
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || typeof value === 'undefined') {
    return [];
  }

  return [value];
}

function normalizeLinks(value) {
  return ensureArray(value)
    .map((entry) => {
      if (typeof entry === 'string') {
        return { label: entry, href: entry };
      }

      if (entry && typeof entry === 'object') {
        return {
          label: entry.label ?? entry.text ?? entry.href ?? entry.url ?? '',
          href: entry.href ?? entry.url ?? '#',
          target: entry.target ?? '_blank',
        };
      }

      return null;
    })
    .filter(Boolean);
}

function makeCellKey(rowIndex, columnKey) {
  return `${rowIndex}:${columnKey}`;
}

function serializeMergeKey(row, keyColumns) {
  return keyColumns
    .map((key) => {
      const value = row?.[key];
      if (value === null || typeof value === 'undefined') {
        return '__NULL__';
      }
      if (typeof value === 'string') {
        return `str:${value}`;
      }
      if (typeof value === 'number') {
        return `num:${value}`;
      }
      if (typeof value === 'boolean') {
        return `bool:${value}`;
      }
      return `json:${JSON.stringify(value)}`;
    })
    .join('||');
}

function defaultColumnFactory(column, index) {
  if (!column.key && !column.field && !column.id) {
    throw new Error(`Column at index ${index} must provide a key/field/id`);
  }

  const key = column.key ?? column.field ?? column.id;

  const withDefaults = {
    type: 'text',
    editable: true,
    filterable: true,
    sortable: true,
    allowPaste: true,
    ...column,
    key,
    index,
  };

  if (withDefaults.type === 'dropdown') {
    withDefaults._dropdown = prepareDropdown(withDefaults);
  }

  return withDefaults;
}

export class TableModel {
  constructor({ columns, data = [], options = {} }) {
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error('TableModel requires a non-empty columns array');
    }

    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.columns = columns.map((col, index) => defaultColumnFactory(col, index));
    this.columnIndex = new Map(this.columns.map((col, idx) => [col.key, idx]));

    this.rows = [];
    this.filters = new Map();
    this.errors = new Map();
    this.changeListeners = new Set();
    this.undoStack = [];
    this.redoStack = [];
    this.viewCache = [];
    this.sortState = null;
    this._suspendNotifications = false;

    this.setData(data, { silent: true });
  }

  getColumn(key) {
    if (!this.columnIndex.has(key)) {
      throw new Error(`Unknown column key: ${key}`);
    }
    return this.columns[this.columnIndex.get(key)];
  }

  getColumns() {
    return this.columns.slice();
  }

  getColumnIndex(key) {
    return this.columnIndex.get(key);
  }

  getColumnByIndex(index) {
    return this.columns[index];
  }

  setData(rows, { silent = false } = {}) {
    const normalized = Array.isArray(rows) ? rows.map((row) => this._normalizeRow(row)) : [];
    this.rows = normalized;
    this.undoStack = [];
    this.redoStack = [];
    this._cleanTrailingEmptyRows();
    this._refreshValidations();
    this._rebuildView();

    if (!silent) {
      this._emitChange({
        type: 'data:replace',
        source: CHANGE_SOURCES.PROGRAMMATIC,
        changes: [],
        affectedRowIndices: normalized.map((_, index) => index),
        rows: this.getRowsWithIndices(),
        errors: this.getErrorsGrouped(),
      });
    }
  }

  getRawData() {
    return deepClone(this.rows);
  }

  getRowsWithIndices({ includeEmptyRow = true } = {}) {
    const rows = this.viewCache.map(({ index, row, key }) => ({
      index,
      key,
      data: deepClone(row),
    }));

    if (includeEmptyRow && this.options.allowAddEmptyRow) {
      const placeholder = this._createEmptyRow();
      rows.push({
        index: this.rows.length,
        key: `__placeholder-${this.rows.length}`,
        data: placeholder,
        isPlaceholder: true,
      });
    }

    return rows;
  }

  getViewRows(options = {}) {
    return this.getRowsWithIndices(options);
  }

  getSortState() {
    return this.sortState ? { ...this.sortState } : null;
  }

  cycleSort(columnKey) {
    if (!this.columnIndex.has(columnKey)) {
      return this.getSortState();
    }

    const isActiveColumn = this.sortState && this.sortState.columnKey === columnKey;
    const currentDirection = isActiveColumn ? this.sortState.direction : null;
    let nextDirection = null;

    if (!currentDirection) {
      nextDirection = 'asc';
    } else if (currentDirection === 'asc') {
      nextDirection = 'desc';
    } else {
      nextDirection = null;
    }

    return this.setSort(columnKey, nextDirection);
  }

  setSort(columnKey, direction) {
    if (direction && !this.columnIndex.has(columnKey)) {
      return this.getSortState();
    }

    const nextState = direction ? { columnKey, direction } : null;
    const prevState = this.sortState ? { ...this.sortState } : null;

    if (
      (!prevState && !nextState)
      || (prevState && nextState
        && prevState.columnKey === nextState.columnKey
        && prevState.direction === nextState.direction)
    ) {
      return this.getSortState();
    }

    if (nextState) {
      const column = this.getColumn(nextState.columnKey);
      if (column.sortable === false) {
        return this.getSortState();
      }
      this.sortState = nextState;
    } else {
      this.sortState = null;
    }

    this._rebuildView();
    this._emitChange({
      type: 'sort',
      source: CHANGE_SOURCES.PROGRAMMATIC,
      changes: [],
      affectedRowIndices: this.viewCache.map(({ index }) => index),
      rows: this.getRowsWithIndices(),
      errors: this.getErrorsGrouped(),
      sortState: this.getSortState(),
    });

    return this.getSortState();
  }

  getRow(rowIndex) {
    return deepClone(this.rows[rowIndex]);
  }

  getRowCount() {
    return this.rows.length;
  }

  setFilter(columnKey, filter) {
    if (filter === null || typeof filter === 'undefined' || (typeof filter === 'object' && Object.keys(filter).length === 0)) {
      this.filters.delete(columnKey);
    } else {
      this.filters.set(columnKey, filter);
    }

    this._rebuildView();
    this._emitChange({
      type: 'filter',
      source: CHANGE_SOURCES.PROGRAMMATIC,
      changes: [],
      affectedRowIndices: this.viewCache.map(({ index }) => index),
      rows: this.getRowsWithIndices(),
      errors: this.getErrorsGrouped(),
    });
  }

  clearFilters() {
    this.filters.clear();
    this._rebuildView();
  }

  setCell(rowIndex, columnKey, value, { source = CHANGE_SOURCES.EDIT } = {}) {
    return this._applyChangeSet([
      {
        rowIndex,
        columnKey,
        value,
      },
    ], {
      source,
      type: 'cell',
    });
  }

  bulkUpdate(cellChanges, { source = CHANGE_SOURCES.EDIT, type = 'bulk' } = {}) {
    return this._applyChangeSet(cellChanges, { source, type });
  }

  paste(startRowIndex, startColumnKey, clipboardText, { source = CHANGE_SOURCES.PASTE } = {}) {
    const matrix = parseClipboardData(clipboardText);
    if (matrix.length === 0) {
      return null;
    }

    const startColumnIndex = this.columnIndex.get(startColumnKey);
    if (typeof startColumnIndex === 'undefined') {
      throw new Error(`Unknown column key ${startColumnKey}`);
    }

    const changes = [];

    matrix.forEach((rowValues, rowOffset) => {
      rowValues.forEach((cellValue, columnOffset) => {
        const targetColumn = this.columns[startColumnIndex + columnOffset];
        if (!targetColumn || targetColumn.allowPaste === false) {
          return;
        }

        changes.push({
          rowIndex: startRowIndex + rowOffset,
          columnKey: targetColumn.key,
          value: targetColumn.type === 'dropdown'
            ? this._resolveDropdownPasteValue(targetColumn, cellValue)
            : cellValue,
        });
      });
    });

    return this._applyChangeSet(changes, { source, type: 'paste' });
  }

  fill(selection, target, { source = CHANGE_SOURCES.FILL } = {}) {
    if (!selection || !target) {
      return null;
    }

    const { startRow, endRow, startCol, endCol } = selection;
    const { endRow: targetEndRow = endRow, endCol: targetEndCol = endCol } = target;

    const baseRows = [];
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
      const rowValues = [];
      for (let colIndex = startCol; colIndex <= endCol; colIndex += 1) {
        const column = this.columns[colIndex];
        const value = this._ensureRow(rowIndex)[column.key];
        rowValues.push(value);
      }
      baseRows.push(rowValues);
    }

    const changes = [];

    if (targetEndRow > endRow) {
      // vertical fill downwards
      for (let rowIndex = endRow + 1; rowIndex <= targetEndRow; rowIndex += 1) {
        const patternRow = baseRows[(rowIndex - startRow) % baseRows.length];
        patternRow.forEach((value, offset) => {
          const column = this.columns[startCol + offset];
          if (column && column.editable) {
            changes.push({
              rowIndex,
              columnKey: column.key,
              value,
            });
          }
        });
      }
    }

    if (targetEndCol > endCol) {
      // horizontal fill to the right
      for (let colIndex = endCol + 1; colIndex <= targetEndCol; colIndex += 1) {
        const column = this.columns[colIndex];
        if (!column || !column.editable) {
          continue;
        }

        for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
          const patternValue = baseRows[(rowIndex - startRow) % baseRows.length][(colIndex - startCol) % baseRows[0].length];
          changes.push({
            rowIndex,
            columnKey: column.key,
            value: patternValue,
          });
        }
      }
    }

    if (changes.length === 0) {
      return null;
    }

    return this._applyChangeSet(changes, { source, type: 'fill' });
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) {
      return null;
    }

    if (entry.snapshot) {
      this.redoStack.push(entry);
      return this._applySnapshotRows(entry.snapshot.before, {
        type: entry.type,
        source: CHANGE_SOURCES.UNDO,
        meta: entry.meta,
      });
    }

    const inverse = entry.changes.map(({ rowIndex, columnKey, from }) => ({
      rowIndex,
      columnKey,
      value: from,
    }));

    this.redoStack.push(entry);

    return this._applyChangeSet(inverse, {
      source: CHANGE_SOURCES.UNDO,
      type: entry.type,
      skipUndo: true,
    });
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) {
      return null;
    }

    if (entry.snapshot) {
      this.undoStack.push(entry);
      return this._applySnapshotRows(entry.snapshot.after, {
        type: entry.type,
        source: entry.source ?? CHANGE_SOURCES.EDIT,
        meta: entry.meta,
      });
    }

    const forward = entry.changes.map(({ rowIndex, columnKey, to }) => ({
      rowIndex,
      columnKey,
      value: to,
    }));

    return this._applyChangeSet(forward, {
      source: CHANGE_SOURCES.EDIT,
      type: entry.type,
      skipUndo: false,
      restoreFromRedo: entry,
    });
  }

  registerChangeListener(listener) {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  suspendNotifications() {
    this._suspendNotifications = true;
  }

  resumeNotifications() {
    this._suspendNotifications = false;
  }

  getErrorsGrouped() {
    const grouped = {};
    this.errors.forEach((messages, cellKey) => {
      grouped[cellKey] = messages.slice();
    });
    return grouped;
  }

  _resolveDropdownPasteValue(column, rawValue) {
    if (!column._dropdown) {
      return rawValue;
    }

    const option = matchDropdownOption(column, rawValue, column._dropdown.pasteMode);
    if (option) {
      return getDropdownValue(column, option);
    }

    return rawValue;
  }

  mergeRows(sourceRows, { updateColumns = [], source = CHANGE_SOURCES.MERGE } = {}) {
    if (!Array.isArray(sourceRows)) {
      throw new Error('mergeRows expects an array of source rows');
    }

    const validUpdateColumns = updateColumns
      .filter((key) => this.columnIndex.has(key));

    if (validUpdateColumns.length === 0) {
      throw new Error('mergeRows requires at least one valid column to update');
    }

    const updateColumnSet = new Set(validUpdateColumns);
    const keyColumns = this.columns
      .map((column) => column.key)
      .filter((key) => !updateColumnSet.has(key));

    if (keyColumns.length === 0) {
      throw new Error('mergeRows requires at least one merge key column. Deselect at least one column.');
    }

    const normalizedSources = sourceRows.map((row) => this._normalizeRow(row));
    if (normalizedSources.length === 0 && this.rows.length === 0) {
      return null;
    }

    const existingKeyIndex = new Map();
    this.rows.forEach((row, index) => {
      const key = serializeMergeKey(row, keyColumns);
      if (!existingKeyIndex.has(key)) {
        existingKeyIndex.set(key, []);
      }
      existingKeyIndex.get(key).push(index);
    });

    const usedRowIndices = new Set();
    const nextRows = [];
    const mergeSummary = {
      added: [],
      removed: [],
      updated: [],
      updateColumns: Array.from(updateColumnSet),
      keyColumns: keyColumns.slice(),
    };

    normalizedSources.forEach((sourceRow, position) => {
      const key = serializeMergeKey(sourceRow, keyColumns);
      const candidateIndices = existingKeyIndex.get(key) ?? [];
      const availableIndex = candidateIndices.find((idx) => !usedRowIndices.has(idx));

      if (typeof availableIndex === 'number') {
        usedRowIndices.add(availableIndex);
        const existingRow = deepClone(this.rows[availableIndex]);
        let changed = false;

        updateColumnSet.forEach((columnKey) => {
          const nextValue = sourceRow[columnKey];
          if (!valuesEqual(existingRow[columnKey], nextValue)) {
            existingRow[columnKey] = nextValue;
            changed = true;
          }
        });

        nextRows.push(existingRow);
        if (changed) {
          mergeSummary.updated.push({ key, rowIndex: position });
        }
      } else {
        const newRow = this._createEmptyRow();
        this.columns.forEach((column) => {
          const value = sourceRow[column.key];
          if (typeof value !== 'undefined') {
            newRow[column.key] = value;
          }
        });
        nextRows.push(newRow);
        mergeSummary.added.push({ key, rowIndex: position });
      }
    });

    this.rows.forEach((row, index) => {
      if (!usedRowIndices.has(index)) {
        const key = serializeMergeKey(row, keyColumns);
        mergeSummary.removed.push({ key, rowIndex: index });
      }
    });

    if (this._rowsAreIdentical(this.rows, nextRows)) {
      return null;
    }

    return this._replaceRowsWithSnapshot(nextRows, {
      type: 'merge',
      source,
      meta: { merge: mergeSummary },
    });
  }

  _ensureRow(rowIndex) {
    while (rowIndex >= this.rows.length) {
      this.rows.push(this._createEmptyRow());
    }
    return this.rows[rowIndex];
  }

  _normalizeRow(row) {
    const source = row ?? {};
    const target = {};

    this.columns.forEach((column) => {
      const value = typeof column.accessor === 'function'
        ? column.accessor(source)
        : source[column.key];

      target[column.key] = this._normalizeValue(column, value);
    });

    return target;
  }

  _normalizeValue(column, value) {
    switch (column.type) {
      case 'number':
        return normalizeNumber(value);
      case 'checkbox':
        return normalizeCheckbox(value);
      case 'dropdown':
        return buildDropdownValue(column, value);
      case 'links':
        return normalizeLinks(value);
      case 'button':
        return value;
      default:
        return value;
    }
  }

  _applyChangeSet(rawChanges, {
    source,
    type,
    skipUndo = false,
    restoreFromRedo = null,
  }) {
    if (!Array.isArray(rawChanges) || rawChanges.length === 0) {
      return null;
    }

    const normalized = [];
    const touchedRows = new Set();

    rawChanges.forEach(({ rowIndex, columnKey, value }) => {
      if (typeof rowIndex !== 'number' || rowIndex < 0) {
        return;
      }

      if (!this.columnIndex.has(columnKey)) {
        return;
      }

      const column = this.getColumn(columnKey);
      if (column.editable === false) {
        return;
      }

      const row = this._ensureRow(rowIndex);
      const normalizedValue = this._normalizeValue(column, value);
      const oldValue = row[columnKey];

      if (valuesEqual(oldValue, normalizedValue)) {
        return;
      }

      row[columnKey] = normalizedValue;
      normalized.push({ rowIndex, columnKey, oldValue, newValue: normalizedValue });
      touchedRows.add(rowIndex);
    });

    if (normalized.length === 0) {
      return null;
    }

    if (!skipUndo) {
      const undoEntry = {
        type,
        source,
        changes: normalized.map(({ rowIndex, columnKey, oldValue, newValue }) => ({
          rowIndex,
          columnKey,
          from: oldValue,
          to: newValue,
        })),
      };

      this.undoStack.push(undoEntry);
      if (this.undoStack.length > this.options.undoLimit) {
        this.undoStack.shift();
      }
      this.redoStack = [];
    } else if (restoreFromRedo) {
      this.undoStack.push(restoreFromRedo);
    }

    this._cleanTrailingEmptyRows();
    this._refreshValidations(Array.from(touchedRows));
    this._rebuildView();

    const summary = {
      type,
      source,
      changes: normalized.map(({ rowIndex, columnKey, oldValue, newValue }) => ({
        rowIndex,
        columnKey,
        oldValue,
        newValue,
      })),
      affectedRowIndices: Array.from(touchedRows),
      rows: Array.from(touchedRows).map((index) => ({
        index,
        data: deepClone(this.rows[index]),
      })),
      errors: this.getErrorsGrouped(),
    };

    this._emitChange(summary);
    return summary;
  }

  _cleanTrailingEmptyRows() {
    let lastNonEmpty = this.rows.length - 1;
    while (lastNonEmpty >= 0 && this._isRowEmpty(this.rows[lastNonEmpty])) {
      lastNonEmpty -= 1;
    }

    if (lastNonEmpty < this.rows.length - 1) {
      this.rows.splice(lastNonEmpty + 1);
    }
  }

  _isRowEmpty(row) {
    if (!row) {
      return true;
    }

    return this.columns.every((column) => {
      const value = row[column.key];
      if (column.type === 'checkbox') {
        return value === false || value === null || typeof value === 'undefined';
      }

      if (column.type === 'links') {
        return !value || value.length === 0;
      }

      return value === null || typeof value === 'undefined' || value === '';
    });
  }

  _createEmptyRow() {
    const row = {};
    this.columns.forEach((column) => {
      const defaultValue = typeof column.defaultValue === 'function'
        ? column.defaultValue()
        : column.defaultValue ?? null;
      row[column.key] = this._normalizeValue(column, defaultValue);
    });
    return row;
  }

  _rebuildView() {
    const filtered = [];

    this.rows.forEach((row, index) => {
      if (this._passesFilters(row, index)) {
        filtered.push({ row, index });
      }
    });

    const sortColumn = this._getActiveSortColumn();
    if (sortColumn && this.sortState) {
      const directionFactor = this.sortState.direction === 'desc' ? -1 : 1;
      filtered.sort((a, b) => directionFactor * this._compareRowsForSort(sortColumn, a, b));
    }

    this.viewCache = filtered.map(({ row, index }) => ({
      row,
      index,
      key: this._computeRowKey(row, index),
    }));
  }

  _getActiveSortColumn() {
    if (!this.sortState) {
      return null;
    }

    const columnIndex = this.columnIndex.get(this.sortState.columnKey);
    if (typeof columnIndex === 'undefined') {
      this.sortState = null;
      return null;
    }

    const column = this.columns[columnIndex];
    if (!column || column.sortable === false) {
      this.sortState = null;
      return null;
    }

    return column;
  }

  _compareRowsForSort(column, a, b) {
    const valueA = this._normalizeSortValue(column, a.row[column.key]);
    const valueB = this._normalizeSortValue(column, b.row[column.key]);

    if (valueA === null && valueB === null) {
      return a.index - b.index;
    }
    if (valueA === null) {
      return 1;
    }
    if (valueB === null) {
      return -1;
    }

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      if (valueA === valueB) {
        return a.index - b.index;
      }
      return valueA < valueB ? -1 : 1;
    }

    const comparison = String(valueA).localeCompare(String(valueB), undefined, { sensitivity: 'base' });
    if (comparison === 0) {
      return a.index - b.index;
    }
    return comparison;
  }

  _normalizeSortValue(column, value) {
    if (value === null || typeof value === 'undefined') {
      return null;
    }

    if (column.type === 'number') {
      const normalized = normalizeNumber(value);
      return typeof normalized === 'number' ? normalized : null;
    }

    if (column.type === 'checkbox') {
      return value ? 1 : 0;
    }

    if (column.type === 'dropdown') {
      const display = getDropdownDisplay(column, value);
      return typeof display === 'string'
        ? display.toLowerCase()
        : String(display ?? '').toLowerCase();
    }

    if (column.type === 'links') {
      return (value ?? [])
        .map((entry) => entry?.label ?? entry?.href ?? '')
        .join('||')
        .toLowerCase();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === 'number') {
      return value;
    }

    return String(value).toLowerCase();
  }

  _passesFilters(row, rowIndex) {
    if (this.filters.size === 0) {
      return true;
    }

    for (const [columnKey, filter] of this.filters.entries()) {
      const column = this.getColumn(columnKey);
      const value = row[column.key];

      if (filter == null) {
        continue;
      }

      if (typeof column.filterPredicate === 'function') {
        if (!column.filterPredicate({ value, row, rowIndex, filter, column, data: this.rows })) {
          return false;
        }
        continue;
      }

      if (column.type === 'number') {
        const { min, max } = filter;
        if (typeof min === 'number' && (value === null || value < min)) {
          return false;
        }
        if (typeof max === 'number' && (value === null || value > max)) {
          return false;
        }
      } else {
        const query = typeof filter === 'string' ? filter : filter.query;
        if (query && query.trim()) {
          const lower = query.trim().toLowerCase();
          const displayValue = column.type === 'dropdown'
            ? String(getDropdownDisplay(column, value) ?? '').toLowerCase()
            : String(value ?? '').toLowerCase();

          if (!displayValue.includes(lower)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  _refreshValidations(rowIndices) {
    const indices = Array.isArray(rowIndices) && rowIndices.length > 0
      ? rowIndices
      : Array.from({ length: this.rows.length }, (_, index) => index);

    indices.forEach((rowIndex) => {
      this.columns.forEach((column) => {
        const cellKey = makeCellKey(rowIndex, column.key);
        this.errors.delete(cellKey);
      });
    });

    const uniqueIndexes = new Map();
    this.columns.forEach((column) => {
      if (!column.unique) {
        return;
      }

      const seen = new Map();
      this.rows.forEach((row, rowIndex) => {
        const value = row[column.key];
        const key = value === null || typeof value === 'undefined' ? '__EMPTY__' : JSON.stringify(value);
        if (!seen.has(key)) {
          seen.set(key, []);
        }
        seen.get(key).push(rowIndex);
      });

      uniqueIndexes.set(column.key, seen);
    });

    indices.forEach((rowIndex) => {
      const row = this.rows[rowIndex];
      if (!row) {
        return;
      }

      this.columns.forEach((column) => {
        const cellKey = makeCellKey(rowIndex, column.key);
        const errors = [];
        const value = row[column.key];

        if (column.type === 'number') {
          if (value !== null && typeof value !== 'number') {
            errors.push('Value must be a number');
          }
        }

        if (column.unique) {
          const indexMap = uniqueIndexes.get(column.key);
          const valueKey = value === null || typeof value === 'undefined' ? '__EMPTY__' : JSON.stringify(value);
          if (indexMap && indexMap.get(valueKey) && indexMap.get(valueKey).length > 1) {
            errors.push('Value must be unique in this column');
          }
        }

        if (typeof column.validator === 'function') {
          const result = column.validator({
            value,
            row,
            rowIndex,
            column,
            data: this.rows,
            getValue: (key) => row[key],
          });

          if (typeof result === 'string' && result.trim()) {
            errors.push(result);
          } else if (Array.isArray(result)) {
            result.filter(Boolean).forEach((message) => errors.push(message));
          }
        }

        if (errors.length > 0) {
          this.errors.set(cellKey, errors);
        }
      });
    });
  }

  _emitChange(summary) {
    if (this._suspendNotifications) {
      return;
    }

    this.changeListeners.forEach((listener) => listener(summary));
  }

  _computeRowKey(row, fallbackIndex) {
    const fields = Array.isArray(this.options.keyFields) ? this.options.keyFields : [];
    if (!row || fields.length === 0) {
      return fallbackIndex;
    }

    return fields
      .map((field) => row[field])
      .map((value) => (value === null || typeof value === 'undefined' ? '' : String(value)))
      .join('||');
  }

  _rowsAreIdentical(currentRows, nextRows) {
    if (currentRows.length !== nextRows.length) {
      return false;
    }

    for (let index = 0; index < currentRows.length; index += 1) {
      const current = currentRows[index];
      const next = nextRows[index];
      for (let columnIndex = 0; columnIndex < this.columns.length; columnIndex += 1) {
        const columnKey = this.columns[columnIndex].key;
        if (!valuesEqual(current[columnKey], next[columnKey])) {
          return false;
        }
      }
    }

    return true;
  }

  _replaceRowsWithSnapshot(nextRows, { type, source, meta } = {}) {
    const previousRows = deepClone(this.rows);
    this.rows = nextRows.map((row) => deepClone(row));
    this._cleanTrailingEmptyRows();
    this._refreshValidations();
    this._rebuildView();

    const summary = {
      type,
      source,
      changes: [],
      affectedRowIndices: this.rows.map((_, index) => index),
      rows: this.getRowsWithIndices(),
      errors: this.getErrorsGrouped(),
      meta,
    };

    this.undoStack.push({
      type,
      source,
      snapshot: {
        before: previousRows,
        after: deepClone(this.rows),
      },
      meta,
    });

    if (this.undoStack.length > this.options.undoLimit) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this._emitChange(summary);
    return summary;
  }

  _applySnapshotRows(snapshotRows, { type, source, meta } = {}) {
    this.rows = deepClone(snapshotRows);
    this._cleanTrailingEmptyRows();
    this._refreshValidations();
    this._rebuildView();

    const summary = {
      type,
      source,
      changes: [],
      affectedRowIndices: this.rows.map((_, index) => index),
      rows: this.getRowsWithIndices(),
      errors: this.getErrorsGrouped(),
      meta,
    };

    this._emitChange(summary);
    return summary;
  }
}
