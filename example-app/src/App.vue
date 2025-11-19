<script setup lang="ts">
import { computed, ref } from 'vue'
import ExcelTable from 'vue3-excel-table'

const departmentOptions = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Marketing' },
  { id: 3, name: 'Sales' },
  { id: 4, name: 'HR' },
  { id: 5, name: 'Finance' },
]

const departmentLookup = departmentOptions.reduce<Record<number, { id: number; name: string }>>((acc, option) => {
  acc[option.id] = option
  return acc
}, {})

// Define columns for the table
const columns = [
  {
    key: 'name',
    label: 'Name',
    width: 200,
    unique: true,
  },
  {
    key: 'age',
    label: 'Age',
    type: 'number',
    width: 100,
  },
  {
    key: 'email',
    label: 'Email',
    width: 250,
  },
  {
    key: 'department',
    label: 'Department',
    width: 180,
    type: 'dropdown',
    dropdown: {
      options: departmentOptions,
      valueField: 'id',
      displayField: 'name',
      keyFields: ['id'],
      pasteMode: 'both',
      allowEmpty: true,
      emptyLabel: 'Select department',
    },
  },
  {
    key: 'salary',
    label: 'Salary',
    type: 'number',
    width: 120,
  },
]

type ExcelTableInstance = InstanceType<typeof ExcelTable> & {
  mergeRows: (rows: Record<string, unknown>[], options: { updateColumns: string[] }) => Promise<unknown> | unknown
}

const tableRef = ref<ExcelTableInstance | null>(null)

// Example data rows
const tableData = ref([
  {
    name: 'John Doe',
    age: 32,
    email: 'john.doe@example.com',
    department: 1,
    salary: 85000,
  },
  {
    name: 'Jane Smith',
    age: 28,
    email: 'jane.smith@example.com',
    department: 2,
    salary: 72000,
  },
  {
    name: 'Bob Johnson',
    age: 45,
    email: 'bob.johnson@example.com',
    department: 3,
    salary: 68000,
  },
  {
    name: 'Alice Williams',
    age: 35,
    email: 'alice.williams@example.com',
    department: 1,
    salary: 92000,
  },
  {
    name: 'Charlie Brown',
    age: 29,
    email: 'charlie.brown@example.com',
    department: 4,
    salary: 65000,
  },
])

const departmentAssignments = computed(() =>
  tableData.value.map((row) => {
    const details = typeof row.department === 'number' ? departmentLookup[row.department] : undefined
    const departmentId = typeof row.department === 'number' ? row.department : null
    return {
      employee: row.name,
      departmentId,
      departmentName: details?.name ?? 'Unassigned',
    }
  }),
)

const isMergeModalOpen = ref(false)
const mergeTableInstanceKey = ref(0)
const mergeTableData = ref<Record<string, unknown>[]>([])
const initialUpdateColumns = columns.slice(1).map((column) => column.key)
const updateColumnsSelection = ref<string[]>(
  initialUpdateColumns.length > 0 ? [...initialUpdateColumns] : columns.slice(0, Math.max(columns.length - 1, 1)).map((column) => column.key),
)

if (updateColumnsSelection.value.length === columns.length) {
  updateColumnsSelection.value.pop()
}

const updateColumnSet = computed(() => new Set(updateColumnsSelection.value))
const mergeKeyColumns = computed(() => columns.filter((column) => !updateColumnSet.value.has(column.key)))

const mergeColumnConstraintMessage = computed(() => {
  if (updateColumnSet.value.size === 0) {
    return 'Select at least one column to update.'
  }
  if (mergeKeyColumns.value.length === 0) {
    return 'At least one column must remain unchecked to act as the merge key.'
  }
  return ''
})

const canExecuteMerge = computed(() => mergeColumnConstraintMessage.value === '')
const mergeError = ref('')

const lastDepartmentSelection = ref<{ id: number; name: string } | null>(null)

function getDepartmentDetails(id: number | null | undefined) {
  if (typeof id !== 'number' || Number.isNaN(id)) {
    return null
  }
  return departmentLookup[id] ?? null
}

type CellEditPayload = {
  column: { key: string }
  value: unknown
}

function handleCellEdit(payload: CellEditPayload) {
  if (payload.column.key !== 'department') {
    return
  }

  const normalizedValue =
    typeof payload.value === 'string'
      ? payload.value.trim() === ''
        ? null
        : Number(payload.value)
      : (payload.value as number | null | undefined)

  const details = getDepartmentDetails(normalizedValue ?? null)
  lastDepartmentSelection.value = details ? { id: details.id, name: details.name } : null
}

function resetMergeModal() {
  mergeTableData.value = []
  mergeTableInstanceKey.value += 1
  mergeError.value = ''
}

function openMergeModal() {
  resetMergeModal()
  isMergeModalOpen.value = true
}

function closeMergeModal() {
  isMergeModalOpen.value = false
}

function toggleColumnForUpdate(columnKey: string) {
  const next = [...updateColumnsSelection.value]
  const currentIndex = next.indexOf(columnKey)

  if (currentIndex >= 0) {
    if (next.length === 1) {
      mergeError.value = 'Keep at least one column selected for updates.'
      return
    }
    next.splice(currentIndex, 1)
  } else {
    const nextSelectedCount = next.length + 1
    if (columns.length - nextSelectedCount < 1) {
      mergeError.value = 'At least one merge key column is required.'
      return
    }
    next.push(columnKey)
  }

  mergeError.value = ''
  updateColumnsSelection.value = next
}

function isColumnSelected(columnKey: string) {
  return updateColumnSet.value.has(columnKey)
}

function isCheckboxDisabled(columnKey: string) {
  if (updateColumnSet.value.has(columnKey)) {
    return updateColumnsSelection.value.length === 1
  }
  return columns.length - (updateColumnsSelection.value.length + 1) < 1
}

async function handleMergeSubmit() {
  mergeError.value = ''
  if (!canExecuteMerge.value) {
    mergeError.value = mergeColumnConstraintMessage.value
    return
  }

  try {
    await tableRef.value?.mergeRows(mergeTableData.value, {
      updateColumns: [...updateColumnsSelection.value],
    })
    closeMergeModal()
  } catch (error) {
    mergeError.value = error instanceof Error ? error.message : 'Unable to merge rows with the provided data.'
  }
}
</script>

<template>
  <div class="app-container">
    <h1>Excel Table Example</h1>
    <p>This is a simple demonstration of the Excel Table component with example data.</p>
    <div class="table-toolbar">
      <button
        type="button"
        class="app-button is-primary"
        @click="openMergeModal"
      >
        Merge from source data
      </button>
    </div>
    <div class="table-wrapper">
      <ExcelTable
        ref="tableRef"
        :columns="columns"
        v-model="tableData"
        @cell-edit="handleCellEdit"
      />
    </div>
    <section class="selection-summary">
      <h2>Department selections</h2>
      <p
        v-if="lastDepartmentSelection"
        class="selection-summary__hint"
      >
        Last change: {{ lastDepartmentSelection.name }} (ID: {{ lastDepartmentSelection.id }})
      </p>
      <ul>
        <li
          v-for="assignment in departmentAssignments"
          :key="assignment.employee"
        >
          {{ assignment.employee }} → {{ assignment.departmentName }} (ID:
          {{ assignment.departmentId ?? '—' }})
        </li>
      </ul>
    </section>
    <div
      v-if="isMergeModalOpen"
      class="merge-modal"
    >
      <div
        class="merge-modal__backdrop"
        @click="closeMergeModal"
      />
      <div
        class="merge-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Merge source data"
      >
        <header class="merge-modal__header">
          <h2>Merge source data</h2>
          <button
            type="button"
            class="merge-modal__close"
            @click="closeMergeModal"
          >
            Close
          </button>
        </header>
        <p class="merge-modal__intro">
          Paste the latest source data into the table below. Use the checkboxes to choose which columns should be updated.
        </p>
        <div class="merge-modal__selectors">
          <div class="merge-column-headers">
            <div
              v-for="column in columns"
              :key="column.key"
              class="merge-column-headers__cell"
            >
              <label>
                <input
                  type="checkbox"
                  :checked="isColumnSelected(column.key)"
                  :disabled="isCheckboxDisabled(column.key)"
                  @change="() => toggleColumnForUpdate(column.key)"
                />
                <span>{{ column.label }}</span>
              </label>
            </div>
          </div>
          <p class="merge-modal__hint">
            Checked columns are updated; unchecked columns become the merge key.
          </p>
          <p
            v-if="mergeColumnConstraintMessage"
            class="merge-modal__hint is-warning"
          >
            {{ mergeColumnConstraintMessage }}
          </p>
        </div>
        <div class="merge-modal__table">
          <ExcelTable
            :key="mergeTableInstanceKey"
            v-model="mergeTableData"
            :columns="columns"
          />
        </div>
        <div class="merge-modal__summary">
          <p>
            Merge keys:
            <strong>{{ mergeKeyColumns.map((column) => column.label).join(', ') || '—' }}</strong>
          </p>
          <p
            v-if="mergeError"
            class="merge-modal__error"
          >
            {{ mergeError }}
          </p>
        </div>
        <div class="merge-modal__actions">
          <button
            type="button"
            class="app-button"
            @click="closeMergeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="app-button is-primary"
            :disabled="!canExecuteMerge"
            @click="handleMergeSubmit"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 10px;
  color: #333;
}

p {
  margin-bottom: 20px;
  color: #666;
}

.table-wrapper {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.app-button {
  border: 1px solid #c5c5c5;
  background: #fff;
  color: #333;
  padding: 8px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.app-button:hover:not(:disabled) {
  background: #f5f5f5;
}

.app-button.is-primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.app-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selection-summary {
  margin-top: 24px;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
}

.selection-summary h2 {
  margin-top: 0;
  margin-bottom: 12px;
  font-size: 18px;
  color: #333;
}

.selection-summary__hint {
  margin: 0 0 12px;
  font-size: 14px;
  color: #555;
}

.selection-summary ul {
  margin: 0;
  padding-left: 18px;
  color: #444;
}

.merge-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.merge-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}

.merge-modal__dialog {
  position: relative;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  width: min(960px, 90vw);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.merge-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.merge-modal__close {
  border: none;
  background: none;
  font-size: 14px;
  color: #2563eb;
  cursor: pointer;
}

.merge-modal__intro {
  margin-top: 0;
  margin-bottom: 12px;
  color: #444;
}

.merge-modal__selectors {
  margin-bottom: 12px;
}

.merge-column-headers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  background: #f9fafb;
}

.merge-column-headers__cell label {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 13px;
  color: #333;
}

.merge-modal__hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: #555;
}

.merge-modal__hint.is-warning {
  color: #b45309;
}

.merge-modal__table {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  max-height: 360px;
}

.merge-modal__table :deep(.excel-table__viewport) {
  max-height: 320px;
}

.merge-modal__summary {
  margin-top: 12px;
  font-size: 14px;
  color: #333;
}

.merge-modal__error {
  margin-top: 6px;
  color: #b91c1c;
}

.merge-modal__actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
