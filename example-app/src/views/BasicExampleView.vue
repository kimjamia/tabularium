<script setup lang="ts">
import { ref } from 'vue'
import ExcelTable from 'vue3-excel-table'

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
    width: 150,
  },
  {
    key: 'salary',
    label: 'Salary',
    type: 'number',
    width: 120,
  },
]

const tableData = ref([
  {
    name: 'John Doe',
    age: 32,
    email: 'john.doe@example.com',
    department: 'Engineering',
    salary: 85000,
  },
  {
    name: 'Jane Smith',
    age: 28,
    email: 'jane.smith@example.com',
    department: 'Marketing',
    salary: 72000,
  },
  {
    name: 'Bob Johnson',
    age: 45,
    email: 'bob.johnson@example.com',
    department: 'Sales',
    salary: 68000,
  },
  {
    name: 'Alice Williams',
    age: 35,
    email: 'alice.williams@example.com',
    department: 'Engineering',
    salary: 92000,
  },
  {
    name: 'Charlie Brown',
    age: 29,
    email: 'charlie.brown@example.com',
    department: 'HR',
    salary: 65000,
  },
])
</script>

<template>
  <div class="example-view">
    <h2>Static Data Example</h2>
    <p>This view shows the component bound to in-memory data only.</p>
    <div class="table-wrapper">
      <ExcelTable
        :columns="columns"
        v-model="tableData"
      />
    </div>
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
</style>
