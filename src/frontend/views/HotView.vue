<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

interface Course {
  id: number
  course_code: string
  name: string
  category: string
  credits: number
  department_name: string
  teacher_name: string
  avg_rating: number | null
  rating_count: number
  comment_count: number
}

const router = useRouter()
const courses = ref<Course[]>([])
const loading = ref(true)

async function fetchHot() {
  loading.value = true
  try {
    const res = await fetch('/api/courses?sort=rating_count&limit=50')
    const data: { courses: Course[] } = await res.json()
    courses.value = data.courses.filter((c) => c.comment_count > 0 || c.rating_count > 0)
  } catch {
    // silent
  } finally {
    loading.value = false
  }
}

function goToCourse(id: number) {
  router.push(`/course/${id}`)
}

onMounted(fetchHot)
</script>

<template>
  <div class="hot-view">
    <h2 class="page-title">热门课程</h2>
    <p class="page-desc">按评价数量排序，看看大家都在讨论什么课</p>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="courses.length === 0" class="empty-state">
      <div class="empty-icon">&#x1F4AD;</div>
      <p>暂无热门课程，快去评价你上过的课吧</p>
      <RouterLink to="/all" class="md-btn md-btn-tonal">浏览全部课程</RouterLink>
    </div>

    <div v-else class="course-list">
      <div
        v-for="(course, index) in courses"
        :key="course.id"
        class="course-card elevation-1"
        @click="goToCourse(course.id)"
      >
        <div class="card-rank">{{ index + 1 }}</div>
        <div class="card-body">
          <div class="card-header">
            <h3 class="card-title">{{ course.name }}</h3>
            <div v-if="course.avg_rating" class="card-rating">
              <span class="star">&#9733;</span>
              <span class="score">{{ course.avg_rating }}</span>
            </div>
          </div>
          <div class="card-meta">
            <span class="meta-chip">{{ course.teacher_name || '未知教师' }}</span>
            <span class="meta-chip">{{ course.department_name }}</span>
            <span v-if="course.credits" class="meta-chip">{{ course.credits }}学分</span>
          </div>
          <div class="card-stats">
            <span class="stat">&#x1F4AC; {{ course.comment_count }} 条评论</span>
            <span class="stat">&#x2B50; {{ course.rating_count }} 人评分</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hot-view {
  padding-bottom: 24px;
}

.page-title {
  font-size: 22px;
  font-weight: 400;
  color: #1d1b20;
  margin-bottom: 4px;
  letter-spacing: 0.25px;
}

.page-desc {
  font-size: 14px;
  color: #49454f;
  margin-bottom: 24px;
  letter-spacing: 0.25px;
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
  margin-bottom: 16px;
}

.md-btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  letter-spacing: 0.5px;
}

.md-btn-tonal {
  background: #e8def8;
  color: #1d1b20;
}

.md-btn-tonal:hover {
  background: #d0bcff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 16px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.15s;
}

.course-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.card-rank {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #e8def8;
  color: #6750a4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.course-card:nth-child(1) .card-rank {
  background: #ffd700;
  color: #7b6100;
}

.course-card:nth-child(2) .card-rank {
  background: #c0c0c0;
  color: #555;
}

.course-card:nth-child(3) .card-rank {
  background: #cd7f32;
  color: #fff;
}

.card-body {
  flex: 1;
  min-width: 0;
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
  margin-bottom: 8px;
}

.meta-chip {
  font-size: 12px;
  color: #49454f;
  background: #f3edf7;
  padding: 2px 10px;
  border-radius: 8px;
  letter-spacing: 0.25px;
}

.card-stats {
  display: flex;
  gap: 16px;
}

.stat {
  font-size: 12px;
  color: #79747e;
  letter-spacing: 0.25px;
}
</style>
