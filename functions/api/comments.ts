// POST /api/comments — 提交评论

function sanitize(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB

  let body: { course_id?: number; content?: string }
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { course_id, content } = body

  if (!course_id || !content?.trim()) {
    return Response.json({ error: '课程ID和评论内容不能为空' }, { status: 400 })
  }

  if (content.trim().length > 500) {
    return Response.json({ error: '评论内容不能超过500字' }, { status: 400 })
  }

  // 检查课程是否存在
  const course = await db
    .prepare('SELECT id FROM courses WHERE id = ?')
    .bind(course_id)
    .first()

  if (!course) {
    return Response.json({ error: '课程不存在' }, { status: 404 })
  }

  const sanitized = sanitize(content.trim())

  // MVP 阶段：user_id = 0 表示匿名用户（D1 不强制 FK 约束）
  await db
    .prepare('INSERT INTO comments (course_id, user_id, content) VALUES (?, 0, ?)')
    .bind(course_id, sanitized)
    .run()

  return Response.json({ success: true, message: '评论提交成功' })
}
