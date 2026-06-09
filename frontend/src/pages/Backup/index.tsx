import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownTrayIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface BackupItem {
  id: number;
  filename: string;
  size: string;
  created_at: string;
}

export function Backup() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadBackups();
  }, []);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Backup e Restauração</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Gerencie backups do banco de dados da sua empresa
          </p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="btn-primary"
          style={{ height: '44px', padding: '0 1.5rem' }}
        >
          {creating ? 'Criando...' : 'Criar Backup'}
        </button>
      </div>

      <div className="nexus-card p-6">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="animate-spin text-2xl" style={{ color: 'var(--nexus-gold)' }}>{'\u21BB'}</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-10">
            <ClockIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--nexus-muted-2)' }} />
            <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
              Nenhum backup encontrado. Crie seu primeiro backup clicando no botao acima.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="nexus-table">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Tamanho</th>
                  <th>Data</th>
                  <th className="text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="nexus-table-row">
                    <td><span className="text-sm" style={{ color: 'var(--nexus-text)' }}>{b.filename}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{b.size}</span></td>
                    <td><span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{b.created_at}</span></td>
                    <td className="text-right">
                      <button
                        onClick={() => downloadBackup(b.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
                        style={{ color: 'var(--nexus-gold)' }}
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Baixar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="nexus-card p-6">
        <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Restauração</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--nexus-muted)' }}>
          Para restaurar um backup, baixe o arquivo desejado e utilize a ferramenta de restauração do banco de dados.
        </p>
        <div className="p-4 rounded-lg" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.06)', border: '1px solid rgba(var(--nexus-gold-rgb), 0.15)' }}>
          <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
            A restauração de backups deve ser realizada por um administrador do sistema.
            O processo substituira todos os dados atuais pelos dados do backup.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
