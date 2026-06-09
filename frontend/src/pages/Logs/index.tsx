import { useState } from 'react';
import { motion } from 'framer-motion';
import { FunnelIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

interface LogEntry {
  id: number;
  action: string;
  user_name: string;
  description: string;
  ip_address: string;
  created_at: string;
}

const logTypes = [
  { value: '', label: 'Todas' },
  { value: 'create', label: 'Criação' },
  { value: 'update', label: 'Alteração' },
  { value: 'delete', label: 'Exclusão' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'export', label: 'Exportação' },
];

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('');

  async function loadLogs() {
    setLoading(true);
    try {
      const params = filter ? { action: filter } : {};
      const res = await api.get('/audit', { params });
      setLogs(res.data.data || []);
      setLoaded(true);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!loaded && !loading) {
    loadLogs();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="page-title">Logs do Sistema</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
          Registro detalhado de todas as ações realizadas no sistema
        </p>
      </div>

      <div className="nexus-card p-4">
        <div className="flex items-center gap-3">
          <FunnelIcon className="w-5 h-5" style={{ color: 'var(--nexus-muted-2)' }} />
          <div className="flex flex-wrap gap-2">
            {logTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => { setFilter(t.value); setLoaded(false); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={{
                  background: filter === t.value ? 'rgba(var(--nexus-gold-rgb), 0.12)' : 'var(--nexus-card-soft)',
                  color: filter === t.value ? 'var(--nexus-gold)' : 'var(--nexus-muted)',
                  border: filter === t.value ? '1px solid var(--nexus-gold)' : '1px solid var(--nexus-border)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="nexus-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="animate-spin text-2xl" style={{ color: 'var(--nexus-gold)' }}>{'\u21BB'}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Nenhum log encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="nexus-table">
              <thead className="sticky top-0" style={{ background: 'var(--nexus-bg)' }}>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th className="hidden md:table-cell">Descrição</th>
                  <th className="hidden sm:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="nexus-table-row">
                    <td><span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span></td>
                    <td><span className="text-sm" style={{ color: 'var(--nexus-text)' }}>{log.user_name}</span></td>
                    <td>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: log.action === 'create' ? 'rgba(var(--nexus-success-rgb), 0.12)' :
                            log.action === 'delete' ? 'rgba(var(--nexus-danger-rgb), 0.12)' :
                            'rgba(var(--nexus-gold-rgb), 0.12)',
                          color: log.action === 'create' ? 'var(--nexus-success)' :
                            log.action === 'delete' ? 'var(--nexus-danger)' :
                            'var(--nexus-gold)',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="hidden md:table-cell"><span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{log.description}</span></td>
                    <td className="hidden sm:table-cell"><span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{log.ip_address}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
