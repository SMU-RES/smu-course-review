// GET /api/courses — 课程列表（搜索、分页、院系筛选、排序）

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const db = context.env.DB

  const q = url.searchParams.get('q')?.trim() || ''
  const deptId = url.searchParams.get('dept')
  const sort = url.searchParams.get('sort') || 'id' // id | rating_count | avg_rating
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[] = []

  if (q) {
    conditions.push('(c.name LIKE ? OR t.name LIKE ? OR c.course_code LIKE ?)')
    const like = `%${q}%`
    params.push(like, like, like)
  }

  if (deptId) {
    conditions.push('c.department_id = ?')
    params.push(deptId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 排序
  let orderBy = 'c.id ASC'
  if (sort === 'rating_count') {
    orderBy = 'comment_count DESC, c.id ASC'
  } else if (sort === 'avg_rating') {
    orderBy = 'avg_rating DESC NULLS LAST, c.id ASC'
  }

  // 总数
  const countResult = await db
    .prepare(
      `SELECT COUNT(*) AS total FROM courses c
       LEFT JOIN teachers t ON c.teacher_id = t.id
       ${where}`
    )
    .bind(...params)
    .first()

  // 课程列表（含评分均值和评论数）
  const { results: courses } = await db
    .prepare(
      `SELECT c.id, c.course_code, c.name, c.category,
              c.credits, c.hours,
              d.name AS department_name,
              t.name AS teacher_name,
              ROUND(AVG(r.score), 1) AS avg_rating,
              COUNT(DISTINCT r.id) AS rating_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.course_id = c.id AND cm.parent_id IS NULL) AS comment_count
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       LEFT JOIN ratings r ON c.id = r.course_id
       ${where}
       GROUP BY c.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all()

  return Response.json({
    courses,
    total: (countResult?.total as number) ?? 0,
    page,
    limit,
  })
}
