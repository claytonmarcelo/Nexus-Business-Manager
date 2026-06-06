import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  value: number;
  notes: string | null;
  next_follow_up: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  new: 'Novo', contacted: 'Contactado', qualified: 'Qualificado',
  proposal: 'Proposta', negotiation: 'Negociacao', won: 'Ganho', lost: 'Perdido',
};

const statusColors: Record<string, string> = {
  new: '#60a5fa', contacted: '#D89A28', qualified: '#a78bfa',
  proposal: '#f97316', negotiation: '#C65A71', won: '#7DDA6A', lost: '#D84B5F',
};

const statusBgColors: Record<string, string> = {
  new: 'rgba(96, 165, 250, 0.12)', contacted: 'rgba(216, 154, 40, 0.12)',
  qualified: 'rgba(167, 139, 250, 0.12)', proposal: 'rgba(249, 115, 22, 0.12)',
  negotiation: 'rgba(198, 90, 113, 0.12)', won: 'rgba(125, 218, 106, 0.12)',
  lost: 'rgba(216, 75, 95, 0.12)',
};

export function CRM() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', status: 'new', value: 0, notes: '', next_follow_up: '' });

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/crm', { params: { status: statusFilter || undefined } });
      setLeads(res.data.data || []);
    } catch { showToast('Erro ao carregar leads.', 'error'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ name: '', email: '', phone: '', company: '', status: 'new', value: 0, notes: '', next_follow_up: '' });
    setShowModal(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setFormData({
      name: lead.name, email: lead.email || '', phone: lead.phone || '',
      company: lead.company || '', status: lead.status, value: lead.value,
      notes: lead.notes || '', next_follow_up: lead.next_follow_up || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/crm/${editing.id}`, formData);
        showToast('Lead atualizado.');
      } else {
        await api.post('/crm', formData);
        showToast('Lead criado.');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao salvar.', 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Excluir este lead?')) return;
    try {
      await api.delete(`/crm/${id}`);
      showToast('Lead excluido.');
      load();
    } catch { showToast('Erro ao excluir.', 'error'); }
  }

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'new', label: 'Novos' },
    { value: 'contacted', label: 'Contactados' },
    { value: 'qualified', label: 'Qualificados' },
    { value: 'proposal', label: 'Proposta' },
    { value: 'negotiation', label: 'Negociacao' },
    { value: 'won', label: 'Ganhos' },
    { value: 'lost', label: 'Perdidos' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>CRM</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Gestao de leads e oportunidades</p>
        </div>
        <button onClick={openCreate} style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 500, cursor: 'pointer' }}>Novo Lead</button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {statusOptions.map((opt) => (
          <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
            style={{
              padding: '0.375rem 0.75rem', fontSize: '0.75rem', borderRadius: '9999px', border: '1px solid',
              background: statusFilter === opt.value ? 'rgba(212, 149, 86, 0.2)' : 'transparent',
              borderColor: statusFilter === opt.value ? 'rgba(212, 149, 86, 0.4)' : 'var(--nexus-border)',
              color: statusFilter === opt.value ? 'var(--nexus-gold)' : 'var(--nexus-muted-2)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(212, 149, 86, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = statusFilter === opt.value ? 'rgba(212, 149, 86, 0.4)' : 'var(--nexus-border)'}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)', fontSize: '0.875rem' }}>Carregando...</div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Nenhum lead encontrado.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Nome</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Contato</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Empresa</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Valor</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid rgba(212,149,86,0.05)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,149,86,0.04)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500 }}>{lead.name}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--nexus-muted-2)', fontSize: '0.75rem' }}>
                      {lead.email && <div>{lead.email}</div>}
                      {lead.phone && <div>{lead.phone}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--nexus-muted-2)', fontSize: '0.875rem' }}>{lead.company || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem',
                        borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, border: '1px solid',
                        background: statusBgColors[lead.status] || 'rgba(128,128,128,0.12)',
                        borderColor: `${statusColors[lead.status]}40`,
                        color: statusColors[lead.status] || '#999',
                      }}>
                        {statusLabels[lead.status] || lead.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500 }}>
                      {lead.value > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--nexus-text)', fontSize: '0.875rem', textAlign: 'center' }}>
                      <button onClick={() => openEdit(lead)} style={{ color: '#D49556', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', marginRight: '0.75rem' }}>Editar</button>
                      <button onClick={() => handleDelete(lead.id)} style={{ color: '#D84B5F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--nexus-text)', marginBottom: '1.5rem' }}>{editing ? 'Editar Lead' : 'Novo Lead'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Nome *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} minLength={2}
                  style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Telefone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Empresa</label>
                  <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', outline: 'none' }}>
                    {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Valor Potencial</label>
                  <input type="number" step="0.01" min="0" value={formData.value} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Proximo Contato</label>
                  <input type="datetime-local" value={formData.next_follow_up} onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                    style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Observacoes</label>
                <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.625rem 1.25rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>{editing ? 'Salvar' : 'Criar Lead'}</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.625rem 1.25rem', cursor: 'pointer', fontSize: '0.875rem' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
