// POST /api/ratings — 提交评分

async function hashIP(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + 'smu-salt')
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

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

  // MVP: 基于 IP 哈希去重，同一 IP 对同一课程只能评一次
  const ip = context.request.headers.get('CF-Connecting-IP') || context.request.headers.get('X-Forwarded-For') || 'unknown'
  const ipHash = await hashIP(ip)

  // 检查是否已评分
  const existing = await db
    .prepare('SELECT id FROM ratings WHERE course_id = ? AND ip_hash = ?')
    .bind(course_id, ipHash)
    .first()

  if (existing) {
    // 更新已有评分
    await db
      .prepare('UPDATE ratings SET score = ? WHERE id = ?')
      .bind(score, existing.id)
      .run()
  } else {
    await db
      .prepare('INSERT INTO ratings (course_id, score, ip_hash) VALUES (?, ?, ?)')
      .bind(course_id, score, ipHash)
      .run()
  }

  return Response.json({ success: true, message: '评分提交成功' })
}
