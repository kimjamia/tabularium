/// <reference types="vite/client" />

declare module 'vue3-excel-table' {
  import { DefineComponent } from 'vue'
  const ExcelTable: DefineComponent
  export default ExcelTable
  export { TableModel, CHANGE_SOURCES }
}
