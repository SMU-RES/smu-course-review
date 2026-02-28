// GET /api/teachers/:id — 教师详情 + 授课列表 + 评分统计 + 评论列表

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

  // 教师评分统计
  const ratingStats = await db
    .prepare(
      `SELECT COUNT(*) AS count, ROUND(AVG(score), 1) AS average
       FROM teacher_ratings WHERE teacher_id = ?`
    )
    .bind(id)
    .first()

  // 教师顶级评论
  const { results: topComments } = await db
    .prepare(
      `SELECT id, nickname, content, created_at FROM teacher_comments
       WHERE teacher_id = ? AND parent_id IS NULL
       ORDER BY created_at DESC LIMIT 100`
    )
    .bind(id)
    .all()

  // 教师子评论
  const { results: replies } = await db
    .prepare(
      `SELECT id, parent_id, nickname, content, created_at FROM teacher_comments
       WHERE teacher_id = ? AND parent_id IS NOT NULL
       ORDER BY created_at ASC`
    )
    .bind(id)
    .all()

  // 组装评论树
  const replyMap = new Map<number, typeof replies>()
  for (const r of replies) {
    const pid = r.parent_id as number
    if (!replyMap.has(pid)) replyMap.set(pid, [])
    replyMap.get(pid)!.push(r)
  }

  const comments = topComments.map((c) => ({
    ...c,
    replies: replyMap.get(c.id as number) || [],
  }))

  return Response.json({
    teacher,
    courses,
    rating: {
      count: ratingStats?.count ?? 0,
      average: ratingStats?.average ?? 0,
    },
    comments,
  })
}
