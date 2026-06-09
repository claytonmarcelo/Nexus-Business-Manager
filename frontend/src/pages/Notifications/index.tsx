import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface Notification {
  id: number;
  title: string;
  message?: string;
  icon?: string;
  read: boolean;
  created_at: string;
}

export function Notifications() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount);
    } catch (err: any) {
      console.error('Erro ao carregar notificações:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar notificações';
      showToast(errorMsg, 'error');
    }
    finally { setLoading(false); }
  }

  async function handleMarkRead(id: number) {
    try {
      await api.put(`/notifications/${id}/read`);
      load();
    } catch { showToast('Erro ao marcar notificação como lida', 'error'); }
  }

  async function handleMarkAllRead() {
    try {
      await api.put('/notifications/read-all');
      load();
    } catch { showToast('Erro ao marcar todas como lidas', 'error'); }
  }

  async function handleGenerate() {
    try {
      await api.post('/notifications/generate');
      load();
    } catch { showToast('Erro ao gerar notificações', 'error'); }
  }

  const iconMap: Record<string, string> = {
    warning: '⚠️',
    calendar: '📅',
    info: 'ℹ️',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Notificações</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>
            {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas lidas'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleGenerate} style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem' }}>Gerar Alertas</button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: 'var(--nexus-text)', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>Marcar todas lidas</button>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)', fontSize: '0.875rem' }}>Carregando...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Nenhum registro encontrado</div>
        ) : (
          <div>
            {notifications.map((n) => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(var(--nexus-gold-rgb),0.05)',
                background: !n.read ? 'rgba(var(--nexus-gold-rgb),0.08)' : undefined,
              }}>
                <span style={{ fontSize: '1.25rem' }}>{iconMap[n.icon || 'info'] || 'ℹ️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: !n.read ? 600 : 400, color: 'var(--nexus-text)', margin: 0 }}>{n.title}</p>
                  {n.message && <p style={{ fontSize: '0.75rem', color: 'var(--nexus-muted-2)', margin: '0.125rem 0 0 0' }}>{n.message}</p>}
                  <p style={{ fontSize: '0.75rem', color: 'var(--nexus-muted-2)', margin: '0.25rem 0 0 0', opacity: 0.65 }}>{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                </div>
                {!n.read && (
                  <button onClick={() => handleMarkRead(n.id)} style={{ color: 'var(--nexus-gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    Marcar lida
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
