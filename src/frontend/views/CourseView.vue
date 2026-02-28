<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDataService, isStaticMode, type CourseDetail, type TeacherBrief, type Comment, type RatingInfo } from '@/services/data-service'

const route = useRoute()
const router = useRouter()
const staticMode = isStaticMode()
const course = ref<CourseDetail | null>(null)
const teachers = ref<TeacherBrief[]>([])
const comments = ref<Comment[]>([])
const ratingInfo = ref<RatingInfo>({ count: 0, average: 0 })
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

// 子评论
const replyingTo = ref<number | null>(null)
const replyContent = ref('')
const replySubmitting = ref(false)
const replyMessage = ref('')

async function fetchCourse() {
  loading.value = true
  error.value = ''
  try {
    const svc = await getDataService()
    const data = await svc.getCourseDetail(route.params.id as string)
    if (!data) {
      error.value = '课程不存在'
      return
    }
    course.value = data.course
    teachers.value = data.teachers
    ratingInfo.value = data.rating
    comments.value = data.comments
  } catch {
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

async function submitReply(parentId: number) {
  if (!replyContent.value.trim() || replySubmitting.value) return
  replySubmitting.value = true
  replyMessage.value = ''
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: Number(route.params.id),
        content: replyContent.value.trim(),
        parent_id: parentId,
      }),
    })
    const data: { success?: boolean; error?: string } = await res.json()
    if (data.success) {
      replyContent.value = ''
      replyingTo.value = null
      fetchCourse()
    } else {
      replyMessage.value = data.error || '回复失败'
    }
  } catch {
    replyMessage.value = '网络错误'
  } finally {
    replySubmitting.value = false
  }
}

function toggleReply(commentId: number) {
  if (replyingTo.value === commentId) {
    replyingTo.value = null
    replyContent.value = ''
  } else {
    replyingTo.value = commentId
    replyContent.value = ''
    replyMessage.value = ''
  }
}

function goToTeacher(id: string) {
  router.push(`/teacher/${id}`)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(fetchCourse)
</script>

<template>
  <div class="course-view">
    <RouterLink to="/all" class="back-link">
      &#x276E; 返回课程列表
    </RouterLink>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>

    <template v-else-if="course">
      <!-- 课程信息卡片 -->
      <div class="md-card elevation-2">
        <div class="card-headline">
          <h2>{{ course.name }}</h2>
          <span v-if="course.category" class="category-chip">{{ course.category }}</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">教师</span>
            <span class="info-value" v-if="teachers.length > 0">
              <template v-for="(t, i) in teachers" :key="t.id">
                <a class="teacher-link" @click.stop="goToTeacher(t.id)">{{ t.name }}</a>
                <span v-if="i < teachers.length - 1">、</span>
              </template>
            </span>
            <span class="info-value" v-else>未知</span>
          </div>
          <div class="info-item">
            <span class="info-label">院系</span>
            <span class="info-value">{{ course.department_name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">课程号</span>
            <span class="info-value mono">{{ course.course_code }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">学分</span>
            <span class="info-value">{{ course.credits }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">学时</span>
            <span class="info-value">{{ course.hours }}</span>
          </div>
        </div>
      </div>

      <!-- 评分区域 -->
      <div class="md-card elevation-1">
        <h3 class="section-title">课程评分</h3>
        <div class="rating-display">
          <span class="big-score">{{ ratingInfo.average || '-' }}</span>
          <div class="rating-detail">
            <span class="rating-max">/ 5 分</span>
            <span class="rating-count">{{ ratingInfo.count }} 人评价</span>
          </div>
        </div>
        <div v-if="!staticMode" class="rating-input">
          <span class="rate-label">我的评分</span>
          <div class="stars">
            <span
              v-for="star in 5"
              :key="star"
              class="star"
              :class="{ filled: star <= (hoverScore || userScore) }"
              @mouseenter="hoverScore = star"
              @mouseleave="hoverScore = 0"
              @click="userScore = star"
            >&#9733;</span>
          </div>
          <button
            class="md-btn md-btn-filled"
            :disabled="!userScore || ratingSubmitting"
            @click="submitRating"
          >
            {{ ratingSubmitting ? '提交中...' : '提交' }}
          </button>
        </div>
        <div v-if="ratingMessage" class="feedback-msg success">{{ ratingMessage }}</div>
      </div>

      <!-- 评论区域 -->
      <div class="md-card elevation-1">
        <h3 class="section-title">课程评价 ({{ comments.length }})</h3>

        <!-- 评论表单 -->
        <div v-if="!staticMode" class="comment-form">
          <div class="form-field">
            <textarea
              v-model="commentContent"
              placeholder="分享你的课程体验...（限100字）"
              maxlength="100"
              rows="3"
            ></textarea>
            <span class="char-counter">{{ commentContent.length }} / 100</span>
          </div>
          <div class="form-actions">
            <button
              class="md-btn md-btn-filled"
              :disabled="!commentContent.trim() || commentSubmitting"
              @click="submitComment"
            >
              {{ commentSubmitting ? '提交中...' : '发表评论' }}
            </button>
          </div>
          <div v-if="commentMessage" class="feedback-msg success">{{ commentMessage }}</div>
        </div>

        <!-- 评论列表 -->
        <div class="comment-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-thread">
            <!-- 主评论 -->
            <div class="comment-item">
              <div class="comment-avatar">{{ comment.nickname.charAt(0) }}</div>
              <div class="comment-body">
                <div class="comment-header">
                  <span class="comment-nickname">{{ comment.nickname }}</span>
                  <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
                </div>
                <p class="comment-text">{{ comment.content }}</p>
                <button v-if="!staticMode" class="reply-toggle" @click="toggleReply(comment.id)">
                  {{ replyingTo === comment.id ? '取消回复' : '回复' }}
                </button>
              </div>
            </div>

            <!-- 子评论列表 -->
            <div v-if="comment.replies.length > 0" class="replies">
              <div v-for="reply in comment.replies" :key="reply.id" class="comment-item reply">
                <div class="comment-avatar small">{{ reply.nickname.charAt(0) }}</div>
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-nickname">{{ reply.nickname }}</span>
                    <span class="comment-time">{{ formatDate(reply.created_at) }}</span>
                  </div>
                  <p class="comment-text">{{ reply.content }}</p>
                </div>
              </div>
            </div>

            <!-- 回复表单 -->
            <div v-if="replyingTo === comment.id" class="reply-form">
              <div class="form-field compact">
                <textarea
                  v-model="replyContent"
                  placeholder="写下你的回复...（限100字）"
                  maxlength="100"
                  rows="2"
                ></textarea>
                <span class="char-counter">{{ replyContent.length }} / 100</span>
              </div>
              <div class="form-actions">
                <button class="md-btn md-btn-text" @click="replyingTo = null">取消</button>
                <button
                  class="md-btn md-btn-tonal"
                  :disabled="!replyContent.trim() || replySubmitting"
                  @click="submitReply(comment.id)"
                >
                  {{ replySubmitting ? '提交中...' : '回复' }}
                </button>
              </div>
              <div v-if="replyMessage" class="feedback-msg error">{{ replyMessage }}</div>
            </div>
          </div>

          <div v-if="comments.length === 0" class="empty-comments">
            <div class="empty-icon">&#x1F4AC;</div>
            <p>{{ staticMode ? '暂无评价' : '暂无评价，来做第一个评价的人吧' }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.course-view {
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

/* 加载/错误 */
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

.category-chip {
  flex-shrink: 0;
  font-size: 12px;
  background: #e8def8;
  color: #6750a4;
  padding: 4px 12px;
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 0.25px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: #1d1b20;
  margin-bottom: 16px;
  letter-spacing: 0.15px;
}

/* 信息网格 */
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

.teacher-link {
  color: #1a56db;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}

.teacher-link:hover {
  text-decoration: underline;
}

/* 评分 */
.rating-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
}

.big-score {
  font-size: 36px;
  font-weight: 300;
  color: #f59e0b;
  line-height: 1;
}

.rating-detail {
  display: flex;
  flex-direction: column;
}

.rating-max {
  font-size: 14px;
  color: #79747e;
}

.rating-count {
  font-size: 12px;
  color: #aeaaae;
}

.rating-input {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rate-label {
  font-size: 14px;
  color: #49454f;
  font-weight: 500;
}

.stars {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 28px;
  cursor: pointer;
  color: #d9d3df;
  transition: color 0.15s, transform 0.15s;
  user-select: none;
}

.star:hover {
  transform: scale(1.1);
}

.star.filled {
  color: #f59e0b;
}

/* MD 按钮 */
.md-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.md-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.md-btn-filled {
  background: #1a56db;
  color: #fff;
}

.md-btn-filled:hover:not(:disabled) {
  background: #1447b5;
  box-shadow: 0 1px 3px rgba(26, 86, 219, 0.3);
}

.md-btn-tonal {
  background: #e8def8;
  color: #1d1b20;
}

.md-btn-tonal:hover:not(:disabled) {
  background: #d0bcff;
}

.md-btn-text {
  background: transparent;
  color: #1a56db;
}

.md-btn-text:hover {
  background: rgba(26, 86, 219, 0.08);
}

.feedback-msg {
  margin-top: 8px;
  font-size: 13px;
  letter-spacing: 0.25px;
}

.feedback-msg.success {
  color: #1b873a;
}

.feedback-msg.error {
  color: #b3261e;
}

/* 评论表单 */
.comment-form {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e7e0ec;
}

.form-field {
  position: relative;
  margin-bottom: 8px;
}

.form-field textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #c4c0c9;
  border-radius: 12px;
  resize: vertical;
  outline: none;
  font-size: 14px;
  line-height: 1.5;
  color: #1d1b20;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-field textarea:focus {
  border-color: #1a56db;
  box-shadow: 0 0 0 1px #1a56db;
}

.form-field textarea::placeholder {
  color: #79747e;
}

.form-field.compact textarea {
  padding: 10px 14px;
  font-size: 13px;
}

.char-counter {
  position: absolute;
  right: 12px;
  bottom: 8px;
  font-size: 11px;
  color: #aeaaae;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 评论列表 */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.comment-thread {
  padding: 16px 0;
  border-bottom: 1px solid #f3edf7;
}

.comment-thread:last-child {
  border-bottom: none;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e8def8;
  color: #6750a4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.comment-avatar.small {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.comment-nickname {
  font-size: 13px;
  font-weight: 500;
  color: #1d1b20;
}

.comment-time {
  font-size: 12px;
  color: #aeaaae;
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: #49454f;
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-toggle {
  background: none;
  border: none;
  color: #1a56db;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 0;
  cursor: pointer;
  letter-spacing: 0.25px;
  margin-top: 4px;
}

.reply-toggle:hover {
  text-decoration: underline;
}

/* 子评论 */
.replies {
  margin-left: 48px;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 16px;
  border-left: 2px solid #e8def8;
}

.reply-form {
  margin-left: 48px;
  margin-top: 12px;
  padding: 12px;
  background: #f9f6fc;
  border-radius: 12px;
}

/* 空评论 */
.empty-comments {
  text-align: center;
  padding: 40px 0;
  color: #79747e;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.empty-comments p {
  font-size: 14px;
}
</style>
