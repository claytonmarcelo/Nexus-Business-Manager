import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FunnelIcon, EyeIcon, DocumentTextIcon,
  ShieldCheckIcon, ExclamationTriangleIcon,
  ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

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

const actionMeta: Record<string, { color: string; bg: string }> = {
  create: { color: 'var(--nexus-success)', bg: 'rgba(var(--nexus-success-rgb),0.12)' },
  update: { color: 'var(--nexus-gold)', bg: 'rgba(var(--nexus-gold-rgb),0.12)' },
  delete: { color: 'var(--nexus-danger)', bg: 'rgba(var(--nexus-danger-rgb),0.12)' },
  login: { color: 'var(--nexus-chart-blue)', bg: 'rgba(var(--nexus-blue-rgb),0.12)' },
  logout: { color: 'var(--nexus-muted)', bg: 'rgba(var(--nexus-muted-rgb),0.12)' },
  export: { color: 'var(--nexus-rose)', bg: 'rgba(var(--nexus-rose-rgb),0.12)' },
};

const actionLabels: Record<string, string> = {
  create: 'Criação', update: 'Alteração', delete: 'Exclusão',
  login: 'Login', logout: 'Logout', export: 'Exportação',
};

const PAGE_SIZE = 15;

export function Logs() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    setPage(1);
    loadLogs();
  }, [filter]);

  useEffect(() => {
    loadLogs();
  }, [page]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params: any = { page, limit: PAGE_SIZE };
      if (filter) params.action = filter;
      const res = await api.get('/audit', { params });
      setLogs(res.data.data || []);
    } catch {
      showToast('Erro ao carregar logs', 'error');
    } finally {
      setLoading(false);
    }
  }

  const paged = logs;
  const totalPages = Math.max(1, Math.ceil(paged.length / PAGE_SIZE));

  const statsByAction = logTypes.filter(t => t.value).map(t => ({
    label: t.label,
    value: logs.filter(l => l.action === t.value).length,
    ...actionMeta[t.value],
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 bg-transparent">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Logs do Sistema</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>
          Registro detalhado de todas as ações realizadas no sistema
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsByAction.map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4 text-center transition-all"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--nexus-muted)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl p-4" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        <div className="flex items-center gap-3">
          <FunnelIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--nexus-muted-2)' }} />
          <div className="flex flex-wrap gap-2">
            {logTypes.map((t) => (
              <button key={t.value} onClick={() => { setFilter(t.value); setPage(1); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={{
                  background: filter === t.value ? 'rgba(var(--nexus-gold-rgb),0.12)' : 'var(--nexus-card-soft)',
                  color: filter === t.value ? 'var(--nexus-gold)' : 'var(--nexus-muted)',
                  border: filter === t.value ? '1px solid var(--nexus-gold)' : '1px solid var(--nexus-border)',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--nexus-bg-soft)' }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--nexus-muted-2)' }} />
            <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Nenhum log encontrado.</p>
          </div>
        ) : (
          <>
            <div className="">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                    {['Data/Hora', 'Usuário', 'Ação', 'Descrição', 'IP', ''].map(h => (
                      <th key={h} className="px-5 py-3.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'var(--nexus-muted-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const meta = actionMeta[log.action] || actionMeta.create;
                    return (
                      <tr key={log.id} className="transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        onClick={() => setSelectedLog(log)}>
                        <td className="px-5 py-3 whitespace-nowrap" style={{ color: 'var(--nexus-muted-2)' }}>
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: 'var(--nexus-text)' }}>{log.user_name}</td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-medium"
                            style={{ background: meta.bg, color: meta.color }}>
                            {actionLabels[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 max-w-[300px] truncate whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>{log.description}</td>
                        <td className="px-5 py-3 text-[11px] whitespace-nowrap" style={{ color: 'var(--nexus-muted-2)' }}>{log.ip_address}</td>
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <EyeIcon className="w-4 h-4 inline-block" style={{ color: 'var(--nexus-muted-2)' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--nexus-border)' }}>
              <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                {logs.length} registro(s)
              </span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                  style={{ border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium px-2" style={{ color: 'var(--nexus-gold)' }}>{page}</span>
                <button disabled={logs.length < PAGE_SIZE} onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                  style={{ border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--nexus-overlay)' }}
          onClick={() => setSelectedLog(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 w-full max-w-lg"
            style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: 'var(--nexus-text)' }}>Detalhes do Log</h3>
              <button onClick={() => setSelectedLog(null)} style={{ color: 'var(--nexus-muted-2)' }}>&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Data/Hora', value: new Date(selectedLog.created_at).toLocaleString('pt-BR') },
                { label: 'Usuário', value: selectedLog.user_name },
                { label: 'Ação', value: actionLabels[selectedLog.action] || selectedLog.action },
                { label: 'Descrição', value: selectedLog.description },
                { label: 'IP', value: selectedLog.ip_address },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--nexus-muted-2)' }}>{f.label}</p>
                  <p className="text-sm" style={{ color: 'var(--nexus-text)' }}>{f.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
