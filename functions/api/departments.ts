// GET /api/departments — 院系列表

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB

  const { results } = await db
    .prepare(
      `SELECT d.id, d.name, COUNT(c.id) AS course_count
       FROM departments d
       LEFT JOIN courses c ON d.id = c.department_id
       GROUP BY d.id
       ORDER BY course_count DESC`
    )
    .all()

  return Response.json({ departments: results })
}
