import bcrypt from 'bcryptjs';
import { query, execute } from './connection';
import { RowDataPacket } from 'mysql2';

const FIXED_ADMIN_EMAIL = 'marcelolimadez@gmail.com';

async function seed(): Promise<void> {
  const existing = await query<RowDataPacket[]>('SELECT id FROM companies WHERE id = 1');
  if (existing.length === 0) {
    await execute(
      'INSERT INTO companies (id, name, slug, email) VALUES (1, ?, ?, ?)',
      ['Nexus Business Manager Demo', 'nexus-demo', 'marcelolimadez@gmail.com']
    );
  } else {
    await execute('UPDATE companies SET name = ? WHERE id = 1', ['Nexus Business Manager Demo']);
  }

  const hashedPassword = await bcrypt.hash('12345678', 10);
  const adminCheck = await query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [FIXED_ADMIN_EMAIL]);

  if (adminCheck.length === 0) {
    await execute(
      'INSERT INTO users (company_id, name, email, password, role, active) VALUES (1, ?, ?, ?, ?, TRUE)',
      ['Administrador', FIXED_ADMIN_EMAIL, hashedPassword, 'admin']
    );
  } else {
    await execute(
      'UPDATE users SET role = ?, active = TRUE, password = ? WHERE email = ?',
      ['admin', hashedPassword, FIXED_ADMIN_EMAIL]
    );
  }

  console.log('Administrador fixo criado/atualizado com sucesso');
  console.log(`Email: ${FIXED_ADMIN_EMAIL}`);
  console.log('Senha: 12345678');
  console.log('Perfil: ADMIN');
  console.log('Empresa: Nexus Business Manager Demo');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
