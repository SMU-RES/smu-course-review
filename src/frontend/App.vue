<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="container">
        <RouterLink to="/" class="logo">
          <h1>海大选课通</h1>
          <span class="subtitle">上海海事大学课程评价平台</span>
        </RouterLink>
      </div>
    </header>
    <main class="main">
      <div class="container">
        <RouterView />
      </div>
    </main>
    <footer class="footer">
      <div class="container">
        <p>海大选课通 &copy; 2025 &mdash; 服务上海海事大学学生</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #1a56db;
  color: #fff;
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo {
  text-decoration: none;
  color: #fff;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.subtitle {
  font-size: 13px;
  opacity: 0.8;
}

.main {
  flex: 1;
  padding: 20px 0;
  background: #f5f7fa;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 16px;
}

.footer {
  background: #f0f0f0;
  padding: 16px 0;
  text-align: center;
  font-size: 13px;
  color: #999;
}
</style>
