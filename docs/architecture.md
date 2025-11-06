# Architecture Overview

The Excel-like grid ships as two layers:

1. **Pure JavaScript core (`TableModel`)** – owns the data array, column definitions, validation rules, undo stack, filter state, and change aggregation. The model exposes a small API for mutating cells (`setCell`, `bulkUpdate`, `paste`, `fill`, `undo`, `redo`) and emits one consolidated summary per mutation through `registerChangeListener`.
2. **Vue 3 wrapper (`ExcelTable.vue`)** – renders the tabular UI, forwards edits to the core, and surfaces events (`update:modelValue`, `change`, `button-click`, etc.). It handles selection rectangles, fill handles, sticky headers/columns, dropdown rendering, checkboxes, buttons, link cells, and filter controls.

Because the UI depends only on the public methods of `TableModel`, you can re-use the same core in other frameworks (React/Svelte/web components) by binding their events to the same API surface.

## Data Flow

1. Incoming `modelValue` (array of row objects) is normalised by `TableModel`, which enforces column defaults, dropdown value mapping, and validation.
2. The Vue component listens to model changes via `registerChangeListener`. Each summary contains:
   - `type` (`cell`, `bulk`, `paste`, `fill`, `filter`, etc.) and `source` (`edit`, `paste`, `fill`, `programmatic`, `undo`).
   - `changes`: array of `{ rowIndex, columnKey, oldValue, newValue }`.
   - `rows`: the full row objects touched by the operation.
   - `errors`: a map keyed by `rowIndex:columnKey` to validation messages.
3. The wrapper emits exactly one `change` event per mutation and syncs a filtered `modelValue` back to the parent only for data-changing operations (filters do not trigger `update:modelValue`).

## Column Types

| Type | Rendering | Notes |
| --- | --- | --- |
| `text` | Text input | Default type. |
| `number` | Numeric input | Normalised to `Number` (empty → `null`). |
| `checkbox` | Checkbox | Accepts spreadsheet truthy strings on paste (`X`, `1`, `Y`, etc.). |
| `dropdown` | `<select>` | Supports `displayField`, `valueField`, `keyFields`, and configurable paste matching. |
| `button` | `<button>` | Uses `column.button.label` (function or string) and `column.button.onClick`. |
| `links` | List of `<a>` tags | Accepts arrays of `{ label, href, target }` or plain URLs. |

## Validation & Filtering

- Per-column validator functions run with the row context (`row`, `rowIndex`, `data`, helper `getValue`).
- Setting `unique: true` on a column enforces column-level uniqueness.
- Filters live inside the core (`setFilter`, `clearFilters`) so filtered views stay consistent across wrappers.
- Number filters accept `{ min, max }` ranges; text filters perform case-insensitive contains matching (using dropdown display text when relevant).

## Undo/Redo

Each mutation pushes a change set (with before/after values) onto the undo stack. Calling `undo()` or `redo()` replays the inverse changes through the same pipeline, triggering normal validation and change summaries.

## Extending

- Implement additional input types by adding new branches in `TableModel._normalizeValue` and the Vue cell renderer.
- Swap the renderer (`ExcelTable.vue`) with another frontend while reusing `TableModel` as the headless data layer.
- Hook additional analytics/auditing in `registerChangeListener`, which already produces aggregated context.
