import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { listSuggestions, updateSuggestion, deleteSuggestion } from '../../services/suggestions.service';
import { Suggestion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  under_review: 'Em Análise',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  implemented: 'Implementada',
};

const statusBadgeStyles: Record<string, React.CSSProperties> = {
  pending: { background: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)' },
  under_review: { background: 'rgba(var(--nexus-blue-rgb),0.12)', color: 'var(--nexus-chart-blue)' },
  approved: { background: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)' },
  rejected: { background: 'rgba(var(--nexus-danger-rgb),0.12)', color: 'var(--nexus-danger)' },
  implemented: { background: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)' },
};

const categoryLabels: Record<string, string> = {
  general: 'Geral',
  improvement: 'Melhoria',
  feature: 'Funcionalidade',
  complaint: 'Reclamação',
  praise: 'Elogio',
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
      showToast('Sugestão excluida.');
      load();
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  }

  const canManage = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'manager';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>
          Gerenciar <span style={{ color: 'var(--nexus-gold)' }}>Sugestoes</span>
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>{total} sugestão(oes) encontrada(s)</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {statusFilterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusFilter(opt.value); setPage(1); }}
            style={{
              padding: '0.375rem 0.875rem',
              fontSize: '0.75rem',
              borderRadius: '8px',
              border: '1px solid',
              background: statusFilter === opt.value ? 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' : 'var(--nexus-card)',
              color: statusFilter === opt.value ? '#fff' : 'var(--nexus-text)',
              borderColor: statusFilter === opt.value ? 'transparent' : 'var(--nexus-border)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Carregando...</div>
      ) : suggestions.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Nenhuma sugestão encontrada.</div>
      ) : (
        <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
          {suggestions.map((s) => (
            <div
              key={s.id}
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--nexus-border)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
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
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--nexus-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--nexus-muted-2)' }}>
                  <span>Por {s.user_name}</span>
                  <span>{new Date(s.created_at).toLocaleString('pt-BR')}</span>
                </div>
                {s.admin_notes && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--nexus-card-soft)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--nexus-muted-2)', fontStyle: 'italic' }}>
                    Nota: {s.admin_notes}
                  </div>
                )}
              </div>
              {canManage && (
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(s)}
                    style={{ color: 'var(--nexus-gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8125rem' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{ color: 'var(--nexus-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.8125rem' }}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{ background: page <= 1 ? 'var(--nexus-card)' : 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.5rem 1rem', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: page <= 1 ? 0.5 : 1 }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--nexus-gold)', fontWeight: 600 }}>
            Pagina {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.5rem 1rem', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: page >= totalPages ? 0.5 : 1 }}
          >
            Proxima
          </button>
        </div>
      )}

      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--nexus-overlay)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '32rem', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--nexus-text)', marginBottom: '1rem' }}>
              Editar Sugestão <span style={{ color: 'var(--nexus-gold)' }}>#{selected.id}</span>
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Notas do Administrador</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', resize: 'vertical', minHeight: '100px' }}
                placeholder="Adicione uma observação sobre esta sugestão..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={handleUpdate}
                style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 500, cursor: 'pointer' }}
              >
                Salvar
              </button>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
