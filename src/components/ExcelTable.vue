<template>
  <div
    ref="containerRef"
    class="excel-table"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <div
      ref="viewportRef"
      class="excel-table__viewport"
      @scroll="onViewportScroll"
    >
        <table class="excel-table__grid">
          <thead>
            <tr>
              <th
                v-for="(column, columnIndex) in internalColumns"
                :key="column.key"
                class="excel-table__header-cell"
                :class="{ 'is-frozen': isColumnFrozen(columnIndex) }"
                :style="getColumnStyle(columnIndex)"
                :aria-sort="getColumnAriaSort(column.key)"
              >
                <div
                  class="excel-table__header-content"
                  :class="{
                    'is-sortable': column.sortable !== false,
                    'is-sorted': Boolean(getColumnSortDirection(column.key)),
                  }"
                  :tabindex="column.sortable === false ? undefined : 0"
                  :role="column.sortable === false ? undefined : 'button'"
                  @click="() => onHeaderClick(column)"
                  @keydown.enter.prevent="(event) => onHeaderKeyDown(event, column)"
                  @keydown.space.prevent="(event) => onHeaderKeyDown(event, column)"
                >
                  <span>{{ column.label ?? column.title ?? column.key }}</span>
                  <span
                    v-if="getColumnSortDirection(column.key)"
                    class="excel-table__sort-indicator"
                    :class="{
                      'is-asc': getColumnSortDirection(column.key) === 'asc',
                      'is-desc': getColumnSortDirection(column.key) === 'desc',
                    }"
                    aria-hidden="true"
                  />
                </div>
                <div
                  v-if="column.filterable"
                  class="excel-table__filter"
                >
                <template v-if="column.type === 'number'">
                  <input
                    class="excel-table__filter-input"
                    type="number"
                    :placeholder="column.filterPlaceholderMin ?? 'Min'"
                    :value="getNumberFilterValue(column.key, 'min')"
                    @input="(event) => onNumberFilterChange(column.key, 'min', event.target.value)"
                  >
                  <input
                    class="excel-table__filter-input"
                    type="number"
                    :placeholder="column.filterPlaceholderMax ?? 'Max'"
                    :value="getNumberFilterValue(column.key, 'max')"
                    @input="(event) => onNumberFilterChange(column.key, 'max', event.target.value)"
                  >
                </template>
                <template v-else>
                  <input
                    class="excel-table__filter-input"
                    type="text"
                    :placeholder="column.filterPlaceholder ?? 'Filter'"
                    :value="columnFilters[column.key] ?? ''"
                    @input="(event) => onTextFilterChange(column.key, event.target.value)"
                  >
                </template>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
            <tr
              v-for="(entry, viewRowIndex) in viewRows"
              :key="entry.key ?? entry.index"
              :data-row-index="entry.index"
              :data-row-position="viewRowIndex"
              :class="{
                'is-placeholder': entry.isPlaceholder,
              }"
            >
            <td
              v-for="(column, columnIndex) in internalColumns"
              :key="column.key"
              class="excel-table__cell"
              :class="getCellClass(entry, column, columnIndex)"
              :style="getCellStyle(columnIndex)"
              @mousedown="(event) => onCellMouseDown(event, entry, column, viewRowIndex, columnIndex)"
              @mouseenter="(event) => onCellMouseEnter(event, entry, column, viewRowIndex, columnIndex)"
              @paste.prevent="(event) => onCellPaste(event, entry, column)"
            >
              <div class="excel-table__cell-content">
                <template v-if="column.type === 'checkbox'">
                  <input
                    type="checkbox"
                    :checked="Boolean(entry.data[column.key])"
                    @change="(event) => onCheckboxChange(entry, column, event.target.checked)"
                  >
                </template>

                <template v-else-if="column.type === 'dropdown'">
                  <select
                    class="excel-table__input"
                    :value="entry.data[column.key] ?? ''"
                    @change="(event) => onDropdownChange(entry, column, event.target.value)"
                  >
                    <option
                      v-if="column.dropdown?.allowEmpty"
                      value=""
                    >
                      {{ column.dropdown.emptyLabel ?? 'Select…' }}
                    </option>
                    <option
                      v-for="option in getDropdownOptions(column)"
                      :key="getDropdownOptionKey(column, option)"
                      :value="getDropdownOptionValue(column, option)"
                    >
                      {{ getDropdownOptionLabel(column, option) }}
                    </option>
                  </select>
                </template>

                  <template v-else-if="column.type === 'number'">
                    <input
                      class="excel-table__input"
                      type="number"
                      :value="getCellInputValue(entry, column)"
                      @input="(event) => onCellInput(entry, column, event.target.value)"
                      @blur="() => commitCellEdit(entry, column)"
                      @keydown.enter.prevent="() => commitCellEdit(entry, column)"
                      @keydown.esc.prevent="() => cancelCellEdit(entry, column)"
                    >
                  </template>

                <template v-else-if="column.type === 'button'">
                  <button
                    type="button"
                    class="excel-table__button"
                    @click.stop="() => onButtonClick(entry, column)"
                  >
                    {{ getButtonLabel(entry, column) }}
                  </button>
                </template>

                <template v-else-if="column.type === 'links'">
                  <div class="excel-table__links">
                    <a
                      v-for="link in entry.data[column.key] ?? []"
                      :key="link.href + link.label"
                      class="excel-table__link"
                      :href="link.href"
                      :target="link.target ?? '_blank'"
                      rel="noopener"
                    >
                      {{ link.label ?? link.href }}
                    </a>
                  </div>
                </template>

                  <template v-else>
                    <input
                      class="excel-table__input"
                      type="text"
                      :value="getCellInputValue(entry, column)"
                      @input="(event) => onCellInput(entry, column, event.target.value)"
                      @blur="() => commitCellEdit(entry, column)"
                      @keydown.enter.prevent="() => commitCellEdit(entry, column)"
                      @keydown.esc.prevent="() => cancelCellEdit(entry, column)"
                    >
                  </template>

                <span
                  v-if="selection && isBottomRightCell(entry.index, columnIndex)"
                  class="excel-table__fill-handle"
                  @mousedown.stop="startFillDrag"
                />
              </div>

              <div
                v-if="getCellErrors(entry.index, column.key).length"
                class="excel-table__cell-errors"
              >
                <span
                  v-for="(error, errorIndex) in getCellErrors(entry.index, column.key)"
                  :key="`${column.key}-error-${errorIndex}`"
                >
                  {{ error }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div
        v-if="fillPreview"
        class="excel-table__fill-preview"
        :style="getSelectionBoxStyle(fillPreview)"
      />
      <div
        v-if="selection"
        class="excel-table__selection"
        :style="getSelectionBoxStyle(selection)"
      />
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
} from 'vue';
import { TableModel } from '../core/TableModel.js';
import { CHANGE_SOURCES } from '../core/constants.js';
import '../styles/excel-table.css';

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
  options: {
    type: Object,
    default: () => ({}),
  },
  filters: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  'update:modelValue',
  'change',
  'update:filters',
  'cell-edit',
  'cell-click',
  'button-click',
]);

const containerRef = ref(null);
const columnFilters = reactive({ ...props.filters });
const editingValues = reactive({});

const model = ref(new TableModel({
  columns: props.columns,
  data: props.modelValue,
  options: props.options,
}));

const viewRows = ref(model.value.getViewRows());
const errors = ref(model.value.getErrorsGrouped());
const sortState = ref(model.value.getSortState());

const selection = ref(null);
const anchorCell = ref(null);
const fillPreview = ref(null);
const fillDragActive = ref(false);
const isMouseSelecting = ref(false);
const viewportRef = ref(null);
const scrollTick = ref(0);

const internalColumns = computed(() => model.value.getColumns());

const frozenColumns = computed(() => props.options?.frozenColumns ?? 0);
const freezeHeader = computed(() => props.options?.freezeHeader !== false);

const columnOffsets = computed(() => {
  const offsets = [];
  let offset = 0;
  internalColumns.value.forEach((column, index) => {
    if (index < frozenColumns.value) {
      const width = column.width ?? column.minWidth ?? 150;
      offsets[index] = offset;
      offset += width;
    } else {
      offsets[index] = null;
    }
  });
  return offsets;
});

let unsubscribe = model.value.registerChangeListener((summary) => {
  errors.value = summary.errors;
  viewRows.value = model.value.getViewRows();
  sortState.value = model.value.getSortState();
  emit('change', summary);
  if (summary.type !== 'filter' && summary.type !== 'sort') {
    emit('update:modelValue', model.value.getRawData());
  }
});

function resetModel(newColumns, newOptions) {
  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }

  clearEditingState();

  model.value = new TableModel({
    columns: newColumns ?? props.columns,
    data: props.modelValue ?? [],
    options: newOptions ?? props.options ?? {},
  });

  viewRows.value = model.value.getViewRows();
  errors.value = model.value.getErrorsGrouped();
  sortState.value = model.value.getSortState();
  unsubscribe = model.value.registerChangeListener((summary) => {
    errors.value = summary.errors;
    viewRows.value = model.value.getViewRows();
    sortState.value = model.value.getSortState();
    emit('change', summary);
    if (summary.type !== 'filter' && summary.type !== 'sort') {
      emit('update:modelValue', model.value.getRawData());
    }
  });

  applyFiltersFromProps();
}

function isSameData(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (error) {
    return false;
  }
}

watch(
  () => props.modelValue,
  (next) => {
    if (!isSameData(next, model.value.getRawData())) {
      model.value.setData(next ?? [], { silent: true });
      viewRows.value = model.value.getViewRows();
      errors.value = model.value.getErrorsGrouped();
      sortState.value = model.value.getSortState();
      clearEditingState();
    }
  },
  { deep: true }
);

watch(
  () => props.columns,
  (nextColumns) => {
    resetModel(nextColumns, props.options);
  },
  { deep: true }
);

watch(
  () => props.options,
  (nextOptions) => {
    resetModel(props.columns, nextOptions);
  },
  { deep: true }
);

watch(
  () => props.filters,
  () => {
    Object.keys(columnFilters).forEach((key) => {
      delete columnFilters[key];
    });
    Object.assign(columnFilters, props.filters ?? {});
    applyFiltersFromProps();
  },
  { deep: true }
);

onMounted(() => {
  applyFiltersFromProps();
  window.addEventListener('mouseup', onGlobalMouseUp);
});

onBeforeUnmount(() => {
  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }

  window.removeEventListener('mouseup', onGlobalMouseUp);
});

function applyFiltersFromProps() {
  if (!props.filters) {
    model.value.clearFilters();
    return;
  }

  Object.entries(props.filters).forEach(([key, filter]) => {
    if (filter && typeof filter === 'object' && ('min' in filter || 'max' in filter)) {
      model.value.setFilter(key, {
        min: filter.min !== '' ? Number(filter.min) : undefined,
        max: filter.max !== '' ? Number(filter.max) : undefined,
      });
    } else {
      model.value.setFilter(key, filter);
    }
  });
  viewRows.value = model.value.getViewRows();
  sortState.value = model.value.getSortState();
}

function isColumnFrozen(columnIndex) {
  return freezeHeader.value && columnIndex < frozenColumns.value;
}

function getColumnStyle(columnIndex) {
  const column = internalColumns.value[columnIndex];
  const styles = {};
  if (column.width) {
    styles.width = `${column.width}px`;
    styles.minWidth = `${column.width}px`;
  } else if (column.minWidth) {
    styles.minWidth = `${column.minWidth}px`;
  }

  if (freezeHeader.value && isColumnFrozen(columnIndex)) {
    const offset = columnOffsets.value[columnIndex] ?? 0;
    styles.left = `${offset}px`;
    styles.position = 'sticky';
    styles.zIndex = 3;
  }

  if (freezeHeader.value) {
    styles.top = '0';
    styles.position = 'sticky';
    styles.zIndex = (styles.zIndex ?? 1) + 1;
  }

  return styles;
}

function getCellStyle(columnIndex) {
  const styles = {};
  const column = internalColumns.value[columnIndex];

  if (column.width) {
    styles.width = `${column.width}px`;
    styles.minWidth = `${column.width}px`;
  } else if (column.minWidth) {
    styles.minWidth = `${column.minWidth}px`;
  }

  if (isColumnFrozen(columnIndex)) {
    const offset = columnOffsets.value[columnIndex] ?? 0;
    styles.left = `${offset}px`;
    styles.position = 'sticky';
    styles.zIndex = 2;
    styles.background = 'var(--excel-table-cell-bg, #fff)';
  }

  return styles;
}

function onHeaderClick(column) {
  if (!column || column.sortable === false) {
    return;
  }

  const nextState = model.value.cycleSort(column.key);
  sortState.value = nextState ? { ...nextState } : null;
}

function onHeaderKeyDown(event, column) {
  if (event?.key === 'Enter' || event?.key === ' ') {
    event.preventDefault();
    onHeaderClick(column);
  }
}

function getColumnSortDirection(columnKey) {
  if (!sortState.value || sortState.value.columnKey !== columnKey) {
    return null;
  }
  return sortState.value.direction;
}

function getColumnAriaSort(columnKey) {
  const direction = getColumnSortDirection(columnKey);
  if (direction === 'asc') {
    return 'ascending';
  }
  if (direction === 'desc') {
    return 'descending';
  }
  return 'none';
}

function onTextFilterChange(columnKey, value) {
  columnFilters[columnKey] = value;
  model.value.setFilter(columnKey, value);
  emit('update:filters', { ...columnFilters });
  viewRows.value = model.value.getViewRows();
}

function onNumberFilterChange(columnKey, bound, value) {
  if (!columnFilters[columnKey]) {
    columnFilters[columnKey] = { min: '', max: '' };
  }

  columnFilters[columnKey][bound] = value;
  model.value.setFilter(columnKey, {
    min: columnFilters[columnKey].min !== '' ? Number(columnFilters[columnKey].min) : undefined,
    max: columnFilters[columnKey].max !== '' ? Number(columnFilters[columnKey].max) : undefined,
  });

  emit('update:filters', { ...columnFilters });
  viewRows.value = model.value.getViewRows();
}

function getNumberFilterValue(columnKey, bound) {
  const entry = columnFilters[columnKey];
  return entry && typeof entry === 'object' ? entry[bound] ?? '' : '';
}

function onCellInput(entry, column, rawValue) {
  const key = getEditingKey(entry.index, column.key);
  editingValues[key] = rawValue;
}

function onCheckboxChange(entry, column, checked) {
  model.value.setCell(entry.index, column.key, checked, { source: CHANGE_SOURCES.EDIT });
  emit('cell-edit', {
    rowIndex: entry.index,
    column,
    value: checked,
  });
}

function onDropdownChange(entry, column, value) {
  model.value.setCell(entry.index, column.key, value, { source: CHANGE_SOURCES.EDIT });
  emit('cell-edit', {
    rowIndex: entry.index,
    column,
    value,
  });
}

function onButtonClick(entry, column) {
  const payload = {
    rowIndex: entry.index,
    row: entry.data,
    column,
    model: model.value,
  };
  if (column.button?.onClick) {
    column.button.onClick(payload);
  }
  emit('button-click', payload);
}

function getButtonLabel(entry, column) {
  if (typeof column.button?.label === 'function') {
    return column.button.label(entry.data, entry.index, column);
  }
  if (typeof entry.data[column.key] === 'string') {
    return entry.data[column.key];
  }
  return column.button?.label ?? 'Action';
}

function getDropdownOptions(column) {
  return column.dropdown?.options ?? [];
}

function getDropdownOptionValue(column, option) {
  const valueField = column.dropdown?.valueField ?? 'value';
  return option[valueField] ?? option;
}

function getDropdownOptionLabel(column, option) {
  const displayField = column.dropdown?.displayField ?? 'label';
  return option[displayField] ?? option;
}

function getDropdownOptionKey(column, option) {
  const keyFields = column.dropdown?.keyFields ?? [column.dropdown?.valueField ?? 'value'];
  return keyFields.map((field) => option[field]).join('||');
}

function getCellErrors(rowIndex, columnKey) {
  const key = `${rowIndex}:${columnKey}`;
  return errors.value?.[key] ?? [];
}

function getCellClass(entry, column, columnIndex) {
  const isSelected = isCellSelected(entry.index, columnIndex);
  const hasErrors = getCellErrors(entry.index, column.key).length > 0;
  return {
    'is-selected': isSelected,
    'has-error': hasErrors,
    'is-placeholder-cell': entry.isPlaceholder,
  };
}

function onCellMouseDown(event, entry, column, viewRowIndex, columnIndex) {
  if (event.button !== 0) {
    return;
  }

  isMouseSelecting.value = true;
  const cell = { rowIndex: entry.index, columnIndex };
  anchorCell.value = cell;
  selection.value = normalizeSelection(cell, cell);

  emit('cell-click', {
    rowIndex: entry.index,
    column,
    event,
  });
}

function onCellMouseEnter(event, entry, column, viewRowIndex, columnIndex) {
  if (fillDragActive.value) {
    updateFillPreview(entry.index, columnIndex);
  } else if (isMouseSelecting.value && event.buttons === 1 && anchorCell.value) {
    selection.value = normalizeSelection(anchorCell.value, { rowIndex: entry.index, columnIndex });
  }
}

function onGlobalMouseUp() {
  if (fillDragActive.value && selection.value && fillPreview.value) {
    applyFill();
  }
  fillDragActive.value = false;
  isMouseSelecting.value = false;
  fillPreview.value = null;
}

function isCellSelected(rowIndex, columnIndex) {
  if (!selection.value) {
    return false;
  }

  return rowIndex >= selection.value.startRow
    && rowIndex <= selection.value.endRow
    && columnIndex >= selection.value.startCol
    && columnIndex <= selection.value.endCol;
}

function normalizeSelection(anchor, target) {
  return {
    startRow: Math.min(anchor.rowIndex, target.rowIndex),
    endRow: Math.max(anchor.rowIndex, target.rowIndex),
    startCol: Math.min(anchor.columnIndex, target.columnIndex),
    endCol: Math.max(anchor.columnIndex, target.columnIndex),
  };
}

function isBottomRightCell(rowIndex, columnIndex) {
  if (!selection.value) {
    return false;
  }

  return selection.value.endRow === rowIndex && selection.value.endCol === columnIndex;
}

function startFillDrag() {
  if (!selection.value) {
    return;
  }
  fillDragActive.value = true;
  fillPreview.value = { ...selection.value };
}

function updateFillPreview(rowIndex, columnIndex) {
  if (!selection.value) {
    return;
  }

  const preview = { ...selection.value };

  if (rowIndex > selection.value.endRow) {
    preview.endRow = rowIndex;
  }

  if (columnIndex > selection.value.endCol) {
    preview.endCol = columnIndex;
  }

  fillPreview.value = preview;
}

function applyFill() {
  const selectionRange = selection.value;
  const targetRange = fillPreview.value;
  if (!selectionRange || !targetRange) {
    return;
  }

  model.value.fill(selectionRange, targetRange, { source: CHANGE_SOURCES.FILL });
  selection.value = normalizeSelection(
    { rowIndex: selectionRange.startRow, columnIndex: selectionRange.startCol },
    { rowIndex: targetRange.endRow, columnIndex: targetRange.endCol },
  );
  fillPreview.value = null;
}

function getSelectionBoxStyle(range) {
  // establish reactivity with scroll position
  scrollTick.value;
  if (!range) {
    return {};
  }

  const topCell = getCellElement(range.startRow, range.startCol);
  const bottomCell = getCellElement(range.endRow, range.endCol);

  if (!topCell || !bottomCell) {
    return {};
  }

  const topRect = topCell.getBoundingClientRect();
  const bottomRect = bottomCell.getBoundingClientRect();
  const viewportEl = viewportRef.value;
  if (!viewportEl) {
    return {};
  }

  const containerRect = viewportEl.getBoundingClientRect();

  if (!containerRect) {
    return {};
  }

  return {
    top: `${topRect.top - containerRect.top + viewportEl.scrollTop}px`,
    left: `${topRect.left - containerRect.left + viewportEl.scrollLeft}px`,
    width: `${bottomRect.right - topRect.left}px`,
    height: `${bottomRect.bottom - topRect.top}px`,
  };
}

function getCellElement(rowIndex, columnIndex) {
  const row = viewportRef.value?.querySelector(`tbody tr[data-row-index="${rowIndex}"]`);
  if (!row) {
    return null;
  }

  return row.querySelectorAll('td')[columnIndex] ?? null;
}

function onCellPaste(event, entry, column) {
  const text = event.clipboardData.getData('text/plain');
  if (!text) {
    return;
  }

  event.preventDefault();
  const summary = model.value.paste(entry.index, column.key, text, { source: CHANGE_SOURCES.PASTE });

  if (summary && summary.changes.length) {
    const rowIndices = summary.changes.map((change) => change.rowIndex);
    const columnIndices = summary.changes.map((change) => model.value.getColumnIndex(change.columnKey));
    const nextSelection = {
      startRow: Math.min(...rowIndices),
      endRow: Math.max(...rowIndices),
      startCol: Math.min(...columnIndices),
      endCol: Math.max(...columnIndices),
    };
    selection.value = nextSelection;
    anchorCell.value = { rowIndex: nextSelection.startRow, columnIndex: nextSelection.startCol };
  }
}

function onKeyDown(event) {
  if (event.metaKey || event.ctrlKey) {
    if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      model.value.undo();
    }
    if (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z')) {
      event.preventDefault();
      model.value.redo();
    }
  }
}

function onViewportScroll() {
  scrollTick.value += 1;
}

function getEditingKey(rowIndex, columnKey) {
  return `${rowIndex}:${columnKey}`;
}

function getCellInputValue(entry, column) {
  const key = getEditingKey(entry.index, column.key);
  if (Object.prototype.hasOwnProperty.call(editingValues, key)) {
    return editingValues[key];
  }
  const value = entry.data[column.key];
  return value ?? '';
}

function commitCellEdit(entry, column) {
  const key = getEditingKey(entry.index, column.key);
  if (!Object.prototype.hasOwnProperty.call(editingValues, key)) {
    return;
  }

  const pendingValue = editingValues[key];
  delete editingValues[key];

  model.value.setCell(entry.index, column.key, pendingValue, { source: CHANGE_SOURCES.EDIT });
  emit('cell-edit', {
    rowIndex: entry.index,
    column,
    value: pendingValue,
  });
}

function cancelCellEdit(entry, column) {
  const key = getEditingKey(entry.index, column.key);
  if (Object.prototype.hasOwnProperty.call(editingValues, key)) {
    delete editingValues[key];
  }
}

function clearEditingState() {
  Object.keys(editingValues).forEach((key) => {
    delete editingValues[key];
  });
}
</script>
