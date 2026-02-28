<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

interface Course {
  id: number
  course_code: string
  name: string
  category: string
  department_name: string
  teacher_name: string
  credits: number
  avg_rating: number | null
  rating_count: number
}

interface Department {
  id: number
  name: string
  course_count: number
}

const router = useRouter()
const courses = ref<Course[]>([])
const departments = ref<Department[]>([])
const searchQuery = ref('')
const selectedDept = ref('')
const currentPage = ref(1)
const totalCourses = ref(0)
const loading = ref(false)
const pageSize = 20

async function fetchCourses() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchQuery.value) params.set('q', searchQuery.value)
    if (selectedDept.value) params.set('dept', selectedDept.value)
    params.set('page', String(currentPage.value))
    params.set('limit', String(pageSize))

    const res = await fetch(`/api/courses?${params}`)
    const data: { courses: Course[]; total: number } = await res.json()
    courses.value = data.courses
    totalCourses.value = data.total
  } catch (e) {
    console.error('获取课程失败:', e)
  } finally {
    loading.value = false
  }
}

async function fetchDepartments() {
  try {
    const res = await fetch('/api/departments')
    const data: { departments: Department[] } = await res.json()
    departments.value = data.departments
  } catch (e) {
    console.error('获取院系失败:', e)
  }
}

function goToCourse(id: number) {
  router.push(`/course/${id}`)
}

// 搜索防抖
let debounceTimer: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchCourses()
  }, 300)
})

watch(selectedDept, () => {
  currentPage.value = 1
  fetchCourses()
})

const totalPages = () => Math.ceil(totalCourses.value / pageSize)

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchCourses()
  }
}

function nextPage() {
  if (currentPage.value < totalPages()) {
    currentPage.value++
    fetchCourses()
  }
}

onMounted(() => {
  fetchCourses()
  fetchDepartments()
})
</script>

<template>
  <div class="home">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索课程名、教师名、课程号..."
        class="search-input"
      />
    </div>

    <!-- 院系筛选 -->
    <div class="dept-filter">
      <button
        :class="['dept-btn', { active: selectedDept === '' }]"
        @click="selectedDept = ''"
      >
        全部
      </button>
      <button
        v-for="dept in departments"
        :key="dept.id"
        :class="['dept-btn', { active: selectedDept === String(dept.id) }]"
        @click="selectedDept = String(dept.id)"
      >
        {{ dept.name }} ({{ dept.course_count }})
      </button>
    </div>

    <!-- 统计信息 -->
    <div class="stats">
      共 <strong>{{ totalCourses }}</strong> 门课程
      <span v-if="searchQuery"> — 搜索: "{{ searchQuery }}"</span>
    </div>

    <!-- 课程列表 -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="course-list">
      <div
        v-for="course in courses"
        :key="course.id"
        class="course-card"
        @click="goToCourse(course.id)"
      >
        <div class="course-header">
          <span class="course-name">{{ course.name }}</span>
          <span v-if="course.avg_rating" class="course-rating">
            {{ course.avg_rating }} 分
          </span>
        </div>
        <div class="course-meta">
          <span v-if="course.teacher_name">{{ course.teacher_name }}</span>
          <span>{{ course.department_name }}</span>
          <span v-if="course.credits">{{ course.credits }} 学分</span>
          <span v-if="course.category" class="tag">{{ course.category }}</span>
        </div>
        <div class="course-code">{{ course.course_code }}</div>
      </div>

      <div v-if="courses.length === 0 && !loading" class="empty">
        没有找到匹配的课程
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages() > 1" class="pagination">
      <button :disabled="currentPage <= 1" @click="prevPage">上一页</button>
      <span>{{ currentPage }} / {{ totalPages() }}</span>
      <button :disabled="currentPage >= totalPages()" @click="nextPage">下一页</button>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #1a56db;
  box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.1);
}

.dept-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  max-height: 120px;
  overflow-y: auto;
}

.dept-btn {
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: #fff;
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  transition: all 0.2s;
}

.dept-btn:hover {
  border-color: #1a56db;
  color: #1a56db;
}

.dept-btn.active {
  background: #1a56db;
  color: #fff;
  border-color: #1a56db;
}

.stats {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #999;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.course-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  cursor: pointer;
  transition: box-shadow 0.2s;
  border: 1px solid #eee;
}

.course-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.course-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.course-rating {
  font-size: 14px;
  font-weight: 600;
  color: #f59e0b;
}

.course-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}

.course-meta span:not(:last-child)::after {
  content: ' · ';
  color: #ccc;
}

.tag {
  padding: 1px 6px;
  background: #f0f5ff;
  color: #1a56db;
  border-radius: 4px;
  font-size: 12px;
}

.tag::after {
  content: '' !important;
}

.course-code {
  font-size: 12px;
  color: #aaa;
  font-family: monospace;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 12px 0;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  color: #333;
}

.pagination button:hover:not(:disabled) {
  border-color: #1a56db;
  color: #1a56db;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination span {
  font-size: 14px;
  color: #666;
}
</style>
