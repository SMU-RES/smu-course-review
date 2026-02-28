// GET /api/courses — 课程列表（搜索、分页、院系筛选、排序）

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const db = context.env.DB

  const q = url.searchParams.get('q')?.trim() || ''
  const field = url.searchParams.get('field') || '' // name | code | '' (all fields)
  const deptId = url.searchParams.get('dept')
  const sort = url.searchParams.get('sort') || 'id' // id | rating_count | avg_rating
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[] = []

  if (q) {
    const like = `%${q}%`
    if (field === 'name') {
      conditions.push('c.name LIKE ?')
      params.push(like)
    } else {
      conditions.push(`(c.name LIKE ? OR c.course_code LIKE ? OR EXISTS (
        SELECT 1 FROM course_teachers ct2
        JOIN teachers t2 ON ct2.teacher_id = t2.id
        WHERE ct2.course_id = c.id AND t2.name LIKE ?
      ))`)
      params.push(like, like, like)
    }
  }

  if (deptId) {
    conditions.push('c.department_id = ?')
    params.push(deptId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 排序
  let orderBy = 'c.id ASC'
  if (sort === 'rating_count') {
    orderBy = 'c.comment_count DESC, c.id ASC'
  } else if (sort === 'avg_rating') {
    orderBy = 'c.avg_score DESC, c.id ASC'
  }

  // 总数
  const countResult = await db
    .prepare(
      `SELECT COUNT(*) AS total FROM courses c ${where}`
    )
    .bind(...params)
    .first()

  // 课程列表（使用预计算字段，无需 JOIN ratings）
  const { results: courses } = await db
    .prepare(
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
