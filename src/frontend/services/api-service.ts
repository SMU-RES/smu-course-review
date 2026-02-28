// ApiService — 动态站实现，通过 fetch 调用 Worker API

import type {
  DataService,
  CourseListParams,
  CourseListItem,
  CourseDetail,
  TeacherBrief,
  TeacherListParams,
  TeacherListItem,
  TeacherDetail,
  RatingInfo,
  Comment,
} from './data-service'

export class ApiService implements DataService {
  async getCourses(params: CourseListParams): Promise<{ courses: CourseListItem[]; total: number }> {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.field) sp.set('field', params.field)
    if (params.dept) sp.set('dept', params.dept)
    if (params.sort) sp.set('sort', params.sort)
    if (params.page) sp.set('page', String(params.page))
    if (params.limit) sp.set('limit', String(params.limit))

    const res = await fetch(`/api/courses?${sp}`)
    const data: { courses: CourseListItem[]; total: number } = await res.json()
    return data
  }

  async getCourseDetail(id: number | string): Promise<{
    course: CourseDetail
    teachers: TeacherBrief[]
    rating: RatingInfo
    comments: Comment[]
  } | null> {
    const res = await fetch(`/api/courses/${id}`)
    if (!res.ok) return null
    return await res.json()
  }

  async getTeachers(params: TeacherListParams): Promise<{ teachers: TeacherListItem[]; total: number }> {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.sort) sp.set('sort', params.sort)
    if (params.page) sp.set('page', String(params.page))
    if (params.limit) sp.set('limit', String(params.limit))

    const res = await fetch(`/api/teachers?${sp}`)
    const data: { teachers: TeacherListItem[]; total: number } = await res.json()
    return data
  }

  async getTeacherDetail(id: string): Promise<{
    teacher: TeacherDetail
    courses: CourseListItem[]
    rating: RatingInfo
    comments: Comment[]
  } | null> {
    const res = await fetch(`/api/teachers/${id}`)
    if (!res.ok) return null
    return await res.json()
  }
}
