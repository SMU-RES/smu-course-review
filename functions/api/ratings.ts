// POST /api/ratings — 提交评分

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB

  let body: { course_id?: number; score?: number }
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { course_id, score } = body

  if (!course_id || score == null) {
    return Response.json({ error: '课程ID和评分不能为空' }, { status: 400 })
  }

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return Response.json({ error: '评分必须为1-5的整数' }, { status: 400 })
  }

  // 检查课程是否存在
  const course = await db
    .prepare('SELECT id FROM courses WHERE id = ?')
    .bind(course_id)
    .first()

  if (!course) {
    return Response.json({ error: '课程不存在' }, { status: 404 })
  }

  // MVP 阶段：user_id = 0，UNIQUE(course_id, user_id) 约束意味着匿名只能评一次
  // 使用 INSERT OR REPLACE 允许更新评分
  try {
    await db
      .prepare(
        `INSERT INTO ratings (course_id, user_id, score)
         VALUES (?, 0, ?)
         ON CONFLICT(course_id, user_id) DO UPDATE SET score = excluded.score`
      )
      .bind(course_id, score)
      .run()
  } catch {
    return Response.json({ error: '评分提交失败' }, { status: 500 })
  }

  return Response.json({ success: true, message: '评分提交成功' })
}
