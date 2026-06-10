import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import { listSuggestions } from '../../services/suggestions.service';
import { Suggestion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const statusCfg: Record<string, { label: string; style: React.CSSProperties }> = {
  pending: { label: 'Pendente', style: { background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' } },
  under_review: { label: 'Em Análise', style: { background: 'rgba(var(--nexus-blue-rgb),0.12)', color: 'var(--nexus-chart-blue)' } },
  approved: { label: 'Aprovada', style: { background: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)' } },
  rejected: { label: 'Rejeitada', style: { background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)' } },
  implemented: { label: 'Implementada', style: { background: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)' } },
};

const categoryCfg: Record<string, string> = {
  general: 'Geral', improvement: 'Melhoria', feature: 'Funcionalidade',
  complaint: 'Reclamação', praise: 'Elogio',
};

export function SuggestionsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await listSuggestions({ limit: 50 });
      setSuggestions(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager';
  const display = isAdmin ? suggestions : suggestions.filter((s) => s.user_id === user?.id);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 min-h-screen bg-transparent">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>
            <span style={{ color: 'var(--nexus-gold)' }}>Sugestões</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>
            {isAdmin ? 'Todas as sugestões recebidas' : 'Minhas sugestões'}
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <button onClick={() => navigate('/suggestions/admin')}
              className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
              style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
              Gerenciar
            </button>
          )}
          <button onClick={() => navigate('/suggestions/new')}
            className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: '#FFFFFF' }}>
            Nova Sugestão
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-1/4 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)' }} />
                <div className="h-5 w-3/4 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)' }} />
                <div className="h-4 w-1/2 rounded animate-pulse" style={{ background: 'var(--nexus-bg-soft)' }} />
              </div>
            ))}
          </div>
        ) : display.length === 0 ? (
          <div className="text-center py-12">
            <LightBulbIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--nexus-muted-2)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>Nenhuma sugestão encontrada</p>
            <p className="text-xs mt-1 mb-4" style={{ color: 'var(--nexus-muted)' }}>Compartilhe sua ideia para melhorar o sistema</p>
            <button onClick={() => navigate('/suggestions/new')}
              className="px-4 py-2 text-sm font-medium rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: '#FFFFFF' }}>
              Enviar sugestão
            </button>
          </div>
        ) : (
          <div>
            {display.map((s) => (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="px-5 py-4 transition-colors"
                style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-muted-2)' }}>
                    {categoryCfg[s.category] || s.category}
                  </span>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                    style={statusCfg[s.status]?.style || statusCfg.pending.style}>
                    {statusCfg[s.status]?.label || s.status}
                  </span>
                  {s.is_offensive === 1 && (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                      style={{ background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)' }}>
                      Ofensivo
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>{s.title}</h3>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--nexus-muted)' }}>{s.description}</p>
                <p className="text-[11px] mt-2" style={{ color: 'var(--nexus-muted-2)' }}>
                  {new Date(s.created_at).toLocaleString('pt-BR')}
                  {!isAdmin && s.admin_notes && ` — Nota: ${s.admin_notes}`}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
