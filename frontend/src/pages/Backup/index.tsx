import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownTrayIcon, ClockIcon, ShieldCheckIcon,
  ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface BackupItem {
  id: number;
  filename: string;
  size: string;
  created_at: string;
}

const PAGE_SIZE = 10;

export function Backup() {
  const { showToast } = useToast();
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { loadBackups(); }, []);

  async function loadBackups() {
    setLoading(true);
    try {
      const res = await api.get('/backups');
      setBackups(res.data.data || []);
    } catch {
      showToast('Erro ao carregar backups.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    setCreating(true);
    try {
      const res = await api.post('/backups');
      setBackups((prev) => [res.data.data, ...prev]);
      showToast('Backup criado com sucesso.');
    } catch {
      showToast('Erro ao criar backup.', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function downloadBackup(id: number) {
    try {
      const res = await api.get(`/backups/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Backup baixado.');
    } catch {
      showToast('Erro ao baixar backup.', 'error');
    }
  }

  const totalPages = Math.max(1, Math.ceil(backups.length / PAGE_SIZE));
  const paged = backups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 bg-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Backup e Restauração</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>
            Gerencie backups do banco de dados da sua empresa
          </p>
        </div>
        <button onClick={createBackup} disabled={creating}
          className="px-5 py-2.5 text-sm font-medium rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))',
            color: '#FFFFFF',
          }}>
          {creating ? 'Criando...' : 'Criar Backup'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total de Backups', value: backups.length, icon: ShieldCheckIcon, color: 'var(--nexus-gold)' },
          { label: 'Último Backup', value: backups.length > 0 ? new Date(backups[0].created_at).toLocaleDateString('pt-BR') : 'Nenhum', icon: ClockIcon, color: 'var(--nexus-chart-blue)' },
          { label: 'Backups Recentes', value: backups.filter(b => {
            const d = new Date(b.created_at);
            const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
            return d >= sevenDaysAgo;
          }).length + ' nesta semana', icon: ArrowPathIcon, color: 'var(--nexus-success)' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4 flex items-center gap-3 transition-all"
              style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(var(--nexus-gold-rgb),0.08)', color: s.color }}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>{s.label}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--nexus-text)' }}>{s.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: 'var(--nexus-bg-soft)' }} />
            ))}
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--nexus-muted-2)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>Nenhum backup encontrado</p>
            <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted)' }}>
              Crie seu primeiro backup clicando no botão acima
            </p>
          </div>
        ) : (
          <>
            <div className="">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                    {['Arquivo', 'Tamanho', 'Data', ''].map(h => (
                      <th key={h} className="px-5 py-3.5 font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: 'var(--nexus-muted-2)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((b) => (
                    <tr key={b.id} className="transition-colors" style={{ borderBottom: '1px solid var(--nexus-border)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ShieldCheckIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{b.filename}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>{b.size}</td>
                      <td className="px-5 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>{b.created_at}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button onClick={() => downloadBackup(b.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--nexus-gold)', border: '1px solid var(--nexus-border)' }}>
                          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                          Baixar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--nexus-border)' }}>
                <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                  Página {page} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                    style={{ border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                    style={{ border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted)' }}>
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Restauração</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--nexus-muted)' }}>
          Para restaurar um backup, baixe o arquivo desejado e utilize a ferramenta de restauração do banco de dados.
        </p>
        <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--nexus-gold-rgb),0.06)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)' }}>
          <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
            A restauração de backups deve ser realizada por um administrador do sistema.
            O processo substituirá todos os dados atuais pelos dados do backup.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
