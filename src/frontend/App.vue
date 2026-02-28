<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
import { isStaticMode } from '@/services/data-service'
import StaticBanner from '@/components/StaticBanner.vue'

const staticMode = isStaticMode()
</script>

<template>
  <div class="app">
    <StaticBanner v-if="staticMode" />
    <header class="app-bar elevation-3">
      <div class="app-bar-inner">
        <RouterLink to="/" class="brand">
          <h1>海大选课通</h1>
        </RouterLink>
        <nav class="nav-tabs">
          <RouterLink to="/" exact-active-class="active" class="nav-tab">首页</RouterLink>
          <RouterLink v-if="staticMode" to="/hot" active-class="active" class="nav-tab">热门课程</RouterLink>
          <RouterLink v-if="staticMode" to="/all" active-class="active" class="nav-tab">全部课程</RouterLink>
          <RouterLink v-if="staticMode" to="/teachers" active-class="active" class="nav-tab">全部教师</RouterLink>
        </nav>
      </div>
    </header>
    <main class="main-content">
      <div class="container">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-bar {
  background: #1a56db;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-bar-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}

.brand {
  text-decoration: none;
  color: #fff;
}

.brand h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.nav-tabs {
  display: flex;
  gap: 0;
}

.nav-tab {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.2s ease;
  letter-spacing: 0.25px;
}

.nav-tab:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.nav-tab.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.24);
}

.main-content {
  flex: 1;
  padding: 24px 0;
  background: #f7f2fa;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 16px;
}
</style>
