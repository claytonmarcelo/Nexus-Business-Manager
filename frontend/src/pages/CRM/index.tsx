import { useState, useEffect, FormEvent } from 'react';
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
  new: 'text-blue-400', contacted: 'text-yellow-500', qualified: 'text-purple-400',
  proposal: 'text-orange-400', negotiation: 'text-rose-400', won: 'text-green-500', lost: 'text-red-500',
};

const statusBgColors: Record<string, string> = {
  new: 'bg-blue-500/20 border-blue-500/30', contacted: 'bg-yellow-500/20 border-yellow-500/30',
  qualified: 'bg-purple-500/20 border-purple-500/30', proposal: 'bg-orange-500/20 border-orange-500/30',
  negotiation: 'bg-rose-500/20 border-rose-500/30', won: 'bg-green-500/20 border-green-500/30',
  lost: 'bg-red-500/20 border-red-500/30',
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
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="text-brand-muted text-sm mt-0.5">Gestao de leads e oportunidades</p>
        </div>
        <button onClick={openCreate} className="btn-primary">Novo Lead</button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {statusOptions.map((opt) => (
          <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              statusFilter === opt.value
                ? 'bg-brand-primary/20 text-brand-gold border-brand-primary/40'
                : 'border-brand-border text-brand-muted hover:border-brand-primary/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-brand-muted">Carregando...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-brand-muted">Nenhum lead encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left py-3 px-4 font-medium text-brand-muted">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-muted">Contato</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-muted">Empresa</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-muted">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-muted">Valor</th>
                  <th className="text-center py-3 px-4 font-medium text-brand-muted">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-brand-primary/5 transition-colors">
                    <td className="py-3 px-4 font-medium">{lead.name}</td>
                    <td className="py-3 px-4 text-brand-muted text-xs">
                      {lead.email && <div>{lead.email}</div>}
                      {lead.phone && <div>{lead.phone}</div>}
                    </td>
                    <td className="py-3 px-4 text-brand-muted">{lead.company || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${statusBgColors[lead.status] || ''} ${statusColors[lead.status] || ''}`}>
                        {statusLabels[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {lead.value > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => openEdit(lead)} className="text-brand-gold hover:text-brand-gold/80 text-xs font-medium mr-3">Editar</button>
                      <button onClick={() => handleDelete(lead.id)} className="text-brand-danger hover:text-brand-danger/80 text-xs font-medium">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowModal(false)}>
          <div className="card max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-6">{editing ? 'Editar Lead' : 'Novo Lead'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Nome *</label>
                <input type="text" className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required minLength={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-muted mb-1">Email</label>
                  <input type="email" className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-muted mb-1">Telefone</label>
                  <input type="text" className="input-field" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-muted mb-1">Empresa</label>
                  <input type="text" className="input-field" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-muted mb-1">Status</label>
                  <select className="input-field" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    {Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-muted mb-1">Valor Potencial</label>
                  <input type="number" step="0.01" min="0" className="input-field" value={formData.value} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-muted mb-1">Proximo Contato</label>
                  <input type="datetime-local" className="input-field" value={formData.next_follow_up} onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Observacoes</label>
                <textarea className="input-field min-h-[80px] resize-y" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary">{editing ? 'Salvar' : 'Criar Lead'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
