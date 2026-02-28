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
      path: '/teachers',
      name: 'teachers',
      component: () => import('../views/AllTeachersView.vue'),
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
