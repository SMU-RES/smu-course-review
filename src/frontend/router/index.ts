import { createRouter, createWebHistory } from 'vue-router'
import { isStaticMode } from '@/services/data-service'

const staticMode = isStaticMode()

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
      beforeEnter: () => {
        if (!staticMode) return { path: '/' }
      },
    },
    {
      path: '/all',
      name: 'all',
      component: () => import('../views/AllView.vue'),
      beforeEnter: (to) => {
        if (!staticMode && !to.query.q) return { path: '/' }
      },
    },
    {
      path: '/teachers',
      name: 'teachers',
      component: () => import('../views/AllTeachersView.vue'),
      beforeEnter: (to) => {
        if (!staticMode && !to.query.q) return { path: '/' }
      },
    },
    {
      path: '/course/:id',
      name: 'course',
      component: () => import('../views/CourseView.vue'),
    },
    {
      path: '/teacher/:id',
      name: 'teacher',
      component: () => import('../views/TeacherView.vue'),
    },
  ],
})

export default router
