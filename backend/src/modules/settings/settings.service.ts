import { query, execute } from '../../shared/database/connection'

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<any[]>(
    'SELECT setting_value FROM system_settings WHERE setting_key = ?',
    [key]
  )
  return rows && rows.length > 0 ? rows[0].setting_value : null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await execute(
    `INSERT INTO system_settings (setting_key, setting_value, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
    [key, value, value]
  )
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await query<any[]>('SELECT setting_key, setting_value FROM system_settings')
  const settings: Record<string, string> = {}
  if (rows) {
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value
    }
  }
  return settings
}

export async function getPreloaderConfig(): Promise<{ ativo: boolean; adminAtivo: boolean; siteAtivo: boolean }> {
  const ativo = await getSetting('preloader_active')
  const admin = await getSetting('preloader_admin')
  const site = await getSetting('preloader_site')

  return {
    ativo: ativo !== 'false',
    adminAtivo: admin !== 'false',
    siteAtivo: site !== 'false',
  }
}
