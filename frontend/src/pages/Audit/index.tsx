import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { AuditLog } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { PremiumBadge } from '../../components/ui/PremiumBadge';

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/audit');
      setLogs(res.data?.data || []);
    } catch { console.error('Erro ao carregar auditoria'); }
    finally { setLoading(false); }
  }

  function actionLabel(action: string) {
    const map: Record<string, string> = {
      create: 'Criacao',
      update: 'Alteracao',
      delete: 'Exclusao',
      login: 'Login',
    };
    return map[action] || action;
  }

  function actionVariant(action: string): 'success' | 'warning' | 'danger' | 'default' {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      create: 'success',
      update: 'warning',
      delete: 'danger',
      login: 'default',
    };
    return map[action] || 'default';
  }

  const columns: Column<AuditLog>[] = [
    {
      key: 'date',
      header: 'Data/Hora',
      render: (log) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
      ),
    },
    {
      key: 'user',
      header: 'Usuario',
      render: (log) => (
        <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>{log.user_name}</span>
      ),
    },
    {
      key: 'action',
      header: 'Acao',
      render: (log) => (
        <PremiumBadge variant={actionVariant(log.action)}>{actionLabel(log.action)}</PremiumBadge>
      ),
    },
    {
      key: 'entity',
      header: 'Entidade',
      render: (log) => (
        <span style={{ color: 'var(--nexus-muted-2)', textTransform: 'capitalize' }}>{log.entity_type}</span>
      ),
    },
    {
      key: 'id',
      header: 'ID',
      render: (log) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{log.entity_id || '-'}</span>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Auditoria</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Historico de acoes no sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Registros"
          value={String(logs.length)}
          icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
          color="gold"
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        <PremiumTable columns={columns} data={logs} loading={loading} emptyMessage="Nenhum registro encontrado." />
      </div>
    </motion.div>
  );
}
