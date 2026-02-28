<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')

function doSearch() {
  const q = searchQuery.value.trim()
  if (q) {
    router.push({ path: '/all', query: { q } })
  }
}
</script>

<template>
  <div class="home">
    <div class="hero">
      <div class="hero-icon">&#x1F393;</div>
      <h2 class="hero-title">海大选课通</h2>
      <p class="hero-subtitle">上海海事大学课程评价与信息共享平台</p>

      <form class="search-card elevation-2" @submit.prevent="doSearch">
        <div class="search-field">
          <span class="search-icon">&#x1F50D;</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索课程名、教师名、课程号..."
            class="search-input"
          />
        </div>
        <button type="submit" class="search-btn">搜索</button>
      </form>

      <div class="chip-group">
        <RouterLink to="/hot" class="chip">
          <span class="chip-icon">&#x1F525;</span>
          热门课程
        </RouterLink>
        <RouterLink to="/all" class="chip">
          <span class="chip-icon">&#x1F4DA;</span>
          全部课程
        </RouterLink>
        <RouterLink to="/teachers" class="chip">
          <span class="chip-icon">&#x1F9D1;&#x200D;&#x1F3EB;</span>
          全部教师
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 56px - 48px);
}

.hero {
  text-align: center;
  width: 100%;
  max-width: 520px;
  padding: 0 16px;
}

.hero-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.hero-title {
  font-size: 28px;
  font-weight: 400;
  color: #1a56db;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.hero-subtitle {
  font-size: 14px;
  color: #49454f;
  margin-bottom: 32px;
  letter-spacing: 0.25px;
}

.search-card {
  background: #fff;
  border-radius: 28px;
  display: flex;
  align-items: center;
  padding: 4px 4px 4px 16px;
  gap: 8px;
  transition: box-shadow 0.2s;
}

.search-card:focus-within {
  box-shadow: 0 4px 16px rgba(26, 86, 219, 0.24), 0 2px 4px rgba(0, 0, 0, 0.08);
}

.search-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-icon {
  font-size: 18px;
  opacity: 0.5;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  padding: 12px 0;
  background: transparent;
  color: #1d1b20;
}

.search-input::placeholder {
  color: #49454f;
  opacity: 0.6;
}

.search-btn {
  padding: 10px 24px;
  background: #1a56db;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.search-btn:hover {
  background: #1447b5;
  box-shadow: 0 1px 3px rgba(26, 86, 219, 0.3);
}

.search-btn:active {
  background: #0d3a96;
}

.chip-group {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  gap: 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #e8def8;
  color: #1d1b20;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s, box-shadow 0.2s;
  letter-spacing: 0.25px;
}

.chip:hover {
  background: #d0bcff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  text-decoration: none;
}

.chip-icon {
  font-size: 16px;
}
</style>
