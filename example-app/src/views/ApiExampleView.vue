<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExcelTable from 'vue3-excel-table'

import { EMPLOYEE_STATUSES, FakeEmployeeApi, type EmployeeRow } from '../services/fakeEmployeeApi'

const api = new FakeEmployeeApi()

const statusOptions = EMPLOYEE_STATUSES.map((status) => ({
  value: status,
  label: status,
}))

const columns = [
  {
    key: 'id',
    label: 'ID',
    type: 'number',
    width: 80,
    editable: false,
    sortable: false,
  },
  {
    key: 'name',
    label: 'Name',
    width: 220,
  },
  {
    key: 'role',
    label: 'Role',
    width: 200,
  },
  {
    key: 'status',
    label: 'Status',
    type: 'dropdown',
    width: 160,
    dropdown: {
      options: statusOptions,
      valueField: 'value',
      displayField: 'label',
    },
  },
  {
    key: 'salary',
    label: 'Salary',
    type: 'number',
    width: 140,
  },
  {
    key: 'location',
    label: 'Location',
    width: 200,
  },
  {
    key: 'actions',
    label: 'Actions',
    type: 'button',
    width: 140,
    editable: false,
    sortable: false,
    filterable: false,
    button: {
      label: () => 'Delete row',
      onClick: ({ row }) => handleDeleteRow(row as EmployeeRow),
    },
  },
]

const tableOptions = {
  allowAddEmptyRow: false,
  keyFields: ['id'],
}

const tableRows = ref<EmployeeRow[]>([])
const isLoading = ref(true)
const isCreatingRow = ref(false)
const pendingRowIds = ref<Set<number>>(new Set())
const statusMessage = ref('')
const errorMessage = ref('')

const pendingNames = computed(() =>
  tableRows.value
    .filter((row) => pendingRowIds.value.has(row.id))
    .map((row) => row.name),
)

onMounted(() => {
  fetchRows()
})

async function fetchRows() {
  try {
    isLoading.value = true
    tableRows.value = await api.listRows()
  } catch (error) {
    handleError(error)
  } finally {
    isLoading.value = false
  }
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }
  return 'Something went wrong while talking to the API.'
}

function handleError(error: unknown) {
  errorMessage.value = formatError(error)
  statusMessage.value = ''
}

function clearError() {
  errorMessage.value = ''
}

function setRowPending(id: number, pending: boolean) {
  const next = new Set(pendingRowIds.value)
  if (pending) {
    next.add(id)
  } else {
    next.delete(id)
  }
  pendingRowIds.value = next
}

function replaceRow(updated: EmployeeRow) {
  const index = tableRows.value.findIndex((row) => row.id === updated.id)
  if (index === -1) {
    return
  }
  tableRows.value.splice(index, 1, updated)
}

function isDataColumn(columnKey: string): columnKey is keyof EmployeeRow {
  return columnKey !== 'actions' && columnKey !== 'id'
}

async function handleCellEdit({
  rowIndex,
  column,
}: {
  rowIndex: number
  column: { key: string; label?: string }
}) {
  const row = tableRows.value[rowIndex]
  if (!row || !isDataColumn(column.key)) {
    return
  }

  clearError()
  setRowPending(row.id, true)

  try {
    const updated = await api.updateCell(row.id, column.key, row[column.key])
    replaceRow(updated)
    statusMessage.value = `Saved ${column.label ?? column.key} for ${updated.name}`
  } catch (error) {
    handleError(error)
    await fetchRows()
  } finally {
    setRowPending(row.id, false)
  }
}

async function handleAddRow() {
  clearError()
  isCreatingRow.value = true

  try {
    const created = await api.createRow()
    tableRows.value = [...tableRows.value, created]
    statusMessage.value = `Created ${created.name} (#${created.id})`
  } catch (error) {
    handleError(error)
  } finally {
    isCreatingRow.value = false
  }
}

async function handleDeleteRow(row?: EmployeeRow) {
  if (!row?.id) {
    return
  }

  clearError()
  setRowPending(row.id, true)
  try {
    await api.deleteRow(row.id)
    tableRows.value = tableRows.value.filter((entry) => entry.id !== row.id)
    statusMessage.value = `Deleted ${row.name}`
  } catch (error) {
    handleError(error)
    await fetchRows()
  } finally {
    setRowPending(row.id, false)
  }
}
</script>

<template>
  <div class="api-view">
    <header class="api-view__header">
      <div>
        <h2>Simulated REST-backed Table</h2>
        <p>
          Every create, update, or delete request hits a fake API that waits 500–900&nbsp;ms before responding.
        </p>
      </div>

      <div class="toolbar">
        <button
          class="toolbar__button"
          type="button"
          :disabled="isCreatingRow"
          @click="handleAddRow"
        >
          {{ isCreatingRow ? 'Creating…' : 'Add employee' }}
        </button>
      </div>
    </header>

    <p
      v-if="pendingNames.length"
      class="api-view__pending"
    >
      Syncing rows: {{ pendingNames.join(', ') }}…
    </p>

    <p
      v-if="statusMessage"
      class="api-view__status"
    >
      {{ statusMessage }}
    </p>

    <p
      v-if="errorMessage"
      class="api-view__error"
    >
      {{ errorMessage }}
    </p>

    <div
      v-if="isLoading"
      class="api-view__loading"
    >
      Loading rows from the API…
    </div>

    <div
      v-else
      class="api-view__table"
    >
      <ExcelTable
        :columns="columns"
        :options="tableOptions"
        v-model="tableRows"
        @cell-edit="handleCellEdit"
      />

      <p class="api-view__hint">
        Tip: try editing multiple cells or deleting a row to see the async API simulation in action.
      </p>
    </div>
  </div>
</template>

<style scoped>
.api-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.api-view__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar__button {
  background: #2563eb;
  border: none;
  color: #fff;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.toolbar__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.api-view__pending {
  font-size: 0.95rem;
  color: #92400e;
  background: #fef3c7;
  padding: 8px 12px;
  border-radius: 4px;
}

.api-view__status {
  font-size: 0.95rem;
  color: #065f46;
  background: #d1fae5;
  padding: 8px 12px;
  border-radius: 4px;
}

.api-view__error {
  color: #b91c1c;
  background: #fee2e2;
  padding: 8px 12px;
  border-radius: 4px;
}

.api-view__loading {
  padding: 24px;
  border: 1px dashed #cbd5f5;
  border-radius: 6px;
  color: #4b5563;
  background: #f8fafc;
}

.api-view__table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.api-view__hint {
  font-size: 0.9rem;
  color: #4b5563;
  margin: 0;
}
</style>
