import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSuggestions } from '../../services/suggestions.service';
import { Suggestion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const statusLabels: Record<string, string> = {
  pending: 'Pendente', under_review: 'Em Analise', approved: 'Aprovada',
  rejected: 'Rejeitada', implemented: 'Implementada',
};

const statusColors: Record<string, string> = {
  pending: 'text-yellow-500', under_review: 'text-blue-500', approved: 'text-green-500',
  rejected: 'text-red-500', implemented: 'text-brand-gold',
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

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const userSuggestions = suggestions.filter((s) => s.user_id === user?.id);
  const displaySuggestions = isAdminOrManager ? suggestions : userSuggestions;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Sugestoes</h1>
          <p className="text-brand-muted text-sm mt-0.5">
            {isAdminOrManager ? 'Todas as sugestoes recebidas' : 'Minhas sugestoes'}
          </p>
        </div>
        <div className="flex gap-3">
          {isAdminOrManager && (
            <button onClick={() => navigate('/suggestions/admin')} className="btn-secondary">
              Gerenciar
            </button>
          )}
          <button onClick={() => navigate('/suggestions/new')} className="btn-primary">
            Nova Sugestao
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-brand-muted">Carregando...</div>
        ) : displaySuggestions.length === 0 ? (
          <div className="p-8 text-center text-brand-muted">
            <p>Nenhuma sugestao encontrada.</p>
            <button onClick={() => navigate('/suggestions/new')} className="btn-primary mt-4">
              Enviar primeira sugestao
            </button>
          </div>
        ) : (
          <div className="divide-y divide-brand-border/50">
            {displaySuggestions.map((s) => (
              <div key={s.id} className="p-4 hover:bg-brand-primary/5 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-card/50 text-brand-muted">
                    {categoryLabels[s.category] || s.category}
                  </span>
                  <span className={`text-xs font-medium ${statusColors[s.status] || ''}`}>
                    {statusLabels[s.status] || s.status}
                  </span>
                  {s.is_offensive === 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-medium">Ofensivo</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="text-xs text-brand-muted mt-1 line-clamp-2">{s.description}</p>
                <p className="text-xs text-brand-muted-2 mt-1">
                  {new Date(s.created_at).toLocaleString('pt-BR')}
                  {!isAdminOrManager && s.admin_notes && ` — Nota: ${s.admin_notes}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
