import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listSuggestions, updateSuggestion, deleteSuggestion } from '../../services/suggestions.service';
import { Suggestion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const statusLabels: Record<string, string> = {
  pending: 'Pendente', under_review: 'Em Análise', approved: 'Aprovada',
  rejected: 'Rejeitada', implemented: 'Implementada',
};

const statusBadgeStyles: Record<string, React.CSSProperties> = {
  pending: { background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' },
  under_review: { background: 'rgba(var(--nexus-blue-rgb),0.12)', color: 'var(--nexus-chart-blue)' },
  approved: { background: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)' },
  rejected: { background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)' },
  implemented: { background: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)' },
};

const categoryLabels: Record<string, string> = {
  general: 'Geral', improvement: 'Melhoria', feature: 'Funcionalidade',
  complaint: 'Reclamação', praise: 'Elogio',
};

const statusFilterOptions = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'under_review', label: 'Em Análise' },
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
      showToast('Erro ao carregar sugestões.', 'error');
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
      showToast('Sugestão atualizada com sucesso.');
      setSelected(null);
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao atualizar.', 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Tem certeza que deseja excluir esta sugestão?')) return;
    try {
      await deleteSuggestion(id);
      showToast('Sugestão excluída.');
      load();
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  const canManage = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6 bg-transparent">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>
          Gerenciar <span style={{ color: 'var(--nexus-gold)' }}>Sugestões</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>{total} sugestão(ões) encontrada(s)</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusFilterOptions.map((opt) => (
          <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
            style={{
              background: statusFilter === opt.value ? 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' : 'var(--nexus-card)',
              color: statusFilter === opt.value ? '#FFFFFF' : 'var(--nexus-text)',
              border: statusFilter === opt.value ? 'none' : '1px solid var(--nexus-border)',
            }}>
            {opt.label}
          </button>
        ))}
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
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Nenhuma sugestão encontrada.</p>
          </div>
        ) : (
          <div>
            {suggestions.map((s) => (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="px-5 py-4 transition-colors"
                style={{ borderBottom: '1px solid var(--nexus-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--nexus-bg-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-muted-2)' }}>
                        {categoryLabels[s.category] || s.category}
                      </span>
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                        style={statusBadgeStyles[s.status] || statusBadgeStyles.pending}>
                        {statusLabels[s.status] || s.status}
                      </span>
                      {s.is_offensive === 1 && (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)' }}>
                          Ofensivo
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--nexus-text)' }}>{s.title}</h3>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--nexus-muted)' }}>{s.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <span>Por {s.user_name}</span>
                      <span>{new Date(s.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    {s.admin_notes && (
                      <div className="mt-2 p-2.5 rounded-lg text-xs italic" style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-muted-2)' }}>
                        Nota: {s.admin_notes}
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(s)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--nexus-gold)', border: '1px solid var(--nexus-border)' }}>
                        Editar
                      </button>
                      <button onClick={() => handleDelete(s.id)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--nexus-danger)', border: '1px solid var(--nexus-border)' }}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
            style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
            Anterior
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--nexus-gold)' }}>
            Página {page} de {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
            style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
            Próxima
          </button>
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--nexus-overlay)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelected(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl p-6 w-full max-w-lg"
              style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)' }}
              onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
                Editar Sugestão <span style={{ color: 'var(--nexus-gold)' }}>#{selected.id}</span>
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-text)' }}>Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none transition-all"
                  style={{ background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-text)' }}>Notas do Administrador</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl outline-none transition-all resize-vertical"
                  style={{ background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', minHeight: '100px' }}
                  placeholder="Adicione uma observação sobre esta sugestão..." />
              </div>

              <div className="flex gap-3">
                <button onClick={handleUpdate}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: '#FFFFFF' }}>
                  Salvar
                </button>
                <button onClick={() => setSelected(null)}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl"
                  style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}>
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
