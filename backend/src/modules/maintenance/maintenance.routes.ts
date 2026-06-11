import { query } from '../../shared/database/connection'

interface ConfigManutencao {
  ativo: boolean
  mensagem: string
  previsaoRetorno: string | null
  ipsLiberados: string[]
  planoFundo: string
}

let configCache: ConfigManutencao | null = null
let ultimoCache = 0

const CACHE_TTL = 30000

export async function getConfigManutencao(): Promise<ConfigManutencao> {
  const agora = Date.now()
  if (configCache && (agora - ultimoCache) < CACHE_TTL) {
    return configCache
  }

  try {
    const rows = await query<any[]>(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'maintenance_%'"
    )

    const config: ConfigManutencao = {
      ativo: false,
      mensagem: 'Sistema em manutenção. Voltaremos em breve!',
      previsaoRetorno: null,
      ipsLiberados: [],
      planoFundo: '',
    }

    if (rows) {
      for (const row of rows) {
        switch (row.setting_key) {
          case 'maintenance_active':
            config.ativo = row.setting_value === 'true'
            break
          case 'maintenance_message':
            config.mensagem = row.setting_value
            break
          case 'maintenance_return_time':
            config.previsaoRetorno = row.setting_value
            break
          case 'maintenance_allowed_ips':
            try {
              config.ipsLiberados = JSON.parse(row.setting_value)
            } catch {
              config.ipsLiberados = row.setting_value ? [row.setting_value] : []
            }
            break
          case 'maintenance_background':
            config.planoFundo = row.setting_value
            break
        }
      }
    }

    configCache = config
    ultimoCache = agora
    return config
  } catch {
    return {
      ativo: false,
      mensagem: 'Sistema em manutenção.',
      previsaoRetorno: null,
      ipsLiberados: [],
      planoFundo: '',
    }
  }
}

export async function maintenanceRoutes(app: any) {
  app.get('/api/maintenance', async (_req: any, reply: any) => {
    const config = await getConfigManutencao()
    return reply.send(config)
  })

  app.put('/api/admin/maintenance', {
    preHandler: [app.authenticate],
  }, async (req: any, reply: any) => {
    const user = req.user as any
    if (!user || user.role !== 'admin') {
      return reply.status(403).send({ success: false, message: 'Acesso negado' })
    }

    const body = req.body as Partial<ConfigManutencao>

    const settings: Record<string, string> = {}
    if (body.ativo !== undefined) settings['maintenance_active'] = String(body.ativo)
    if (body.mensagem !== undefined) settings['maintenance_message'] = body.mensagem
    if (body.previsaoRetorno !== undefined) settings['maintenance_return_time'] = String(body.previsaoRetorno)
    if (body.ipsLiberados !== undefined) settings['maintenance_allowed_ips'] = JSON.stringify(body.ipsLiberados)
    if (body.planoFundo !== undefined) settings['maintenance_background'] = body.planoFundo

    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO system_settings (setting_key, setting_value, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
        [key, value, value]
      )
    }

    configCache = null
    return reply.send({ success: true, message: 'Configuração de manutenção atualizada' })
  })
}
