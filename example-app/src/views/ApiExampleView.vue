<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExcelTable from 'vue3-excel-table'

import { EMPLOYEE_STATUSES, FakeEmployeeApi, type EmployeeRow } from '../services/fakeEmployeeApi'

type TableRow = EmployeeRow & { __tempKey?: string }

type TableChangeSummary = {
  source?: string
  type?: string
  changes?: Array<{
    rowIndex: number
    columnKey: string
  }>
}

const DATA_KEYS: Array<keyof EmployeeRow> = ['name', 'role', 'status', 'salary', 'location']
let tempRowCounter = 0

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
      onClick: ({ row, rowIndex }) => handleDeleteRow(row as TableRow, rowIndex),
    },
  },
]

const tableOptions = {
  allowAddEmptyRow: true,
  keyFields: ['id'],
}

const tableRows = ref<TableRow[]>([])
const isLoading = ref(true)
const pendingRowIds = ref<Set<number>>(new Set())
const creatingTempKeys = ref<Set<string>>(new Set())
const statusMessage = ref('')
const errorMessage = ref('')

const pendingNames = computed(() => {
  const names = tableRows.value
    .filter((row) => row.id && pendingRowIds.value.has(row.id))
    .map((row) => row.name ?? `Row #${row.id}`)

  creatingTempKeys.value.forEach((tempKey) => {
    const row = tableRows.value.find((entry) => entry.__tempKey === tempKey)
    if (row) {
      names.push(row.name ?? 'New employee')
    }
  })

  return names
})

onMounted(() => {
  fetchRows()
})

async function fetchRows() {
  try {
    isLoading.value = true
    tableRows.value = await api.listRows()
    creatingTempKeys.value = new Set<string>()
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

function ensureTempKey(row: TableRow) {
  if (!row.__tempKey) {
    row.__tempKey = `temp-${tempRowCounter++}`
  }
  return row.__tempKey
}

function addCreatingTempKey(tempKey: string) {
  const next = new Set(creatingTempKeys.value)
  next.add(tempKey)
  creatingTempKeys.value = next
}

function removeCreatingTempKey(tempKey: string) {
  const next = new Set(creatingTempKeys.value)
  next.delete(tempKey)
  creatingTempKeys.value = next
}

function getColumnLabel(columnKey: string) {
  const column = columns.find((entry) => entry.key === columnKey)
  return column?.label ?? columnKey
}

function findRowByTempKey(tempKey?: string) {
  if (!tempKey) {
    return undefined
  }
  return tableRows.value.find((row) => row.__tempKey === tempKey)
}

function findRowByIndex(rowIndex: number) {
  return tableRows.value[rowIndex]
}

function buildRowPayload(row: TableRow): Partial<EmployeeRow> {
  const payload: Partial<EmployeeRow> = {}
  DATA_KEYS.forEach((key) => {
    payload[key] = row[key]
  })
  return payload
}

function applyCreatedRow(tempKey: string, created: EmployeeRow): TableRow | undefined {
  const localRow = findRowByTempKey(tempKey)
  if (localRow) {
    const snapshot: Partial<TableRow> = {}
    DATA_KEYS.forEach((key) => {
      snapshot[key] = localRow[key]
    })
    Object.assign(localRow, created)
    DATA_KEYS.forEach((key) => {
      if (snapshot[key] !== undefined) {
        localRow[key] = snapshot[key] as TableRow[typeof key]
      }
    })
    delete localRow.__tempKey
    return localRow
  }

  tableRows.value.push({ ...created })
  return tableRows.value[tableRows.value.length - 1]
}

async function syncChangesAfterCreation(created: EmployeeRow, localRow?: TableRow) {
  if (!localRow || !created.id) {
    return
  }
  const updates = DATA_KEYS.filter((key) => localRow[key] !== created[key]).map((key) => ({
    key,
    value: localRow[key],
  }))

  if (updates.length === 0) {
    replaceRow({ ...localRow })
    return
  }

  setRowPending(created.id, true)
  let latest = created
  try {
    for (const update of updates) {
      latest = await api.updateCell(created.id, update.key, update.value)
    }
    replaceRow(latest)
    statusMessage.value = `Saved ${localRow.name ?? `#${created.id}`}`
  } catch (error) {
    handleError(error)
    await fetchRows()
  } finally {
    setRowPending(created.id, false)
  }
}

function startCreatingRow(tempKey: string, initialRowIndex: number) {
  if (creatingTempKeys.value.has(tempKey)) {
    return
  }
  addCreatingTempKey(tempKey)

  const row = findRowByTempKey(tempKey) ?? tableRows.value[initialRowIndex]
  if (!row) {
    removeCreatingTempKey(tempKey)
    return
  }

  const payload = buildRowPayload(row)

  ;(async () => {
    try {
      const created = await api.createRow(payload)
      const localRow = applyCreatedRow(tempKey, created)
      statusMessage.value = `Created ${created.name} (#${created.id})`
      await syncChangesAfterCreation(created, localRow)
      clearError()
    } catch (error) {
      handleError(error)
      await fetchRows()
    } finally {
      removeCreatingTempKey(tempKey)
    }
  })()
}

function isDataColumn(columnKey: string): columnKey is keyof EmployeeRow {
  return columnKey !== 'actions' && columnKey !== 'id'
}

function isCommitSummary(summary?: TableChangeSummary): summary is TableChangeSummary & { changes: NonNullable<TableChangeSummary['changes']> } {
  return Boolean(
    summary
      && summary.source === 'edit'
      && summary.type === 'cell'
      && Array.isArray(summary.changes)
      && summary.changes.length > 0,
  )
}

async function persistCommittedChange(row: TableRow, columnKey: keyof EmployeeRow) {
  if (!row.id) {
    return
  }

  setRowPending(row.id, true)

  try {
    const updated = await api.updateCell(row.id, columnKey, row[columnKey])
    replaceRow(updated)
    statusMessage.value = `Saved ${getColumnLabel(columnKey)} for ${updated.name}`
  } catch (error) {
    handleError(error)
    await fetchRows()
  } finally {
    setRowPending(row.id, false)
  }
}

async function handleTableChange(summary: TableChangeSummary) {
  if (!isCommitSummary(summary)) {
    return
  }

  clearError()

  for (const change of summary.changes) {
    if (!isDataColumn(change.columnKey)) {
      continue
    }

    const row = findRowByIndex(change.rowIndex)
    if (!row) {
      continue
    }

    if (!row.id) {
      const tempKey = ensureTempKey(row)
      startCreatingRow(tempKey, change.rowIndex)
      continue
    }

    await persistCommittedChange(row, change.columnKey)
  }
}

async function handleDeleteRow(row?: TableRow, rowIndex?: number) {
  if (!row) {
    return
  }

  if (!row.id) {
    const index = typeof rowIndex === 'number' ? rowIndex : tableRows.value.indexOf(row)
    if (index >= 0) {
      tableRows.value.splice(index, 1)
    }
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
    </header>

    <p class="api-view__instructions">
      Use the empty row at the bottom of the table to add a new employee. We queue your edits until the fake API issues an ID, and we only sync when you commit the cell (Enter or blur).
    </p>

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
        @change="handleTableChange"
      />

        <p class="api-view__hint">
          Tip: commits (press Enter, Tab, or click away) trigger the API call; interim typing stays local and batches automatically.
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

.api-view__instructions {
  margin: 0;
  padding: 12px 16px;
  border-radius: 6px;
  background: #eef2ff;
  color: #312e81;
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
