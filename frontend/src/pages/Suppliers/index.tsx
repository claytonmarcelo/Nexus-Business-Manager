import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { BuildingOffice2Icon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Supplier } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { GradientButton } from '../../components/ui/GradientButton';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ company_name: '', phone: '', email: '', contact_name: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadSuppliers(); }, []);

  async function loadSuppliers() {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data?.data || []);
    } catch { console.error('Erro ao carregar fornecedores'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ company_name: '', phone: '', email: '', contact_name: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setFormData({ company_name: s.company_name, phone: s.phone || '', email: s.email || '', contact_name: s.contact_name || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar fornecedor');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      loadSuppliers();
    } catch { console.error('Erro ao excluir fornecedor'); }
  }

  const columns: Column<Supplier>[] = [
    {
      key: 'company',
      header: 'Empresa',
      render: (s) => (
        <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>{s.company_name}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (s) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{s.phone || '-'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (s) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{s.email || '-'}</span>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (s) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{s.contact_name || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acoes',
      render: (s) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => openEdit(s)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: 'var(--nexus-gold)',
              background: 'rgba(var(--nexus-gold-rgb), 0.1)',
              border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.1)'; }}
          >
            Editar
          </button>
          <button
            onClick={() => handleDelete(s.id)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: 'var(--nexus-danger)',
              background: 'rgba(var(--nexus-danger-rgb), 0.1)',
              border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(var(--nexus-danger-rgb), 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(var(--nexus-danger-rgb), 0.1)'; }}
          >
            Excluir
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Fornecedores</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Cadastro de fornecedores</p>
        </div>
        <GradientButton onClick={openCreate} icon={<PlusIcon className="w-5 h-5" />}>
          Novo Fornecedor
        </GradientButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Fornecedores"
          value={String(suppliers.length)}
          icon={<BuildingOffice2Icon className="w-5 h-5" />}
          color="gold"
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        <PremiumTable columns={columns} data={suppliers} loading={loading} emptyMessage="Nenhum fornecedor encontrado." />
      </div>

      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--nexus-overlay)' }}
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>
                {editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--nexus-muted-2)', background: 'var(--nexus-card-soft)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg mb-4 text-sm" style={{ background: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Empresa *</label>
                <input
                  type="text" required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Telefone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Nome do Contato</label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <GradientButton variant="secondary" type="button" onClick={() => setShowModal(false)}>
                  Cancelar
                </GradientButton>
                <GradientButton type="submit">
                  Salvar
                </GradientButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
