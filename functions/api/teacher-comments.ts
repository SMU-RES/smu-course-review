// POST /api/teacher-comments — 提交教师评论（支持子评论）

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

  let body: { teacher_id?: string; content?: string; parent_id?: number }
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { teacher_id, content, parent_id } = body

  if (!teacher_id || !content?.trim()) {
    return Response.json({ error: '教师ID和评论内容不能为空' }, { status: 400 })
  }

  if (content.trim().length > 100) {
    return Response.json({ error: '评论内容不能超过100字' }, { status: 400 })
  }

  // 检查教师是否存在
  const teacher = await db
    .prepare('SELECT id FROM teachers WHERE id = ?')
    .bind(teacher_id)
    .first()

  if (!teacher) {
    return Response.json({ error: '教师不存在' }, { status: 404 })
  }

  // 如果是子评论，检查父评论是否存在且为顶级评论
  if (parent_id) {
    const parent = await db
      .prepare('SELECT id, parent_id FROM teacher_comments WHERE id = ? AND teacher_id = ?')
      .bind(parent_id, teacher_id)
      .first()

    if (!parent) {
      return Response.json({ error: '父评论不存在' }, { status: 404 })
    }

    if (parent.parent_id !== null) {
      return Response.json({ error: '不能回复子评论' }, { status: 400 })
    }
  }

  const sanitized = sanitize(content.trim())
  const nickname = '匿名用户'

  await db
    .prepare('INSERT INTO teacher_comments (teacher_id, parent_id, nickname, content) VALUES (?, ?, ?, ?)')
    .bind(teacher_id, parent_id ?? null, nickname, sanitized)
    .run()

  return Response.json({ success: true, message: '评论提交成功' })
}
