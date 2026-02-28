// GET /api/courses/:id — 课程详情 + 评分统计 + 评论列表

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const db = context.env.DB

  // 课程基本信息（JOIN 院系 + 教师）
  const course = await db
    .prepare(
      `SELECT c.*, d.name AS department_name, t.name AS teacher_name, t.teacher_code
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN teachers t ON c.teacher_id = t.id
       WHERE c.id = ?`
    )
    .bind(id)
    .first()

  if (!course) {
    return Response.json({ error: '课程不存在' }, { status: 404 })
  }

  // 评分统计
  const ratingStats = await db
    .prepare(
      `SELECT COUNT(*) AS count, ROUND(AVG(score), 1) AS average
       FROM ratings WHERE course_id = ?`
    )
    .bind(id)
    .first()

  // 评论列表（按时间倒序）
  const { results: comments } = await db
    .prepare(
      `SELECT id, content, created_at FROM comments
       WHERE course_id = ? ORDER BY created_at DESC LIMIT 100`
    )
    .bind(id)
    .all()

  return Response.json({
    course,
    rating: {
      count: ratingStats?.count ?? 0,
      average: ratingStats?.average ?? 0,
    },
    comments,
  })
}
