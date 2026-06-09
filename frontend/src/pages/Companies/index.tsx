import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { BuildingOfficeIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Company } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { GradientButton } from '../../components/ui/GradientButton';
import { useToast } from '../../contexts/ToastContext';

export function Companies() {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', document: '', phone: '', email: '' });
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data?.data || []);
    } catch { showToast('Erro ao carregar empresas', 'error'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ name: '', slug: '', document: '', phone: '', email: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(c: Company) {
    setEditing(c);
    setFormData({ name: c.name, slug: c.slug, document: c.document || '', phone: c.phone || '', email: c.email || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/companies/${editing.id}`, formData);
      } else {
        await api.post('/companies', formData);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar empresa');
    }
  }


  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Empresa',
      render: (c) => (
        <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>{c.name}</span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (c) => (
        <span className="font-mono text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{c.slug}</span>
      ),
    },
    {
      key: 'document',
      header: 'Documento',
      render: (c) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{c.document || '-'}</span>
      ),
    },
    {
      key: 'contact',
      header: 'Contato',
      render: (c) => (
        <span style={{ color: 'var(--nexus-muted-2)' }}>{c.email || c.phone || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acoes',
      render: (c) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => openEdit(c)}
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
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Empresas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Gerenciamento multiempresa</p>
        </div>
        <GradientButton onClick={openCreate} icon={<PlusIcon className="w-5 h-5" />}>
          Nova Empresa
        </GradientButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Empresas"
          value={String(companies.length)}
          icon={<BuildingOfficeIcon className="w-5 h-5" />}
          color="gold"
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        <PremiumTable columns={columns} data={companies} loading={loading} emptyMessage="Nenhuma empresa cadastrada." />
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
                {editing ? 'Editar Empresa' : 'Nova Empresa'}
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
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Nome *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Slug (identificador unico) *</label>
                <input
                  type="text" required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>CNPJ</label>
                  <input
                    type="text"
                    value={formData.document}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
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
