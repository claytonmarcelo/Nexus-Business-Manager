import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fix() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'nexus_business_manager'
  });

  // Check system_settings columns
  const [settingsCols] = await conn.query('SHOW COLUMNS FROM system_settings');
  console.log('system_settings columns:', settingsCols.map(c => c.Field).join(', '));

  // Check notifications columns
  const [notifCols] = await conn.query('SHOW COLUMNS FROM notifications');
  console.log('notifications columns:', notifCols.map(c => c.Field).join(', '));

  // Check if company_id exists in system_settings
  const hasCompanyId = settingsCols.some(c => c.Field === 'company_id');
  console.log('system_settings has company_id:', hasCompanyId);

  // Check if user_id exists in notifications
  const hasUserId = notifCols.some(c => c.Field === 'user_id');
  console.log('notifications has user_id:', hasUserId);

  // Fix system_settings if needed
  if (!hasCompanyId) {
    console.log('Adding company_id and other columns to system_settings...');
    await conn.query(`
      ALTER TABLE system_settings
        ADD COLUMN company_id INT NULL AFTER id,
        ADD INDEX idx_system_settings_company_id (company_id),
        ADD COLUMN system_name VARCHAR(150) NULL AFTER company_id,
        ADD COLUMN logo_url VARCHAR(500) NULL AFTER system_name,
        ADD COLUMN favicon_url VARCHAR(500) NULL AFTER logo_url,
        ADD COLUMN primary_color VARCHAR(50) NULL AFTER favicon_url,
        ADD COLUMN theme_mode VARCHAR(50) NULL AFTER primary_color
    `);
    console.log('system_settings fixed');
  } else {
    console.log('system_settings already has company_id, checking other columns...');
    const neededCols = ['system_name', 'logo_url', 'favicon_url', 'primary_color', 'theme_mode'];
    const existingCols = settingsCols.map(c => c.Field);
    const missingCols = neededCols.filter(c => !existingCols.includes(c));
    if (missingCols.length > 0) {
      console.log('Adding missing columns:', missingCols);
      for (const col of missingCols) {
        let afterCol = 'company_id';
        if (col === 'logo_url') afterCol = 'system_name';
        if (col === 'favicon_url') afterCol = 'logo_url';
        if (col === 'primary_color') afterCol = 'favicon_url';
        if (col === 'theme_mode') afterCol = 'primary_color';
        await conn.query(`ALTER TABLE system_settings ADD COLUMN ${col} VARCHAR(150) NULL AFTER ${afterCol}`);
      }
      console.log('Missing columns added');
    }
  }

  // Fix notifications if needed
  if (!hasUserId) {
    console.log('Adding user_id column to notifications...');
    await conn.query(`
      ALTER TABLE notifications
        ADD COLUMN user_id INT NULL AFTER company_id,
        ADD INDEX idx_notifications_user_id (user_id)
    `);
    console.log('notifications user_id added');
  }

  // Verify final state
  const [finalSettings] = await conn.query('SHOW COLUMNS FROM system_settings');
  console.log('\nFinal system_settings columns:', finalSettings.map(c => c.Field).join(', '));

  const [finalNotif] = await conn.query('SHOW COLUMNS FROM notifications');
  console.log('Final notifications columns:', finalNotif.map(c => c.Field).join(', '));

  await conn.end();
  console.log('\n✅ Database fixes completed!');
}

fix().catch(console.error);