<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'

type NavLink = {
  to: string
  label: string
  name: string
}

const route = useRoute()

const links: NavLink[] = [
  { to: '/', label: 'Static data', name: 'basic' },
  { to: '/rest-api', label: 'REST API simulation', name: 'rest-api' },
]
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <h1>Vue3 Excel Table Examples</h1>
        <p>Switch between a static data set and a fake REST-backed table.</p>
      </div>
      <nav class="app-nav">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="app-nav__link"
          :class="{ 'is-active': route.name === link.name }"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f5f7fb;
  color: #111827;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.app-header h1 {
  margin: 0 0 8px;
}

.app-header p {
  margin: 0;
  color: #4b5563;
}

.app-nav {
  display: flex;
  gap: 8px;
}

.app-nav__link {
  padding: 8px 16px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #1f2937;
  text-decoration: none;
  font-weight: 600;
}

.app-nav__link.is-active {
  background: #2563eb;
  color: #fff;
}

.app-content {
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 24px rgba(15, 23, 42, 0.08);
  min-height: calc(100vh - 140px);
}
</style>
