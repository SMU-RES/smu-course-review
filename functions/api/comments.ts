// POST /api/comments — 提交评论（支持子评论）

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

  let body: { course_id?: number; content?: string; parent_id?: number }
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { course_id, content, parent_id } = body

  if (!course_id || !content?.trim()) {
    return Response.json({ error: '课程ID和评论内容不能为空' }, { status: 400 })
  }

  if (content.trim().length > 100) {
    return Response.json({ error: '评论内容不能超过100字' }, { status: 400 })
  }

  // 检查课程是否存在
  const course = await db
    .prepare('SELECT id FROM courses WHERE id = ?')
    .bind(course_id)
    .first()

  if (!course) {
    return Response.json({ error: '课程不存在' }, { status: 404 })
  }

  // 如果是子评论，检查父评论是否存在且为顶级评论
  if (parent_id) {
    const parent = await db
      .prepare('SELECT id, parent_id FROM comments WHERE id = ? AND course_id = ?')
      .bind(parent_id, course_id)
      .first()

    if (!parent) {
      return Response.json({ error: '父评论不存在' }, { status: 404 })
    }

    // 子评论不能再被评论（只允许一级嵌套）
    if (parent.parent_id !== null) {
      return Response.json({ error: '不能回复子评论' }, { status: 400 })
    }
  }

  const sanitized = sanitize(content.trim())
  const nickname = '匿名用户'

  await db
    .prepare('INSERT INTO comments (course_id, parent_id, nickname, content) VALUES (?, ?, ?, ?)')
    .bind(course_id, parent_id ?? null, nickname, sanitized)
    .run()

  return Response.json({ success: true, message: '评论提交成功' })
}
