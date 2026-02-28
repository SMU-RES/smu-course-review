// StaticService — 静态站实现，使用 sql.js (SQLite WASM) 在客户端本地查询

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
  Reply,
} from './data-service'
import initSqlJs, { type Database } from 'sql.js'

export class StaticService implements DataService {
  private db: Database | null = null

  async init(): Promise<void> {
    if (this.db) return

    // 手动 fetch WASM 二进制，通过 wasmBinary 传入，绕过 MIME 类型检查
    const wasmResponse = await fetch('/lib/sql-wasm.wasm')
    const wasmBinary = await wasmResponse.arrayBuffer()

    const SQL = await initSqlJs({ wasmBinary })

    const response = await fetch('/data/db.sqlite')
    const buffer = await response.arrayBuffer()
    this.db = new SQL.Database(new Uint8Array(buffer))
  }

  private query<T>(sql: string, params: unknown[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare(sql)
    stmt.bind(params as (string | number | null | Uint8Array)[])
    const results: T[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T)
    }
    stmt.free()
    return results
  }

  private queryFirst<T>(sql: string, params: unknown[] = []): T | null {
    const results = this.query<T>(sql, params)
    return results.length > 0 ? results[0] : null
  }

  async getCourses(params: CourseListParams): Promise<{ courses: CourseListItem[]; total: number }> {
    const q = params.q?.trim() || ''
    const field = params.field || ''
    const sort = params.sort || 'id'
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(50, Math.max(1, params.limit || 20))
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const sqlParams: unknown[] = []

    if (q) {
      const like = `%${q}%`
      if (field === 'name') {
        conditions.push('c.name LIKE ?')
        sqlParams.push(like)
      } else {
        conditions.push(`(c.name LIKE ? OR c.course_code LIKE ? OR EXISTS (
          SELECT 1 FROM course_teachers ct2
          JOIN teachers t2 ON ct2.teacher_id = t2.id
          WHERE ct2.course_id = c.id AND t2.name LIKE ?
        ))`)
        sqlParams.push(like, like, like)
      }
    }

    if (params.dept) {
      conditions.push('c.department_id = ?')
      sqlParams.push(params.dept)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    let orderBy = 'c.id ASC'
    if (sort === 'rating_count') {
      orderBy = 'c.comment_count DESC, c.id ASC'
    } else if (sort === 'avg_rating') {
      orderBy = 'c.avg_score DESC, c.id ASC'
    }

    const countResult = this.queryFirst<{ total: number }>(
      `SELECT COUNT(*) AS total FROM courses c ${where}`,
      sqlParams
    )

    const courses = this.query<CourseListItem>(
      `SELECT c.id, c.course_code, c.name, c.category,
              c.credits, c.hours,
              d.name AS department_name,
              (SELECT GROUP_CONCAT(t.name, ', ')
               FROM course_teachers ct
               JOIN teachers t ON ct.teacher_id = t.id
               WHERE ct.course_id = c.id) AS teacher_names,
              c.avg_score AS avg_rating,
              c.rating_count,
              c.comment_count
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...sqlParams, limit, offset]
    )

    return {
      courses,
      total: countResult?.total ?? 0,
    }
  }

  async getCourseDetail(id: number | string): Promise<{
    course: CourseDetail
    teachers: TeacherBrief[]
    rating: RatingInfo
    comments: Comment[]
  } | null> {
    const course = this.queryFirst<CourseDetail & { avg_score: number; rating_count: number }>(
      `SELECT c.id, c.course_code, c.name, c.category,
              c.credits, c.hours,
              d.name AS department_name,
              c.avg_score, c.rating_count
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE c.id = ?`,
      [id]
    )

    if (!course) return null

    const teachers = this.query<TeacherBrief>(
      `SELECT t.id, t.name
       FROM course_teachers ct
       JOIN teachers t ON ct.teacher_id = t.id
       WHERE ct.course_id = ?
       ORDER BY t.name`,
      [id]
    )

    const topComments = this.query<{ id: number; nickname: string; content: string; created_at: string }>(
      `SELECT id, nickname, content, created_at FROM comments
       WHERE course_id = ? AND parent_id IS NULL
       ORDER BY created_at DESC`,
      [id]
    )

    const replies = this.query<Reply>(
      `SELECT id, parent_id, nickname, content, created_at FROM comments
       WHERE course_id = ? AND parent_id IS NOT NULL
       ORDER BY created_at ASC`,
      [id]
    )

    const replyMap = new Map<number, Reply[]>()
    for (const r of replies) {
      const pid = r.parent_id
      if (!replyMap.has(pid)) replyMap.set(pid, [])
      replyMap.get(pid)!.push(r)
    }

    const comments: Comment[] = topComments.map((c) => ({
      ...c,
      replies: replyMap.get(c.id) || [],
    }))

    return {
      course,
      teachers,
      rating: {
        count: course.rating_count ?? 0,
        average: course.avg_score ?? 0,
      },
      comments,
    }
  }

  async getTeachers(params: TeacherListParams): Promise<{ teachers: TeacherListItem[]; total: number }> {
    const q = params.q?.trim() || ''
    const sort = params.sort || 'name'
    const page = Math.max(1, params.page || 1)
    const limit = Math.min(50, Math.max(1, params.limit || 20))
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const sqlParams: unknown[] = []

    if (q) {
      conditions.push('t.name LIKE ?')
      sqlParams.push(`%${q}%`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    let orderBy = 't.name ASC'
    if (sort === 'rating_count') {
      orderBy = 't.comment_count DESC, t.name ASC'
    }

    const countResult = this.queryFirst<{ total: number }>(
      `SELECT COUNT(*) AS total FROM teachers t ${where}`,
      sqlParams
    )

    const teachers = this.query<TeacherListItem>(
      `SELECT t.id, t.name,
              d.name AS department_name,
              (SELECT COUNT(DISTINCT ct.course_id) FROM course_teachers ct WHERE ct.teacher_id = t.id) AS course_count,
              t.avg_score AS avg_rating,
              t.rating_count,
              t.comment_count
       FROM teachers t
       LEFT JOIN departments d ON t.department_id = d.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...sqlParams, limit, offset]
    )

    return {
      teachers,
      total: countResult?.total ?? 0,
    }
  }

  async getTeacherDetail(id: string): Promise<{
    teacher: TeacherDetail
    courses: CourseListItem[]
    rating: RatingInfo
    comments: Comment[]
  } | null> {
    const teacher = this.queryFirst<TeacherDetail & { avg_score: number; rating_count: number }>(
      `SELECT t.id, t.name, d.name AS department_name,
              t.avg_score, t.rating_count
       FROM teachers t
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.id = ?`,
      [id]
    )

    if (!teacher) return null

    const courses = this.query<CourseListItem>(
      `SELECT c.id, c.course_code, c.name, c.category,
              c.credits, c.hours,
              d.name AS department_name,
              c.avg_score AS avg_rating,
              c.rating_count,
              c.comment_count
       FROM course_teachers ct
       JOIN courses c ON ct.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE ct.teacher_id = ?
       ORDER BY c.name`,
      [id]
    )

    const topComments = this.query<{ id: number; nickname: string; content: string; created_at: string }>(
      `SELECT id, nickname, content, created_at FROM teacher_comments
       WHERE teacher_id = ? AND parent_id IS NULL
       ORDER BY created_at DESC`,
      [id]
    )

    const replies = this.query<Reply>(
      `SELECT id, parent_id, nickname, content, created_at FROM teacher_comments
       WHERE teacher_id = ? AND parent_id IS NOT NULL
       ORDER BY created_at ASC`,
      [id]
    )

    const replyMap = new Map<number, Reply[]>()
    for (const r of replies) {
      const pid = r.parent_id
      if (!replyMap.has(pid)) replyMap.set(pid, [])
      replyMap.get(pid)!.push(r)
    }

    const comments: Comment[] = topComments.map((c) => ({
      ...c,
      replies: replyMap.get(c.id) || [],
    }))

    return {
      teacher,
      courses,
      rating: {
        count: teacher.rating_count ?? 0,
        average: teacher.avg_score ?? 0,
      },
      comments,
    }
  }
}
