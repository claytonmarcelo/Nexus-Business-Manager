import { getAllSettings, setSetting, getPreloaderConfig } from './settings.service'

export async function settingsRoutes(app: any) {
  app.get('/api/admin/settings', {
    preHandler: [app.authenticate],
  }, async (req: any, reply: any) => {
    const user = req.user as any
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Acesso negado' })
    }
    const settings = await getAllSettings()
    return reply.send({ success: true, data: settings })
  })

  app.put('/api/admin/settings', {
    preHandler: [app.authenticate],
  }, async (req: any, reply: any) => {
    const user = req.user as any
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Acesso negado' })
    }

    const body = req.body as Record<string, string>
    for (const [key, value] of Object.entries(body)) {
      await setSetting(key, value)
    }
    return reply.send({ success: true, message: 'Configurações atualizadas' })
  })

  app.get('/api/preloader-config', async (_req: any, reply: any) => {
    const config = await getPreloaderConfig()
    return reply.send(config)
  })
}
