import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BellIcon, CheckCircleIcon, ExclamationCircleIcon,
  CalendarDaysIcon, InformationCircleIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
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

const iconMap: Record<string, { icon: typeof BellIcon; color: string }> = {
  warning: { icon: ExclamationCircleIcon, color: 'var(--nexus-warning)' },
  calendar: { icon: CalendarDaysIcon, color: 'var(--nexus-gold)' },
  info: { icon: InformationCircleIcon, color: 'var(--nexus-chart-blue)' },
  success: { icon: CheckCircleIcon, color: 'var(--nexus-success)' },
};

const defaultIcon = { icon: BellIcon, color: 'var(--nexus-muted)' };

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
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar notificações';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: number) {
    try {
      await api.put(`/notifications/${id}/read`);
      load();
    } catch { showToast('Erro ao marcar como lida', 'error'); }
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 bg-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Notificações</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>
            {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas lidas'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleGenerate}
            className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
            style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
            <span className="inline-flex items-center gap-1.5">
              <ArrowPathIcon className="w-4 h-4" />
              Gerar Alertas
            </span>
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
              style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: '#FFFFFF' }}>
              Marcar todas lidas
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl animate-pulse" style={{ background: 'var(--nexus-bg-soft)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)' }} />
                  <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--nexus-muted-2)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>Nenhuma notificação</p>
            <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted)' }}>Todas as notificações aparecerão aqui</p>
          </div>
        ) : (
          <div>
            {notifications.map((n) => {
              const iconCfg = iconMap[n.icon || ''] || defaultIcon;
              const Icon = iconCfg.icon;
              return (
                <motion.div key={n.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-start gap-3 px-5 py-4 transition-colors"
                  style={{
                    borderBottom: '1px solid var(--nexus-border)',
                    background: !n.read ? 'rgba(var(--nexus-gold-rgb),0.06)' : 'transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = !n.read ? 'rgba(var(--nexus-gold-rgb),0.06)' : 'transparent';
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(var(--nexus-gold-rgb),0.08)', color: iconCfg.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate" style={{
                        color: 'var(--nexus-text)',
                        fontWeight: !n.read ? 600 : 400,
                      }}>{n.title}</p>
                      {!n.read && (
                        <button onClick={() => handleMarkRead(n.id)}
                          className="text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors"
                          style={{ color: 'var(--nexus-gold)' }}>
                          Marcar lida
                        </button>
                      )}
                    </div>
                    {n.message && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted)' }}>{n.message}</p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: 'var(--nexus-muted-2)' }}>
                      {new Date(n.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
