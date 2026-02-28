// DataService 抽象层 — 动态站和静态站共用接口

export interface CourseListItem {
  id: number
  course_code: string
  name: string
  category: string
  credits: number
  hours: number
  department_name: string
  teacher_names: string | null
  avg_rating: number | null
  rating_count: number
  comment_count: number
}

export interface CourseDetail {
  id: number
  course_code: string
  name: string
  category: string
  department_name: string
  credits: number
  hours: number
}

export interface TeacherBrief {
  id: string
  name: string
}

export interface TeacherListItem {
  id: string
  name: string
  department_name: string
  course_count: number
  avg_rating: number | null
  rating_count: number
  comment_count: number
}

export interface TeacherDetail {
  id: string
  name: string
  department_name: string
}

export interface Reply {
  id: number
  parent_id: number
  nickname: string
  content: string
  created_at: string
}

export interface Comment {
  id: number
  nickname: string
  content: string
  created_at: string
  replies: Reply[]
}

export interface RatingInfo {
  count: number
  average: number
}

export interface CourseListParams {
  q?: string
  dept?: string
  sort?: string
  page?: number
  limit?: number
}

export interface TeacherListParams {
  q?: string
  sort?: string
  page?: number
  limit?: number
}

export interface DataService {
  getCourses(params: CourseListParams): Promise<{ courses: CourseListItem[]; total: number }>
  getCourseDetail(id: number | string): Promise<{
    course: CourseDetail
    teachers: TeacherBrief[]
    rating: RatingInfo
    comments: Comment[]
  } | null>
  getTeachers(params: TeacherListParams): Promise<{ teachers: TeacherListItem[]; total: number }>
  getTeacherDetail(id: string): Promise<{
    teacher: TeacherDetail
    courses: CourseListItem[]
    rating: RatingInfo
    comments: Comment[]
  } | null>
}

export function isStaticMode(): boolean {
  return import.meta.env.VITE_STATIC_MODE === 'true'
}

let _service: DataService | null = null

export async function getDataService(): Promise<DataService> {
  if (_service) return _service

  if (isStaticMode()) {
    const { StaticService } = await import('./static-service')
    const svc = new StaticService()
    await svc.init()
    _service = svc
  } else {
    const { ApiService } = await import('./api-service')
    _service = new ApiService()
  }

  return _service
}
