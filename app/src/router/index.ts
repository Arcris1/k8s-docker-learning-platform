import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
    },
    {
      path: '/tier/:tierId',
      name: 'tier',
      component: () => import('../views/TierView.vue'),
      props: true,
    },
    {
      path: '/tier/:tierId/module/:slug',
      name: 'lesson',
      component: () => import('../views/LessonView.vue'),
      props: true,
    },
    {
      path: '/tier/:tierId/module/:slug/lab/:labId',
      name: 'lab',
      component: () => import('../views/LabView.vue'),
      props: true,
    },
    {
      path: '/commands',
      name: 'commands',
      component: () => import('../views/CommandRefView.vue'),
    },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
})

export default router
