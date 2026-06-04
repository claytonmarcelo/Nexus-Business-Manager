import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Notification } from '../../types';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function handleMarkRead(id: number) {
    try {
      await api.put(`/notifications/${id}/read`);
      load();
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await api.put('/notifications/read-all');
      load();
    } catch { /* ignore */ }
  }

  async function handleGenerate() {
    try {
      await api.post('/notifications/generate');
      load();
    } catch { /* ignore */ }
  }

  const iconMap: Record<string, string> = {
    warning: '⚠️',
    calendar: '📅',
    info: 'ℹ️',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificacoes</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} nao lida(s)` : 'Todas lidas'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleGenerate} className="btn-secondary">Gerar Alertas</button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-primary">Marcar todas lidas</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma notificacao</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start gap-4 p-4 ${!n.read ? 'bg-nexus-50' : 'hover:bg-gray-50'}`}>
                <span className="text-xl">{iconMap[n.icon || 'info'] || 'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? 'font-semibold' : ''}`}>{n.title}</p>
                  {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('pt-BR')}</p>
                </div>
                {!n.read && (
                  <button onClick={() => handleMarkRead(n.id)} className="text-xs text-nexus-600 hover:text-nexus-800 font-medium whitespace-nowrap">
                    Marcar lida
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
