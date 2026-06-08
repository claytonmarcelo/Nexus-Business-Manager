import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listSuggestions } from '../../services/suggestions.service';
import { Suggestion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const statusLabels: Record<string, string> = {
  pending: 'Pendente', under_review: 'Em Analise', approved: 'Aprovada',
  rejected: 'Rejeitada', implemented: 'Implementada',
};

const statusBadgeStyles: Record<string, React.CSSProperties> = {
  pending: { background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' },
  under_review: { background: 'rgba(var(--nexus-blue-rgb),0.12)', color: 'var(--nexus-chart-blue)' },
  approved: { background: 'rgba(var(--nexus-success-rgb),0.12)', color: '#7DDA6A' },
  rejected: { background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)' },
  implemented: { background: 'rgba(var(--nexus-success-rgb),0.12)', color: '#7DDA6A' },
};

const categoryLabels: Record<string, string> = {
  general: 'Geral', improvement: 'Melhoria', feature: 'Funcionalidade',
  complaint: 'Reclamacao', praise: 'Elogio',
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

  const isAdminOrManager = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager';
  const userSuggestions = suggestions.filter((s) => s.user_id === user?.id);
  const displaySuggestions = isAdminOrManager ? suggestions : userSuggestions;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>
            <span style={{ color: 'var(--nexus-gold)' }}>Sugestoes</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>
            {isAdminOrManager ? 'Todas as sugestoes recebidas' : 'Minhas sugestoes'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isAdminOrManager && (
            <button
              onClick={() => navigate('/suggestions/admin')}
              style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Gerenciar
            </button>
          )}
          <button
            onClick={() => navigate('/suggestions/new')}
            style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Nova Sugestao
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Carregando...</div>
        ) : displaySuggestions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>
            <p>Nenhuma sugestao encontrada.</p>
            <button
              onClick={() => navigate('/suggestions/new')}
              style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 500, cursor: 'pointer', marginTop: '1rem' }}
            >
              Enviar primeira sugestao
            </button>
          </div>
        ) : (
          <div>
            {displaySuggestions.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--nexus-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: 'var(--nexus-card-soft)', color: 'var(--nexus-muted-2)' }}>
                    {categoryLabels[s.category] || s.category}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, ...(statusBadgeStyles[s.status] || statusBadgeStyles.pending) }}>
                    {statusLabels[s.status] || s.status}
                  </span>
                  {s.is_offensive === 1 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)' }}>
                      Ofensivo
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--nexus-text)' }}>{s.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--nexus-muted-2)', marginTop: '0.5rem' }}>
                  {new Date(s.created_at).toLocaleString('pt-BR')}
                  {!isAdminOrManager && s.admin_notes && ` — Nota: ${s.admin_notes}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
