<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface Teacher {
  id: string
  name: string
  department_name: string
}

interface Course {
  id: number
  course_code: string
  name: string
  category: string
  credits: number
  hours: number
  department_name: string
  avg_rating: number | null
  rating_count: number
  comment_count: number
}

const route = useRoute()
const router = useRouter()
const teacher = ref<Teacher | null>(null)
const courses = ref<Course[]>([])
const loading = ref(true)
const error = ref('')

async function fetchTeacher() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/teachers/${route.params.id}`)
    if (!res.ok) {
      error.value = '教师不存在'
      return
    }
    const data: { teacher: Teacher; courses: Course[] } = await res.json()
    teacher.value = data.teacher
    courses.value = data.courses
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

function goToCourse(id: number) {
  router.push(`/course/${id}`)
}

onMounted(fetchTeacher)
</script>

<template>
  <div class="teacher-view">
    <RouterLink to="/all" class="back-link">
      &#x276E; 返回课程列表
    </RouterLink>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>

    <template v-else-if="teacher">
      <!-- 教师信息卡片 -->
      <div class="md-card elevation-2">
        <div class="card-headline">
          <h2>{{ teacher.name }}</h2>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">院系</span>
            <span class="info-value">{{ teacher.department_name || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">教师编号</span>
            <span class="info-value mono">{{ teacher.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">授课数量</span>
            <span class="info-value">{{ courses.length }} 门</span>
          </div>
        </div>
      </div>

      <!-- 授课列表 -->
      <div class="md-card elevation-1">
        <h3 class="section-title">授课列表 ({{ courses.length }})</h3>

        <div v-if="courses.length === 0" class="empty-state">
          <p>暂无课程信息</p>
        </div>

        <div v-else class="course-list">
          <div
            v-for="course in courses"
            :key="course.id"
            class="course-card"
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
              <span class="meta-chip">{{ course.department_name }}</span>
              <span v-if="course.credits" class="meta-chip">{{ course.credits }}学分</span>
              <span v-if="course.category" class="meta-chip category">{{ course.category }}</span>
            </div>
            <div class="card-footer">
              <span class="course-code">{{ course.course_code }}</span>
              <div class="card-stats">
                <span v-if="course.comment_count > 0" class="stat">&#x1F4AC; {{ course.comment_count }}</span>
                <span v-if="course.rating_count > 0" class="stat">&#x2B50; {{ course.rating_count }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.teacher-view {
  padding-bottom: 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
  color: #1a56db;
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 20px;
  transition: background 0.2s;
  letter-spacing: 0.25px;
}

.back-link:hover {
  background: rgba(26, 86, 219, 0.08);
}

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

.error-state {
  text-align: center;
  padding: 60px 0;
  color: #b3261e;
  font-size: 14px;
}

/* MD 卡片 */
.md-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}

.card-headline {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.card-headline h2 {
  font-size: 22px;
  font-weight: 400;
  color: #1d1b20;
  letter-spacing: 0.25px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #1d1b20;
  margin-bottom: 16px;
  letter-spacing: 0.15px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: #79747e;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-weight: 500;
}

.info-value {
  font-size: 14px;
  color: #1d1b20;
}

.mono {
  font-family: monospace;
  letter-spacing: 0.5px;
}

/* 课程列表 */
.course-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-card {
  background: #f9f6fc;
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
  background: #e8def8;
  padding: 2px 10px;
  border-radius: 8px;
  letter-spacing: 0.25px;
}

.meta-chip.category {
  background: #d0bcff;
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

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #79747e;
  font-size: 14px;
}
</style>
