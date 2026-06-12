import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Sale, Client, Product } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { GradientButton } from '../../components/ui/GradientButton';

export function Sales() {
  const { showToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [formData, setFormData] = useState({ client_id: 0, notes: '', items: [{ product_id: 0, quantity: 1, unit_price: 0 }] });
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [salRes, cliRes, prodRes] = await Promise.all([api.get('/sales'), api.get('/clients'), api.get('/products')]);
      setSales(salRes.data?.data || []);
      setClients(cliRes.data?.data || []);
      setProducts(prodRes.data?.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar vendas:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar vendas';
      showToast(errorMsg, 'error');
    }
    finally { setLoading(false); }
  }

  function addItem() {
    setFormData({ ...formData, items: [...formData.items, { product_id: 0, quantity: 1, unit_price: 0 }] });
  }

  function removeItem(index: number) {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  }

  function updateItem(index: number, field: string, value: any) {
    const items = [...formData.items];
    (items[index] as any)[field] = value;
    setFormData({ ...formData, items });
  }

  function openCreate() {
    setEditing(null);
    setFormData({ client_id: 0, notes: '', items: [{ product_id: 0, quantity: 1, unit_price: 0 }] });
    setError('');
    setShowModal(true);
  }

  function openEdit(sale: Sale) {
    setEditing(sale);
    setFormData({ client_id: sale.client_id || 0, notes: sale.notes || '', items: [{ product_id: 0, quantity: 1, unit_price: 0 }] });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        const { items, ...rest } = formData;
        await api.put(`/sales/${editing.id}`, rest);
        showToast('Venda atualizada.');
      } else {
        await api.post('/sales', formData);
        showToast('Venda criada.');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao salvar venda');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Tem certeza que deseja excluir esta venda? O estoque sera estornado.')) return;
    try {
      await api.delete(`/sales/${id}`);
      showToast('Venda excluida.');
      loadData();
    } catch { showToast('Erro ao excluir venda.', 'error'); }
  }

  const totalPages = Math.ceil(sales.length / itemsPerPage);
  const paginatedSales = sales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  const columns: Column<Sale>[] = [
    {
      key: 'date',
      header: 'Data',
      render: (sale) => new Date(sale.created_at).toLocaleDateString('pt-BR'),
    },
    {
      key: 'client',
      header: 'Cliente',
      render: (sale) => sale.client_name || '-',
    },
    {
      key: 'value',
      header: 'Valor Total',
      render: (sale) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total_value),
    },
    {
      key: 'notes',
      header: 'Observações',
      render: (sale) => sale.notes || '-',
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (sale) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(sale)}
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
            onClick={() => handleDelete(sale.id)}
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Vendas</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Gerenciar vendas</p>
        </div>
        <GradientButton onClick={openCreate}>
          Nova Venda
        </GradientButton>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        <PremiumTable columns={columns} data={paginatedSales} loading={loading} />
        
        {!loading && sales.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--nexus-border)' }}>
            <div className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sales.length)} de {sales.length} vendas
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
                <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>{editing ? 'Editar Venda' : 'Nova Venda'}</h2>
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
                    Cliente
                  </label>
                  <select
                    style={{ width: '100%', padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}
                  >
                    <option value={0}>Selecione...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {!editing && (
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                      Itens
                    </label>
                    {formData.items.map((item, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                        <select
                          style={{ flex: 1, padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))}
                          required
                        >
                          <option value={0}>Produto...</option>
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name} (qtd: {p.quantity})</option>)}
                        </select>
                        <input
                          type="number"
                          min="1"
                          style={{ width: '5rem', padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
                          placeholder="Qtd"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          required
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          style={{ width: '7rem', padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
                          placeholder="Preço"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                          required
                        />
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            style={{ color: 'var(--nexus-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.5rem' }}
                          >
                            X
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addItem}
                      style={{ color: 'var(--nexus-gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
                    >
                      + Adicionar item
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted-2)' }}>
                    Observações
                  </label>
                  <input
                    type="text"
                    style={{ width: '100%', padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <GradientButton type="submit" className="flex-1">
                    {editing ? 'Salvar' : 'Concluir Venda'}
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
