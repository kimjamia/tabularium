<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const allColumnKeys = columns.map((column) => column.key)

const visibleColumnKeys = ref<string[]>([...allColumnKeys])
const visibleColumns = computed(() => columns.filter((column) => visibleColumnKeys.value.includes(column.key)))

watch(visibleColumnKeys, (next) => {
  if (!next.length) {
    visibleColumnKeys.value = [...allColumnKeys]
  }
})

function resetVisibleColumns() {
  visibleColumnKeys.value = [...allColumnKeys]
}

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
</script>

<template>
  <div class="example-view">
    <h2>Static Data Example</h2>
    <p>
      Explore dropdown columns, column visibility controls, and live summaries powered entirely by in-memory data.
    </p>

    <div class="controls">
      <div class="column-visibility">
        <label
          class="column-visibility__label"
          for="visible-columns"
        >
          Visible columns
        </label>
        <select
          id="visible-columns"
          v-model="visibleColumnKeys"
          class="column-visibility__select"
          multiple
          size="5"
        >
          <option
            v-for="column in columns"
            :key="column.key"
            :value="column.key"
          >
            {{ column.label ?? column.key }}
          </option>
        </select>
        <small>Use Ctrl/Cmd + click (or Shift + click) to toggle multiple columns.</small>
      </div>
      <button
        type="button"
        class="column-visibility__reset"
        @click="resetVisibleColumns"
      >
        Reset selection
      </button>
    </div>

    <div class="table-wrapper">
      <ExcelTable
        :columns="visibleColumns"
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
  </div>
</template>

<style scoped>
.example-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.table-wrapper {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.controls {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.column-visibility {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.column-visibility__select {
  min-width: 220px;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.column-visibility small {
  color: #666;
  font-size: 12px;
}

.column-visibility__reset {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: #fff;
  color: #333;
  cursor: pointer;
  transition: background 0.2s ease;
}

.column-visibility__reset:hover {
  background: #f3f3f3;
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
</style>
