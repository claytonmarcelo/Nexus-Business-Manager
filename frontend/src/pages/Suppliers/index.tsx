import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { GradientButton } from '../../components/ui/GradientButton';
import api from '../../services/api';
import { Supplier } from '../../types';
import { useToast } from '../../contexts/ToastContext';

export function Suppliers() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ company_name: '', phone: '', email: '', contact_name: '' });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => { loadSuppliers(); }, []);

  async function loadSuppliers() {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data?.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar fornecedores:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar fornecedores';
      showToast(errorMsg, 'error');
    } finally { setLoading(false); }
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
        showToast('Fornecedor atualizado com sucesso');
      } else {
        await api.post('/suppliers', formData);
        showToast('Fornecedor criado com sucesso');
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar fornecedor');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      showToast('Fornecedor excluído com sucesso');
      loadSuppliers();
    } catch { showToast('Erro ao excluir fornecedor', 'error'); }
  }

  const filtered = suppliers.filter((s) =>
    !search ||
    s.company_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search)
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedSuppliers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  const columns: Column<Supplier>[] = [
    {
      key: 'company_name',
      header: 'Empresa',
      render: (s) => s.company_name,
    },
    {
      key: 'contact_name',
      header: 'Contato',
      render: (s) => s.contact_name || '-',
    },
    {
      key: 'phone',
      header: 'Telefone',
      render: (s) => s.phone || '-',
    },
    {
      key: 'email',
      header: 'Email',
      render: (s) => s.email || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={s.active
            ? { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid #22c55e' }
            : { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444' }
          }
        >
          {s.active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (s) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(s)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
            style={{
              color: 'var(--nexus-gold)',
              background: 'rgba(var(--nexus-gold-rgb), 0.1)',
              border: '1px solid rgba(var(--nexus-gold-rgb), 0.2)',
            }}
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
          >
            Excluir
          </button>
        </div>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fornecedores</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Gerenciar fornecedores
          </p>
        </div>
        <GradientButton onClick={openCreate}>
          <PlusIcon className="w-4 h-4" />
          Novo Fornecedor
        </GradientButton>
      </div>

      <div className="nexus-card p-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--nexus-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar fornecedores..."
            className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: 'var(--nexus-bg)',
              border: '1px solid var(--nexus-border)',
              color: 'var(--nexus-text)',
            }}
          />
        </div>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        <PremiumTable columns={columns} data={paginatedSuppliers} loading={loading} />
        
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--nexus-border)' }}>
            <div className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} fornecedores
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: currentPage === page ? 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-bronze))' : 'var(--nexus-card-soft)',
                    color: currentPage === page ? '#000' : 'var(--nexus-text)',
                    border: currentPage === page ? 'none' : '1px solid var(--nexus-border)',
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--nexus-overlay)' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-muted-2)' }}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div
                  className="px-4 py-3 rounded-xl mb-4 text-sm"
                  style={{ background: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                    Empresa <span style={{ color: 'var(--nexus-rose)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                      style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                    Nome do Contato
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <GradientButton type="submit" className="flex-1">
                    {editing ? 'Salvar' : 'Cadastrar'}
                  </GradientButton>
                  <GradientButton
                    type="button"
                    variant="secondary"
                    onClick={() => setShowModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </GradientButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
