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

function defaultColumnFactory(column, index) {
  if (!column.key && !column.field && !column.id) {
    throw new Error(`Column at index ${index} must provide a key/field/id`);
  }

  const key = column.key ?? column.field ?? column.id;

  const withDefaults = {
    type: 'text',
    editable: true,
    filterable: true,
    sortable: false,
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

    this.viewCache = filtered.map(({ row, index }) => ({
      row,
      index,
      key: this._computeRowKey(row, index),
    }));
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
}
