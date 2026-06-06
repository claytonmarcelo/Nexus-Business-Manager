import { useState, useEffect, FormEvent, useMemo } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { Product, StockMovement } from '../../types';
import { StatsCard } from '../../components/ui/StatsCard';
import { PremiumTable, Column } from '../../components/ui/PremiumTable';
import { PremiumBadge } from '../../components/ui/PremiumBadge';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { GradientButton } from '../../components/ui/GradientButton';
import {
  CubeIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface StockProduct extends Product {
  min: number;
}

const mockProducts: StockProduct[] = [
  { id: 1, name: 'Teclado Mecanico RGB', sku: 'TCL-001', category: 'Perifericos', price: 289.90, quantity: 45, min: 20, image: null, created_by: 1, active: true, created_at: '', updated_at: '' },
  { id: 2, name: 'Monitor 27" 4K', sku: 'MON-001', category: 'Monitores', price: 2499.90, quantity: 12, min: 15, image: null, created_by: 1, active: true, created_at: '', updated_at: '' },
  { id: 3, name: 'Mouse Wireless', sku: 'MOU-001', category: 'Perifericos', price: 149.90, quantity: 78, min: 30, image: null, created_by: 1, active: true, created_at: '', updated_at: '' },
  { id: 4, name: 'Webcam HD 1080p', sku: 'WEB-001', category: 'Perifericos', price: 199.90, quantity: 3, min: 10, image: null, created_by: 1, active: true, created_at: '', updated_at: '' },
  { id: 5, name: 'Notebook Pro i7', sku: 'NTB-001', category: 'Computadores', price: 5999.90, quantity: 8, min: 10, image: null, created_by: 1, active: true, created_at: '', updated_at: '' },
  { id: 6, name: 'Fonte 650W 80Plus', sku: 'FON-001', category: 'Componentes', price: 399.90, quantity: 22, min: 15, image: null, created_by: 1, active: true, created_at: '', updated_at: '' },
  { id: 7, name: 'HD Externo 2TB', sku: 'HD-001', category: 'Armazenamento', price: 449.90, quantity: 0, min: 10, image: null, created_by: 1, active: true, created_at: '', updated_at: '' },
  { id: 8, name: 'Memoria RAM 16GB', sku: 'RAM-001', category: 'Componentes', price: 299.90, quantity: 30, min: 25, image: null, created_by: 1, active: true, created_at: '', updated_at: '' },
];

const mockMovements: StockMovement[] = [
  { id: 1, product_id: 1, type: 'in', quantity: 20, description: 'Compra de reposicao', reference_type: 'purchase', reference_id: 1, created_at: '2026-06-04T10:30:00', product_name: 'Teclado Mecanico RGB' },
  { id: 2, product_id: 3, type: 'in', quantity: 50, description: 'Estoque inicial', reference_type: null, reference_id: null, created_at: '2026-06-03T14:00:00', product_name: 'Mouse Wireless' },
  { id: 3, product_id: 2, type: 'out', quantity: 3, description: 'Venda #1024', reference_type: 'sale', reference_id: 1024, created_at: '2026-06-03T09:15:00', product_name: 'Monitor 27" 4K' },
  { id: 4, product_id: 5, type: 'out', quantity: 2, description: 'Venda #1021', reference_type: 'sale', reference_id: 1021, created_at: '2026-06-02T16:45:00', product_name: 'Notebook Pro i7' },
  { id: 5, product_id: 1, type: 'out', quantity: 5, description: 'Venda #1018', reference_type: 'sale', reference_id: 1018, created_at: '2026-06-02T11:20:00', product_name: 'Teclado Mecanico RGB' },
  { id: 6, product_id: 4, type: 'in', quantity: 10, description: 'Compra de reposicao', reference_type: 'purchase', reference_id: 2, created_at: '2026-06-01T08:00:00', product_name: 'Webcam HD 1080p' },
  { id: 7, product_id: 6, type: 'in', quantity: 15, description: 'Compra de reposicao', reference_type: 'purchase', reference_id: 3, created_at: '2026-05-30T14:30:00', product_name: 'Fonte 650W 80Plus' },
  { id: 8, product_id: 3, type: 'out', quantity: 12, description: 'Venda #1015', reference_type: 'sale', reference_id: 1015, created_at: '2026-05-29T10:00:00', product_name: 'Mouse Wireless' },
  { id: 9, product_id: 8, type: 'in', quantity: 30, description: 'Estoque inicial', reference_type: null, reference_id: null, created_at: '2026-05-28T09:00:00', product_name: 'Memoria RAM 16GB' },
  { id: 10, product_id: 4, type: 'out', quantity: 7, description: 'Venda #1012', reference_type: 'sale', reference_id: 1012, created_at: '2026-05-27T15:45:00', product_name: 'Webcam HD 1080p' },
];

function computeStatus(qty: number, min: number): 'normal' | 'baixo' | 'critico' {
  if (qty === 0) return 'critico';
  if (qty <= min) return 'baixo';
  return 'normal';
}

function statusVariant(s: 'normal' | 'baixo' | 'critico'): 'success' | 'warning' | 'danger' {
  if (s === 'normal') return 'success';
  if (s === 'baixo') return 'warning';
  return 'danger';
}

function statusLabel(s: 'normal' | 'baixo' | 'critico'): string {
  if (s === 'normal') return 'Normal';
  if (s === 'baixo') return 'Baixo';
  return 'Critico';
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

const ITEMS_PER_PAGE = 8;

export function Stock() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ product_id: 0, type: 'in' as 'in' | 'out', quantity: 1, description: '' });
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [usedMock, setUsedMock] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [movRes, prodRes] = await Promise.all([api.get('/stock'), api.get('/products')]);
      setMovements(movRes.data);
      setProducts(prodRes.data);
      setUsedMock(false);
    } catch {
      console.error('Erro ao carregar estoque, usando dados mock');
      setMovements(mockMovements);
      setProducts(mockProducts);
      setUsedMock(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/stock', formData);
      setShowModal(false);
      setFormData({ product_id: 0, type: 'in', quantity: 1, description: '' });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar movimentacao');
    }
  }

  const stockProducts: StockProduct[] = useMemo(() => {
    const source = usedMock ? mockProducts : products;
    return source.map(p => ({
      ...p,
      min: Math.max(5, Math.round(p.quantity * 0.3)),
    }));
  }, [products, usedMock]);

  const categories = useMemo(() => {
    const cats = new Set(stockProducts.map(p => p.category).filter(Boolean) as string[]);
    return Array.from(cats).sort();
  }, [stockProducts]);

  const filteredProducts = useMemo(() => {
    let result = stockProducts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => computeStatus(p.quantity, p.min) === statusFilter);
    }
    return result;
  }, [stockProducts, searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    const totalItems = stockProducts.reduce((s, p) => s + p.quantity, 0);
    const lowStockCount = stockProducts.filter(p => computeStatus(p.quantity, p.min) !== 'normal').length;
    const totalValue = stockProducts.reduce((s, p) => s + p.price * p.quantity, 0);
    const entriesCount = usedMock ? 156 : movements.filter(m => m.type === 'in').length;
    const exitsCount = usedMock ? 89 : movements.filter(m => m.type === 'out').length;
    return { totalItems, lowStockCount, totalValue, entriesCount, exitsCount };
  }, [stockProducts, movements, usedMock]);

  const columns: Column<StockProduct>[] = [
    {
      key: 'produto',
      header: 'Produto',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{ background: 'rgba(212, 149, 86, 0.1)', color: '#D49556' }}
          >
            {p.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--nexus-text)' }}>{p.name}</p>
            <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{p.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoria',
      hide: 'sm',
      render: (p) => (
        <span
          className="inline-block text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(212, 149, 86, 0.08)', color: 'var(--nexus-muted)' }}
        >
          {p.category || '-'}
        </span>
      ),
    },
    {
      key: 'sku',
      header: 'Codigo',
      hide: 'md',
      render: (p) => (
        <span className="text-xs font-mono" style={{ color: 'var(--nexus-muted-2)' }}>{p.sku}</span>
      ),
    },
    {
      key: 'estoque',
      header: 'Estoque',
      render: (p) => (
        <span className="font-semibold text-sm" style={{ color: 'var(--nexus-text)' }}>
          {formatNumber(p.quantity)}
        </span>
      ),
    },
    {
      key: 'minimo',
      header: 'Minimo',
      render: (p) => (
        <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{formatNumber(p.min)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => {
        const s = computeStatus(p.quantity, p.min);
        return <PremiumBadge variant={statusVariant(s)}>{statusLabel(s)}</PremiumBadge>;
      },
    },
    {
      key: 'valor_unitario',
      header: 'Valor Unit.',
      hide: 'md',
      render: (p) => (
        <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{formatPrice(p.price)}</span>
      ),
    },
    {
      key: 'valor_total',
      header: 'Valor Total',
      hide: 'lg',
      render: (p) => (
        <span className="text-sm font-semibold" style={{ color: 'var(--nexus-gold, #D49556)' }}>
          {formatPrice(p.price * p.quantity)}
        </span>
      ),
    },
    {
      key: 'acoes',
      header: 'Acoes',
      render: (p) => (
        <button
          onClick={() => {
            setFormData(prev => ({ ...prev, product_id: p.id }));
            setShowModal(true);
          }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{
            background: 'rgba(212, 149, 86, 0.1)',
            color: '#D49556',
            border: '1px solid rgba(212, 149, 86, 0.2)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 149, 86, 0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(212, 149, 86, 0.1)'; }}
        >
          Movimentar
        </button>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title" style={{ color: 'var(--nexus-text)' }}>Estoque</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
            Gerenciamento de inventario e movimentacoes
          </p>
        </div>
      </div>

      <div className="cards-grid cards-grid-6 mb-6">
        <StatsCard
          label="Produtos Cadastrados"
          value={formatNumber(stockProducts.length)}
          icon={<CubeIcon className="w-5 h-5" />}
          color="gold"
        />
        <StatsCard
          label="Itens em Estoque"
          value={formatNumber(stats.totalItems)}
          icon={<ArchiveBoxIcon className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          label="Estoque Baixo"
          value={formatNumber(stats.lowStockCount)}
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          color="rose"
          trend={stats.lowStockCount > 0 ? { value: String(stats.lowStockCount), direction: 'up' } : undefined}
          subtitle="itens preocupantes"
        />
        <StatsCard
          label="Valor Total"
          value={formatPrice(stats.totalValue)}
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
          color="gold"
        />
        <StatsCard
          label="Entradas"
          value={formatNumber(stats.entriesCount)}
          icon={<ArrowUpIcon className="w-5 h-5" />}
          color="green"
          subtitle="este mes"
        />
        <StatsCard
          label="Saidas"
          value={formatNumber(stats.exitsCount)}
          icon={<ArrowDownIcon className="w-5 h-5" />}
          color="rose"
          subtitle="este mes"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <SearchBar
          value={searchQuery}
          onChange={(v) => { setSearchQuery(v); setPage(1); }}
          placeholder="Buscar produto ou SKU..."
        />
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-xl text-sm"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(212,149,86,0.15)',
            color: 'var(--nexus-text)',
          }}
        >
          <option value="">Todas Categorias</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-xl text-sm"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(212,149,86,0.15)',
            color: 'var(--nexus-text)',
          }}
        >
          <option value="all">Todos Status</option>
          <option value="normal">Normal</option>
          <option value="baixo">Baixo</option>
          <option value="critico">Critico</option>
        </select>
        <GradientButton
          icon={<PlusIcon className="w-5 h-5" />}
          onClick={() => {
            setFormData({ product_id: 0, type: 'in', quantity: 1, description: '' });
            setError('');
            setShowModal(true);
          }}
        >
          Nova Movimentacao
        </GradientButton>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--nexus-card)',
          border: '1px solid var(--nexus-border)',
        }}
      >
        <PremiumTable
          columns={columns}
          data={paginatedProducts}
          loading={loading}
          emptyMessage="Nenhum produto encontrado."
        />
        <div className="px-4 pb-4">
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </motion.div>

      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-4 rounded-xl overflow-hidden"
            style={{
              background: 'var(--nexus-card)',
              border: '1px solid var(--nexus-border)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--nexus-border)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>
                Nova Movimentacao
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--nexus-muted-2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212,149,86,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              {error && (
                <div
                  className="px-4 py-3 rounded-lg mb-4 text-sm"
                  style={{ background: 'rgba(216, 75, 95, 0.1)', color: '#D84B5F', border: '1px solid rgba(216, 75, 95, 0.2)' }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-muted)' }}>
                    Produto
                  </label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl text-sm"
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: Number(e.target.value) })}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(212,149,86,0.15)',
                      color: 'var(--nexus-text)',
                    }}
                  >
                    <option value={0}>Selecione um produto...</option>
                    {stockProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (qtd: {p.quantity})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-muted)' }}>
                    Tipo
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'in' })}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{
                        background: formData.type === 'in' ? 'rgba(125, 218, 106, 0.15)' : 'rgba(0,0,0,0.3)',
                        color: formData.type === 'in' ? '#7DDA6A' : 'var(--nexus-muted)',
                        border: formData.type === 'in' ? '1px solid rgba(125, 218, 106, 0.3)' : '1px solid rgba(212,149,86,0.15)',
                      }}
                    >
                      <ArrowUpIcon className="w-4 h-4 inline mr-1.5" />
                      Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'out' })}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                      style={{
                        background: formData.type === 'out' ? 'rgba(216, 75, 95, 0.15)' : 'rgba(0,0,0,0.3)',
                        color: formData.type === 'out' ? '#D84B5F' : 'var(--nexus-muted)',
                        border: formData.type === 'out' ? '1px solid rgba(216, 75, 95, 0.3)' : '1px solid rgba(212,149,86,0.15)',
                      }}
                    >
                      <ArrowDownIcon className="w-4 h-4 inline mr-1.5" />
                      Saida
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-muted)' }}>
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2.5 rounded-xl text-sm"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(212,149,86,0.15)',
                      color: 'var(--nexus-text)',
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-muted)' }}>
                    Descricao
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl text-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Opcional..."
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(212,149,86,0.15)',
                      color: 'var(--nexus-text)',
                    }}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      color: 'var(--nexus-muted)',
                      border: '1px solid rgba(212,149,86,0.15)',
                    }}
                  >
                    Cancelar
                  </button>
                  <GradientButton type="submit">
                    Registrar
                  </GradientButton>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
