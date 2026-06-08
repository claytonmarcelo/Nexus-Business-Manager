import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { CubeIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { Product } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { PremiumBadge } from '../../components/ui/PremiumBadge';
import { GradientButton } from '../../components/ui/GradientButton';

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', price: 0, quantity: 0, image: '',
  });
  const [error, setError] = useState('');

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      const res = await api.get('/products');
      setProducts(res.data?.data || []);
    } catch { console.error('Erro ao carregar produtos'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', category: '', price: 0, quantity: 0, image: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      price: product.price,
      quantity: product.quantity,
      image: product.image || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const payload = { ...formData, price: Number(formData.price), quantity: Number(formData.quantity) };
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar produto');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch { console.error('Erro ao excluir produto'); }
  }

  function formatPrice(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Nome',
      render: (product) => (
        <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>{product.name}</span>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (product) => (
        <span className="font-mono text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{product.sku}</span>
      ),
    },
    {
      key: 'category',
      header: 'Categoria',
      render: (product) => (
        product.category ? (
          <PremiumBadge variant="success">{product.category}</PremiumBadge>
        ) : (
          <span style={{ color: 'var(--nexus-muted-2)' }}>-</span>
        )
      ),
    },
    {
      key: 'price',
      header: 'Preco',
      render: (product) => (
        <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>{formatPrice(product.price)}</span>
      ),
    },
    {
      key: 'quantity',
      header: 'Qtd',
      render: (product) => (
        <span className="font-semibold" style={{ color: product.quantity <= 5 ? 'var(--nexus-danger)' : 'var(--nexus-text)' }}>
          {product.quantity}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acoes',
      render: (product) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => openEdit(product)}
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
            onClick={() => handleDelete(product.id)}
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Produtos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Gerenciar catalogo de produtos</p>
        </div>
        <GradientButton onClick={openCreate} icon={<PlusIcon className="w-5 h-5" />}>
          Novo Produto
        </GradientButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Total Produtos"
          value={String(products.length)}
          icon={<CubeIcon className="w-5 h-5" />}
          color="gold"
        />
        <StatsCard
          label="Estoque Baixo"
          value={String(products.filter(p => p.quantity <= 5).length)}
          icon={<CubeIcon className="w-5 h-5" />}
          color="rose"
          trend={products.filter(p => p.quantity <= 5).length > 0 ? { value: String(products.filter(p => p.quantity <= 5).length), direction: 'up' } : undefined}
          subtitle="itens preocupantes"
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
        <PremiumTable columns={columns} data={products} loading={loading} emptyMessage="Nenhum produto encontrado." />
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
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>SKU *</label>
                  <input
                    type="text" required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Preco *</label>
                  <input
                    type="number" step="0.01" min="0" required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>Quantidade *</label>
                  <input
                    type="number" min="0" required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                    style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-text)' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb),0.15)'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-muted-2)' }}>URL da Imagem</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
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
