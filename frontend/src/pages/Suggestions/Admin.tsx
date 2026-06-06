import { useState, useEffect } from 'react';
import { listSuggestions, updateSuggestion, deleteSuggestion } from '../../services/suggestions.service';
import { Suggestion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  under_review: 'Em Analise',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  implemented: 'Implementada',
};

const statusColors: Record<string, string> = {
  pending: 'text-yellow-500',
  under_review: 'text-blue-500',
  approved: 'text-green-500',
  rejected: 'text-red-500',
  implemented: 'text-brand-primary',
};

const categoryLabels: Record<string, string> = {
  general: 'Geral',
  improvement: 'Melhoria',
  feature: 'Funcionalidade',
  complaint: 'Reclamacao',
  praise: 'Elogio',
};

const statusFilterOptions = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'under_review', label: 'Em Analise' },
  { value: 'approved', label: 'Aprovadas' },
  { value: 'rejected', label: 'Rejeitadas' },
  { value: 'implemented', label: 'Implementadas' },
];

export function AdminSuggestions() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const limit = 20;

  useEffect(() => { load(); }, [page, statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await listSuggestions({ page, limit, status: statusFilter || undefined });
      setSuggestions(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      showToast('Erro ao carregar sugestoes.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openEdit(s: Suggestion) {
    setSelected(s);
    setAdminNotes(s.admin_notes || '');
    setNewStatus(s.status);
  }

  async function handleUpdate() {
    if (!selected) return;
    try {
      await updateSuggestion(selected.id, { status: newStatus, admin_notes: adminNotes || null });
      showToast('Sugestao atualizada com sucesso.');
      setSelected(null);
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao atualizar.', 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Tem certeza que deseja excluir esta sugestao?')) return;
    try {
      await deleteSuggestion(id);
      showToast('Sugestao excluida.');
      load();
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  const canManage = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Gerenciar Sugestoes</h1>
          <p className="text-brand-graphiteWine/60 mt-1">{total} sugestao(oes) encontrada(s)</p>
        </div>

        <div className="flex gap-2">
          {statusFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'border-brand-ivorySmoke text-brand-graphiteWine/70 hover:border-brand-primary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-brand-graphiteWine/70">Carregando...</div>
      ) : suggestions.length === 0 ? (
        <div className="card p-8 text-center text-brand-graphiteWine/70">Nenhuma sugestao encontrada.</div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-ivorySmoke/50 text-brand-graphiteWine/70">
                      {categoryLabels[s.category] || s.category}
                    </span>
                    <span className={`text-xs font-medium ${statusColors[s.status] || ''}`}>
                      {statusLabels[s.status] || s.status}
                    </span>
                    {s.is_offensive === 1 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                        Ofensivo
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-brand-graphiteWine/90 truncate">{s.title}</h3>
                  <p className="text-sm text-brand-graphiteWine/70 mt-1 line-clamp-2">{s.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-brand-graphiteWine/50">
                    <span>Por {s.user_name}</span>
                    <span>{new Date(s.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  {s.admin_notes && (
                    <div className="mt-2 p-2 bg-brand-ivorySmoke/30 rounded text-xs text-brand-graphiteWine/70 italic">
                      Nota: {s.admin_notes}
                    </div>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(s)} className="btn-secondary text-xs px-3 py-1.5">
                      Editar
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs px-3 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="flex items-center text-sm text-brand-graphiteWine/70">
            Pagina {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div className="card max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Editar Sugestao #{selected.id}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-graphiteWine/80 mb-1">Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input-field">
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-graphiteWine/80 mb-1">Notas do Administrador</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="input-field min-h-[100px] resize-y"
                  placeholder="Adicione uma observacao sobre esta sugestao..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleUpdate} className="btn-primary">Salvar</button>
              <button onClick={() => setSelected(null)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
