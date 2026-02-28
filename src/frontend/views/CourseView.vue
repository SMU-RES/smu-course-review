<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

interface CourseDetail {
  id: number
  course_code: string
  course_seq: string
  name: string
  category: string
  department_name: string
  teacher_name: string
  teacher_code: string
  class_name: string
  enrolled: number
  capacity: number
  credits: number
  hours: number
}

interface Comment {
  id: number
  content: string
  created_at: string
}

const route = useRoute()
const course = ref<CourseDetail | null>(null)
const comments = ref<Comment[]>([])
const ratingInfo = ref({ count: 0, average: 0 })
const loading = ref(true)
const error = ref('')

// 评分
const userScore = ref(0)
const hoverScore = ref(0)
const ratingSubmitting = ref(false)
const ratingMessage = ref('')

// 评论
const commentContent = ref('')
const commentSubmitting = ref(false)
const commentMessage = ref('')

async function fetchCourse() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`/api/courses/${route.params.id}`)
    if (!res.ok) {
      error.value = '课程不存在'
      return
    }
    const data: { course: CourseDetail; rating: typeof ratingInfo.value; comments: Comment[] } = await res.json()
    course.value = data.course
    ratingInfo.value = data.rating
    comments.value = data.comments
  } catch (e) {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

async function submitRating() {
  if (!userScore.value || ratingSubmitting.value) return
  ratingSubmitting.value = true
  ratingMessage.value = ''
  try {
    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: Number(route.params.id),
        score: userScore.value,
      }),
    })
    const data: { success?: boolean; error?: string } = await res.json()
    if (data.success) {
      ratingMessage.value = '评分成功'
      fetchCourse()
    } else {
      ratingMessage.value = data.error || '评分失败'
    }
  } catch {
    ratingMessage.value = '网络错误'
  } finally {
    ratingSubmitting.value = false
  }
}

async function submitComment() {
  if (!commentContent.value.trim() || commentSubmitting.value) return
  commentSubmitting.value = true
  commentMessage.value = ''
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: Number(route.params.id),
        content: commentContent.value.trim(),
      }),
    })
    const data: { success?: boolean; error?: string } = await res.json()
    if (data.success) {
      commentMessage.value = '评论成功'
      commentContent.value = ''
      fetchCourse()
    } else {
      commentMessage.value = data.error || '评论失败'
    }
  } catch {
    commentMessage.value = '网络错误'
  } finally {
    commentSubmitting.value = false
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(fetchCourse)
</script>

<template>
  <div class="course-view">
    <RouterLink to="/" class="back">&larr; 返回课程列表</RouterLink>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else-if="course">
      <!-- 课程信息卡片 -->
      <div class="info-card">
        <h2>{{ course.name }}</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">教师</span>
            <span>{{ course.teacher_name || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">院系</span>
            <span>{{ course.department_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">课程号</span>
            <span class="mono">{{ course.course_code }}</span>
          </div>
          <div class="info-item">
            <span class="label">学分</span>
            <span>{{ course.credits }}</span>
          </div>
          <div class="info-item">
            <span class="label">学时</span>
            <span>{{ course.hours }}</span>
          </div>
          <div class="info-item">
            <span class="label">人数</span>
            <span>{{ course.enrolled }} / {{ course.capacity }}</span>
          </div>
          <div v-if="course.category" class="info-item">
            <span class="label">类型</span>
            <span>{{ course.category }}</span>
          </div>
          <div v-if="course.class_name" class="info-item">
            <span class="label">行政班</span>
            <span>{{ course.class_name }}</span>
          </div>
        </div>
      </div>

      <!-- 评分区域 -->
      <div class="section-card">
        <h3>课程评分</h3>
        <div class="rating-summary">
          <span class="big-score">{{ ratingInfo.average || '-' }}</span>
          <span class="rating-label">
            / 5 分 ({{ ratingInfo.count }} 人评价)
          </span>
        </div>
        <div class="rating-input">
          <span class="rate-label">我的评分：</span>
          <div class="stars">
            <span
              v-for="star in 5"
              :key="star"
              class="star"
              :class="{ filled: star <= (hoverScore || userScore) }"
              @mouseenter="hoverScore = star"
              @mouseleave="hoverScore = 0"
              @click="userScore = star"
            >
              &#9733;
            </span>
          </div>
          <button
            class="btn btn-primary btn-sm"
            :disabled="!userScore || ratingSubmitting"
            @click="submitRating"
          >
            {{ ratingSubmitting ? '提交中...' : '提交评分' }}
          </button>
        </div>
        <div v-if="ratingMessage" class="msg">{{ ratingMessage }}</div>
      </div>

      <!-- 评论区域 -->
      <div class="section-card">
        <h3>课程评价 ({{ comments.length }})</h3>

        <!-- 评论表单 -->
        <div class="comment-form">
          <textarea
            v-model="commentContent"
            placeholder="分享你的课程体验...（限500字）"
            maxlength="500"
            rows="3"
          ></textarea>
          <div class="comment-actions">
            <span class="char-count">{{ commentContent.length }} / 500</span>
            <button
              class="btn btn-primary"
              :disabled="!commentContent.trim() || commentSubmitting"
              @click="submitComment"
            >
              {{ commentSubmitting ? '提交中...' : '提交评论' }}
            </button>
          </div>
          <div v-if="commentMessage" class="msg">{{ commentMessage }}</div>
        </div>

        <!-- 评论列表 -->
        <div class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-content">{{ comment.content }}</div>
            <div class="comment-time">{{ formatDate(comment.created_at) }}</div>
          </div>
          <div v-if="comments.length === 0" class="empty">
            暂无评价，来做第一个评价的人吧
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}

.back:hover {
  color: #1a56db;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #999;
}

.error {
  color: #ef4444;
}

.info-card,
.section-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid #eee;
}

.info-card h2 {
  font-size: 20px;
  margin-bottom: 16px;
  color: #333;
}

.section-card h3 {
  font-size: 16px;
  margin-bottom: 14px;
  color: #333;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.info-item {
  font-size: 14px;
}

.info-item .label {
  color: #999;
  margin-right: 8px;
}

.mono {
  font-family: monospace;
}

/* 评分 */
.rating-summary {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 14px;
}

.big-score {
  font-size: 32px;
  font-weight: 700;
  color: #f59e0b;
}

.rating-label {
  font-size: 14px;
  color: #999;
}

.rating-input {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.rate-label {
  font-size: 14px;
  color: #666;
}

.stars {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 24px;
  cursor: pointer;
  color: #ddd;
  transition: color 0.15s;
  user-select: none;
}

.star.filled {
  color: #f59e0b;
}

/* 按钮 */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  transition: opacity 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #1a56db;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #1447b5;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.msg {
  margin-top: 8px;
  font-size: 13px;
  color: #10b981;
}

/* 评论 */
.comment-form {
  margin-bottom: 20px;
}

.comment-form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  resize: vertical;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
}

.comment-form textarea:focus {
  border-color: #1a56db;
  box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1);
}

.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.char-count {
  font-size: 12px;
  color: #999;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.comment-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-time {
  margin-top: 6px;
  font-size: 12px;
  color: #aaa;
}

.empty {
  text-align: center;
  padding: 30px;
  color: #999;
  font-size: 14px;
}
</style>
