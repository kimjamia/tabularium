import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const base = process.env.BASE_PATH?.trim() || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Alias to the library source so it gets bundled with the app
      'vue3-excel-table': fileURLToPath(new URL('../src', import.meta.url))
    },
  },
  build: {
    // Vite bundles all imported modules by default, including the library via the alias
    // This ensures the Excel component library is included in the production bundle
  },
  optimizeDeps: {
    // Pre-bundle the library for faster dev server startup
    include: ['vue3-excel-table'],
  },
})
