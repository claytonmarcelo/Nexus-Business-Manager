import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  ServerStackIcon,
  CircleStackIcon,
  GlobeAltIcon,
  ChartBarSquareIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface HealthStatus {
  status: string;
  timestamp: string;
  database: { ok: boolean; latency?: number; message?: string };
  uptime: number;
  nodeVersion: string;
}

const fmtUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(' ') || '<1m';
};

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function Status() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const res = await api.get('/health');
      setHealth(res.data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    await loadStatus();
    setTimeout(() => setChecking(false), 500);
  }

  const items = [
    {
      icon: ServerStackIcon,
      label: 'API',
      status: health ? 'online' : 'offline',
      detail: health ? `Node ${health.nodeVersion}` : 'Indisponivel',
    },
    {
      icon: CircleStackIcon,
      label: 'Banco de Dados',
      status: health?.database?.ok ? 'online' : 'offline',
      detail: health?.database?.ok
        ? `Latencia: ${health.database.latency ?? '<1'}ms`
        : (health?.database?.message || 'Indisponivel'),
    },
    {
      icon: GlobeAltIcon,
      label: 'Servidor',
      status: health ? 'online' : 'offline',
      detail: health ? `Uptime: ${fmtUptime(health.uptime)}` : 'Indisponivel',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Status do Sistema</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>
            Monitore a saude dos servicos
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={checking}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
          style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
        >
          <ArrowPathIcon className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Verificando...' : 'Verificar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item) => {
          const Icon = item.icon;
          const isOnline = item.status === 'online';
          return (
            <motion.div
              key={item.label}
              whileHover={{ y: -2 }}
              className="rounded-2xl p-6 space-y-4"
              style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: isOnline ? 'rgba(var(--nexus-success-rgb), 0.1)' : 'rgba(var(--nexus-danger-rgb), 0.1)' }}>
                    <Icon className="w-5 h-5" style={{ color: isOnline ? 'var(--nexus-success)' : 'var(--nexus-danger)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{item.label}</p>
                    <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>{item.detail}</p>
                  </div>
                </div>
                {isOnline ? (
                  <CheckCircleIcon className="w-5 h-5" style={{ color: 'var(--nexus-success)' }} />
                ) : (
                  <ExclamationCircleIcon className="w-5 h-5" style={{ color: 'var(--nexus-danger)' }} />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                <ClockIcon className="w-3.5 h-3.5" />
                {health ? fmtTime(health.timestamp) : '--'}
              </div>
            </motion.div>
          );
        })}
      </div>

      {health && (
        <div className="rounded-2xl p-6" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <ChartBarSquareIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Informacoes do Servidor</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Node Version', value: health.nodeVersion },
              { label: 'Uptime', value: fmtUptime(health.uptime) },
              { label: 'Status Geral', value: health.status === 'healthy' ? 'Saudavel' : 'Degradado' },
              { label: 'Ultima verificacao', value: fmtTime(health.timestamp) },
            ].map((info) => (
              <div key={info.label} className="p-3 rounded-xl" style={{ background: 'var(--nexus-bg-soft)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>{info.label}</p>
                <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{info.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
