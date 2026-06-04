import { query, execute } from '../../shared/database/connection';
import { RowDataPacket } from 'mysql2';

interface NotificationRow extends RowDataPacket {
  id: number;
  company_id: number;
  type: string;
  title: string;
  message: string | null;
  icon: string | null;
  read: number;
  created_at: string;
}

interface LowStockRow extends RowDataPacket {
  id: number;
  name: string;
  quantity: number;
}

interface AppointmentRow extends RowDataPacket {
  id: number;
  title: string;
  appointment_date: string;
  appointment_time: string | null;
}

export async function listNotifications(companyId: number): Promise<NotificationRow[]> {
  return query<NotificationRow[]>(
    'SELECT * FROM notifications WHERE company_id = ? ORDER BY created_at DESC LIMIT 50',
    [companyId]
  );
}

export async function getUnreadCount(companyId: number): Promise<number> {
  const result = await query<RowDataPacket[]>(
    'SELECT COUNT(*) as count FROM notifications WHERE company_id = ? AND read = FALSE',
    [companyId]
  );
  return result[0].count;
}

export async function markAsRead(id: number, companyId: number): Promise<void> {
  await execute('UPDATE notifications SET read = TRUE WHERE id = ? AND company_id = ?', [id, companyId]);
}

export async function markAllAsRead(companyId: number): Promise<void> {
  await execute('UPDATE notifications SET read = TRUE WHERE company_id = ?', [companyId]);
}

export async function generateAlerts(companyId: number): Promise<void> {
  const lowStock = await query<LowStockRow[]>(
    'SELECT id, name, quantity FROM products WHERE active = TRUE AND quantity <= 5 AND company_id = ?',
    [companyId]
  );

  for (const product of lowStock) {
    const exists = await query<RowDataPacket[]>(
      "SELECT id FROM notifications WHERE company_id = ? AND type = 'low_stock' AND message LIKE ? AND read = FALSE",
      [companyId, `%${product.name}%`]
    );
    if (exists.length === 0) {
      await execute(
        "INSERT INTO notifications (company_id, type, title, message, icon) VALUES (?, 'low_stock', ?, ?, 'warning')",
        [companyId, `Estoque baixo: ${product.name}`, `Restam apenas ${product.quantity} unidades`]
      );
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const appointments = await query<AppointmentRow[]>(
    'SELECT id, title, appointment_date, appointment_time FROM appointments WHERE appointment_date = ? AND status = ? AND company_id = ?',
    [tomorrowStr, 'scheduled', companyId]
  );

  for (const appt of appointments) {
    const exists = await query<RowDataPacket[]>(
      "SELECT id FROM notifications WHERE company_id = ? AND type = 'appointment_reminder' AND message LIKE ? AND read = FALSE",
      [companyId, `%${appt.title}%`]
    );
    if (exists.length === 0) {
      const timeStr = appt.appointment_time ? ` as ${appt.appointment_time}` : '';
      await execute(
        "INSERT INTO notifications (company_id, type, title, message, icon) VALUES (?, 'appointment_reminder', ?, ?, 'calendar')",
        [companyId, `Agendamento amanha: ${appt.title}`, `Compromisso marcado para ${tomorrowStr}${timeStr}`]
      );
    }
  }
}
