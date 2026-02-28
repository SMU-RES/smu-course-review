import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/hot',
      name: 'hot',
      component: () => import('../views/HotView.vue'),
    },
    {
      path: '/all',
      name: 'all',
      component: () => import('../views/AllView.vue'),
    },
    {
      path: '/course/:id',
      name: 'course',
      component: () => import('../views/CourseView.vue'),
    },
  ],
})

export default router
