import { execute, query } from '../../shared/database/connection'

export async function supervisionRoutes(app: any) {
  app.get('/api/supervision/pending-actions', {
    preHandler: [app.authenticate],
  }, async (req: any, reply: any) => {
    const user = req.user as any
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Acesso negado' })
    }

    const rows = await query<any[]>(
      `SELECT sal.id, sal.action, sal.details, sal.requested_by, sal.requested_at,
              u.name as requested_by_name
       FROM supervised_action_logs sal
       JOIN users u ON u.id = sal.requested_by
       WHERE sal.status = 'pending'
       ORDER BY sal.requested_at DESC
       LIMIT 50`
    )

    return reply.send({ success: true, data: rows || [] })
  })

  app.put('/api/supervision/approve/:id', {
    preHandler: [app.authenticate],
  }, async (req: any, reply: any) => {
    const user = req.user as any
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Acesso negado' })
    }

    const { id } = req.params as any
    await execute(
      `UPDATE supervised_action_logs SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [user.id, id]
    )
    return reply.send({ success: true, message: 'Ação aprovada' })
  })

  app.put('/api/supervision/reject/:id', {
    preHandler: [app.authenticate],
  }, async (req: any, reply: any) => {
    const user = req.user as any
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Acesso negado' })
    }

    const { id } = req.params as any
    const body = req.body as any
    await execute(
      `UPDATE supervised_action_logs SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [body.reason || 'Sem justificativa', user.id, id]
    )
    return reply.send({ success: true, message: 'Ação rejeitada' })
  })
}
