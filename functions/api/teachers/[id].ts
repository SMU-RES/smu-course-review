// GET /api/teachers/:id — 教师详情 + 授课列表（含评分评论统计）

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const db = context.env.DB

  // 教师基本信息
  const teacher = await db
    .prepare(
      `SELECT t.id, t.name, d.name AS department_name
       FROM teachers t
       LEFT JOIN departments d ON t.department_id = d.id
       WHERE t.id = ?`
    )
    .bind(id)
    .first()

  if (!teacher) {
    return Response.json({ error: '教师不存在' }, { status: 404 })
  }

  // 教师的课程列表（含评分和评论统计）
  const { results: courses } = await db
    .prepare(
      `SELECT c.id, c.course_code, c.name, c.category,
              c.credits, c.hours,
              d.name AS department_name,
              ROUND(AVG(r.score), 1) AS avg_rating,
              COUNT(DISTINCT r.id) AS rating_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.course_id = c.id AND cm.parent_id IS NULL) AS comment_count
       FROM course_teachers ct
       JOIN courses c ON ct.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN ratings r ON c.id = r.course_id
       WHERE ct.teacher_id = ?
       GROUP BY c.id
       ORDER BY c.name`
    )
    .bind(id)
    .all()

  return Response.json({
    teacher,
    courses,
  })
}
