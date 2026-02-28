// GET /api/teachers — 教师列表（搜索、分页、排序）

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const db = context.env.DB

  const q = url.searchParams.get('q')?.trim() || ''
  const sort = url.searchParams.get('sort') || 'name'
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[] = []

  if (q) {
    conditions.push('t.name LIKE ?')
    params.push(`%${q}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  let orderBy = 't.name ASC'
  if (sort === 'rating_count') {
    orderBy = 't.comment_count DESC, t.name ASC'
  }

  const countResult = await db
    .prepare(`SELECT COUNT(*) AS total FROM teachers t ${where}`)
    .bind(...params)
    .first()

  const { results: teachers } = await db
    .prepare(
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
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all()

  return Response.json({
    teachers,
    total: (countResult?.total as number) ?? 0,
    page,
    limit,
  })
}
