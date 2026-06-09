import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Purchase, Supplier, Product } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { PremiumBadge } from '../../components/ui/PremiumBadge';
import { GradientButton } from '../../components/ui/GradientButton';
import { CubeIcon, CurrencyDollarIcon, TruckIcon } from '@heroicons/react/24/outline';

export function Purchases() {
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ supplier_id: 0, notes: '', items: [{ product_id: 0, quantity: 1, unit_price: 0 }] });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [purRes, supRes, prodRes] = await Promise.all([api.get('/purchases'), api.get('/suppliers'), api.get('/products')]);
      setPurchases(purRes.data?.data || []);
      setSuppliers(supRes.data?.data || []);
      setProducts(prodRes.data?.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar compras:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || 'Erro ao carregar compras';
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/purchases', formData);
      setShowModal(false);
      setFormData({ supplier_id: 0, notes: '', items: [{ product_id: 0, quantity: 1, unit_price: 0 }] });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao criar compra');
    }
  }

  async function handleReceive(id: number) {
    try {
      await api.post(`/purchases/${id}/receive`);
      showToast('Compra recebida e estoque atualizado.');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Erro ao receber compra', 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Excluir esta compra?')) return;
    try {
      await api.delete(`/purchases/${id}`);
      showToast('Compra excluida.');
      loadData();
    } catch { showToast('Erro ao excluir.', 'error'); }
  }

  const statusVariant: Record<string, 'warning' | 'success' | 'danger'> = {
    pending: 'warning',
    received: 'success',
    cancelled: 'danger',
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendente', received: 'Recebido', cancelled: 'Cancelado',
  };

  const columns: Column<Purchase>[] = [
    {
      key: 'date',
      header: 'Data',
      render: (purchase) => new Date(purchase.created_at).toLocaleDateString('pt-BR'),
    },
    {
      key: 'supplier',
      header: 'Fornecedor',
      render: (purchase) => purchase.supplier_name || '-',
    },
    {
      key: 'value',
      header: 'Valor Total',
      render: (purchase) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(purchase.total_value),
    },
    {
      key: 'status',
      header: 'Status',
      render: (purchase) => (
        <PremiumBadge variant={statusVariant[purchase.status] || 'default'}>
          {statusLabel[purchase.status] || purchase.status}
        </PremiumBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (purchase) => (
        <div className="flex items-center gap-2">
          {purchase.status === 'pending' && (
            <button
              onClick={() => handleReceive(purchase.id)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{
                color: 'var(--nexus-success)',
                background: 'rgba(var(--nexus-success-rgb), 0.1)',
                border: '1px solid rgba(var(--nexus-success-rgb), 0.2)',
              }}
            >
              Receber
            </button>
          )}
          <button
            onClick={() => handleDelete(purchase.id)}
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Compras</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Pedidos de compra</p>
        </div>
        <GradientButton onClick={() => { setShowModal(true); setError(''); }}>
          Nova Compra
        </GradientButton>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        <PremiumTable columns={columns} data={purchases} loading={loading} />
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
                <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>Nova Compra</h2>
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
                    Fornecedor
                  </label>
                  <select
                    style={{ width: '100%', padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: Number(e.target.value) })}
                  >
                    <option value={0}>Selecione...</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                  </select>
                </div>

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
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                    Criar Compra
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
