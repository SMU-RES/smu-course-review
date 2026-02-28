// POST /api/teacher-ratings — 提交教师评分

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + 'smu-salt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const db = context.env.DB

  let body: { teacher_id?: string; score?: number }
  try {
    body = await context.request.json()
  } catch {
    return Response.json({ error: '请求格式错误' }, { status: 400 })
  }

  const { teacher_id, score } = body

  if (!teacher_id || score == null) {
    return Response.json({ error: '教师ID和评分不能为空' }, { status: 400 })
  }

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return Response.json({ error: '评分必须为1-5的整数' }, { status: 400 })
  }

  // 检查教师是否存在
  const teacher = await db
    .prepare('SELECT id FROM teachers WHERE id = ?')
    .bind(teacher_id)
    .first()

  if (!teacher) {
    return Response.json({ error: '教师不存在' }, { status: 404 })
  }

  // 基于 IP 哈希去重
  const ip = context.request.headers.get('CF-Connecting-IP') || context.request.headers.get('X-Forwarded-For') || 'unknown'
  const ipHash = await hashIP(ip)

  const existing = await db
    .prepare('SELECT id FROM teacher_ratings WHERE teacher_id = ? AND ip_hash = ?')
    .bind(teacher_id, ipHash)
    .first()

  if (existing) {
    await db
      .prepare('UPDATE teacher_ratings SET score = ? WHERE id = ?')
      .bind(score, existing.id)
      .run()
  } else {
    await db
      .prepare('INSERT INTO teacher_ratings (teacher_id, score, ip_hash) VALUES (?, ?, ?)')
      .bind(teacher_id, score, ipHash)
      .run()
  }

  return Response.json({ success: true, message: '评分提交成功' })
}
