// GET /api/courses/:id — 课程详情 + 评分统计 + 教师列表 + 评论列表（含子评论）

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string
  const db = context.env.DB

  // 课程基本信息
  const course = await db
    .prepare(
      `SELECT c.id, c.course_code, c.name, c.category,
              c.credits, c.hours,
              d.name AS department_name
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE c.id = ?`
    )
    .bind(id)
    .first()

  if (!course) {
    return Response.json({ error: '课程不存在' }, { status: 404 })
  }

  // 教师列表（多对多）
  const { results: teachers } = await db
    .prepare(
      `SELECT t.id, t.name
       FROM course_teachers ct
       JOIN teachers t ON ct.teacher_id = t.id
       WHERE ct.course_id = ?
       ORDER BY t.name`
    )
    .bind(id)
    .all()

  // 评分统计
  const ratingStats = await db
    .prepare(
      `SELECT COUNT(*) AS count, ROUND(AVG(score), 1) AS average
       FROM ratings WHERE course_id = ?`
    )
    .bind(id)
    .first()

  // 顶级评论（parent_id IS NULL）
  const { results: topComments } = await db
    .prepare(
      `SELECT id, nickname, content, created_at FROM comments
       WHERE course_id = ? AND parent_id IS NULL
       ORDER BY created_at DESC LIMIT 100`
    )
    .bind(id)
    .all()

  // 所有子评论
  const { results: replies } = await db
    .prepare(
      `SELECT id, parent_id, nickname, content, created_at FROM comments
       WHERE course_id = ? AND parent_id IS NOT NULL
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
    course,
    teachers,
    rating: {
      count: ratingStats?.count ?? 0,
      average: ratingStats?.average ?? 0,
    },
    comments,
  })
}
