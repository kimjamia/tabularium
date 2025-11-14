# Vue3 Excel-Like Table

> [!WARNING]
> This project is fully vibe-coded.

`vue3-excel-table` is an Excel-inspired data grid for Vue 3. It combines a pure JavaScript data model with a Vue wrapper so you can reuse the core logic elsewhere. Paste multi-cell selections, drag-fill values, attach dropdowns with display/value pairs, add inline buttons and checkbox columns, validate data (including column-level uniqueness), and keep an empty row ready for new entries—just like a spreadsheet.

## Features

- Paste full blocks of cells, respecting dropdown value/display configuration.
- Configurable dropdowns with composite keys, display/value separation, and paste strategy (`value`, `display`, or `both`).
- Column freezing (headers and any number of leftmost columns) using CSS sticky positioning.
- Range & text filters per column (number range, text search, or custom predicate).
- Column-level validators with access to the full row and grid data; column-level uniqueness built-in.
- Supports text, numbers, checkbox cells (`X`, `1`, `Y`, `true` → checked), multi-link cells, and action buttons.
- Optional always-empty row at the end for quick data entry.
- Undo/redo with configurable history depth.
- Excel-style fill handle to propagate patterns down or right.
- Event payloads summarising all mutated cells and rows, emitted once per bulk operation (edit, paste, fill, undo, etc.).

## Installation

NOT YET AVAILABLE
```bash
npm install vue3-excel-table
# or
yarn add vue3-excel-table
```

### Register

```js
import { createApp } from 'vue';
import App from './App.vue';
import ExcelTable from 'vue3-excel-table';

createApp(App)
  .component('ExcelTable', ExcelTable)
  .mount('#app');
```

## Usage

```vue
<template>
  <ExcelTable
    v-model="rows"
    :columns="columns"
    :options="tableOptions"
    :filters="filters"
    @change="onTableChange"
    @button-click="onActionClick"
  />
</template>

<script setup>
import { ref } from 'vue';

const rows = ref([
  { id: 1, name: 'Ava', status: 'approved', attachments: [{ label: 'Contract', href: '/files/contract.pdf' }] },
  { id: 2, name: 'Noah', status: 'pending', attachments: [] },
]);

const columns = [
  { key: 'id', label: 'ID', type: 'number', unique: true, editable: false, width: 80 },
  { key: 'name', label: 'Name', type: 'text', validator: ({ value }) => (!value ? 'Name is required' : null) },
  {
    key: 'status',
    label: 'Status',
    type: 'dropdown',
    dropdown: {
      options: [
        { id: 1, value: 'approved', label: 'Approved' },
        { id: 2, value: 'pending', label: 'Pending' },
        { id: 3, value: 'rejected', label: 'Rejected' },
      ],
      valueField: 'value',
      displayField: 'label',
      keyFields: ['id'],
      pasteMode: 'both',
      allowEmpty: true,
      emptyLabel: 'Choose status',
    },
  },
  { key: 'urgent', label: 'Urgent', type: 'checkbox', width: 90 },
  { key: 'attachments', label: 'Attachments', type: 'links', editable: false, width: 220 },
  {
    key: 'actions',
    label: 'Actions',
    type: 'button',
    width: 120,
    button: {
      label: () => 'Delete row',
      onClick: ({ rowIndex, model }) => {
        const current = model.getRawData();
        current.splice(rowIndex, 1);
        model.setData(current);
      },
    },
  },
];

const tableOptions = {
  allowAddEmptyRow: true,
  frozenColumns: 1,
  keyFields: ['id'],
};

const filters = {};

function onTableChange(summary) {
  console.log('Changed cells:', summary.changes);
  console.log('Changed rows:', summary.rows);
}

function onActionClick(payload) {
  console.log('Clicked action:', payload);
}
</script>
```

## TableModel API

The `TableModel` class powers the grid and can be used without Vue.

```js
import { TableModel, CHANGE_SOURCES } from 'vue3-excel-table';

const model = new TableModel({ columns, data, options });

const unsubscribe = model.registerChangeListener((summary) => {
  console.log(summary.type, summary.changes);
});

model.setCell(0, 'name', 'Updated', { source: CHANGE_SOURCES.EDIT });
model.paste(0, 'name', 'Copied\tValues\nAcross\tColumns');
model.fill({ startRow: 0, endRow: 0, startCol: 1, endCol: 1 }, { endRow: 5, endCol: 1 });
model.undo();
```

### Column definition

| Property | Type | Description |
| --- | --- | --- |
| `key` | `string` | Unique column identifier. |
| `type` | `'text' | 'number' | 'checkbox' | 'dropdown' | 'button' | 'links'` | Cell rendering/behavior. |
| `label` | `string` | Header text. |
| `width` / `minWidth` | `number` | Fixed width hints for freezing & layout. |
| `editable` | `boolean` | Disable editing per column. |
| `filterable` | `boolean` | Toggle filter controls. |
| `unique` | `boolean` | Enforce column-level uniqueness. |
| `validator` | `function` | Receives `{ value, row, rowIndex, column, data, getValue }`; return string/array for errors. |
| `dropdown` | `object` | Dropdown configuration (options, value/display fields, `keyFields`, `pasteMode`, etc.). |
| `button` | `object` | `{ label, onClick }`, label can be constant or function. |

### Options

| Option | Default | Description |
| --- | --- | --- |
| `allowAddEmptyRow` | `true` | Keep a blank row at the bottom for new data. |
| `dropdownPasteMode` | `'both'` | Default dropdown paste behavior. |
| `undoLimit` | `200` | Max undo stack size. |
| `keyFields` | `[]` | Columns composing the logical row key (used for e.g. Vue `:key`). |
| `frozenColumns` | `0` | Number of left columns to freeze. |
| `freezeHeader` | `true` | Sticky header row. |

## Development

```bash
npm install
npm run dev
```

## License

MIT
