import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'basic',
      component: () => import('../views/BasicExampleView.vue'),
      meta: { title: 'Static data' },
    },
    {
      path: '/rest-api',
      name: 'rest-api',
      component: () => import('../views/ApiExampleView.vue'),
      meta: { title: 'Simulated REST API' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.afterEach((to) => {
  const titleSuffix = to.meta?.title ? ` | ${to.meta.title}` : ''
  document.title = `Vue3 Excel Table Examples${titleSuffix}`
})

export default router
