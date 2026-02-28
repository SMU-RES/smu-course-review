<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getDataService, type CourseListItem } from '@/services/data-service'

const router = useRouter()
const route = useRoute()

const courses = ref<CourseListItem[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const searchQuery = ref('')
const limit = 20

async function fetchCourses() {
  loading.value = true
  try {
    const svc = await getDataService()
    const field = (route.query.field as string) || undefined
    const data = await svc.getCourses({
      q: searchQuery.value.trim() || undefined,
      field,
      page: page.value,
      limit,
    })
    courses.value = data.courses
    total.value = data.total
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

function doSearch() {
  page.value = 1
  router.replace({ query: searchQuery.value.trim() ? { q: searchQuery.value.trim() } : {} })
  fetchCourses()
}

function goToCourse(id: number) {
  router.push(`/course/${id}`)
}

function goPage(p: number) {
  page.value = p
  fetchCourses()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const totalPages = ref(0)
watch(total, (t) => {
  totalPages.value = Math.ceil(t / limit)
})

onMounted(() => {
  const q = route.query.q as string
  if (q) searchQuery.value = q
  fetchCourses()
})
</script>

<template>
  <div class="all-view">
    <h2 class="page-title">全部课程</h2>

    <!-- 搜索栏 -->
    <form class="search-bar elevation-1" @submit.prevent="doSearch">
      <span class="search-icon">&#x1F50D;</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索课程名、教师名、课程号..."
        class="search-input"
      />
      <button v-if="searchQuery" type="button" class="clear-btn" @click="searchQuery = ''; doSearch()">&#x2715;</button>
      <button type="submit" class="search-submit">搜索</button>
    </form>

    <!-- 结果统计 -->
    <div class="result-info" v-if="!loading">
      共 {{ total }} 门课程
      <span v-if="searchQuery.trim()">（搜索：{{ searchQuery.trim() }}）</span>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="courses.length === 0" class="empty-state">
      <div class="empty-icon">&#x1F50D;</div>
      <p>未找到相关课程</p>
    </div>

    <!-- 课程列表 -->
    <div v-else class="course-list">
      <div
        v-for="course in courses"
        :key="course.id"
        class="course-card elevation-1"
        @click="goToCourse(course.id)"
      >
        <div class="card-header">
          <h3 class="card-title">{{ course.name }}</h3>
          <div v-if="course.avg_rating" class="card-rating">
            <span class="star">&#9733;</span>
            <span class="score">{{ course.avg_rating }}</span>
          </div>
        </div>
        <div class="card-meta">
          <span class="meta-chip">{{ course.teacher_names || '未知教师' }}</span>
          <span class="meta-chip">{{ course.department_name }}</span>
          <span v-if="course.credits" class="meta-chip">{{ course.credits }}学分</span>
          <span v-if="course.category" class="meta-chip category">{{ course.category }}</span>
        </div>
        <div class="card-footer">
          <span class="course-code">{{ course.course_code }}</span>
          <div class="card-stats">
            <span v-if="course.comment_count > 0" class="stat">&#x1F4AC; {{ course.comment_count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="page <= 1"
        @click="goPage(page - 1)"
      >&#x276E;</button>
      <template v-for="p in totalPages" :key="p">
        <button
          v-if="p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)"
          class="page-btn"
          :class="{ active: p === page }"
          @click="goPage(p)"
        >{{ p }}</button>
        <span
          v-else-if="p === page - 3 || p === page + 3"
          class="page-dots"
        >...</span>
      </template>
      <button
        class="page-btn"
        :disabled="page >= totalPages"
        @click="goPage(page + 1)"
      >&#x276F;</button>
    </div>
  </div>
</template>

<style scoped>
.all-view {
  padding-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 400;
  color: #1d1b20;
  margin-bottom: 16px;
  letter-spacing: 0.25px;
}

/* 搜索栏 */
.search-bar {
  background: #fff;
  border-radius: 28px;
  display: flex;
  align-items: center;
  padding: 4px 4px 4px 16px;
  gap: 8px;
  margin-bottom: 16px;
  transition: box-shadow 0.2s;
}

.search-bar:focus-within {
  box-shadow: 0 4px 16px rgba(26, 86, 219, 0.24), 0 2px 4px rgba(0, 0, 0, 0.08);
}

.search-icon {
  font-size: 16px;
  opacity: 0.5;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 15px;
  padding: 10px 0;
  background: transparent;
  color: #1d1b20;
  min-width: 0;
}

.search-input::placeholder {
  color: #49454f;
  opacity: 0.6;
}

.clear-btn {
  background: none;
  border: none;
  color: #49454f;
  font-size: 16px;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.search-submit {
  padding: 8px 20px;
  background: #1a56db;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.search-submit:hover {
  background: #1447b5;
}

.result-info {
  font-size: 13px;
  color: #79747e;
  margin-bottom: 16px;
  letter-spacing: 0.25px;
}

/* 加载 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: #49454f;
  font-size: 14px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e8def8;
  border-top-color: #1a56db;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #49454f;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
}

/* 课程卡片 */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
}

.course-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
  color: #1d1b20;
  letter-spacing: 0.15px;
}

.card-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.card-rating .star {
  color: #f59e0b;
  font-size: 16px;
}

.card-rating .score {
  font-size: 15px;
  font-weight: 600;
  color: #f59e0b;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.meta-chip {
  font-size: 12px;
  color: #49454f;
  background: #f3edf7;
  padding: 2px 10px;
  border-radius: 8px;
  letter-spacing: 0.25px;
}

.meta-chip.category {
  background: #e8def8;
  color: #6750a4;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.course-code {
  font-size: 12px;
  color: #79747e;
  font-family: monospace;
  letter-spacing: 0.5px;
}

.card-stats {
  display: flex;
  gap: 12px;
}

.stat {
  font-size: 12px;
  color: #79747e;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-top: 24px;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: #49454f;
  font-size: 14px;
  font-weight: 500;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-btn:hover:not(:disabled) {
  background: #e8def8;
}

.page-btn.active {
  background: #1a56db;
  color: #fff;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-dots {
  color: #79747e;
  font-size: 14px;
  padding: 0 4px;
}
</style>
