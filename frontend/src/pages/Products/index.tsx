import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { Product } from '../../types';

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
      setProducts(res.data);
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="text-brand-graphiteWine/60 mt-1">Gerenciar catalogo de produtos</p>
        </div>
        <button onClick={openCreate} className="btn-primary">Novo Produto</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Carregando...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Nenhum produto encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-blackCherry text-brand-ivorySmoke">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Nome</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Categoria</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Preco</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Qtd</th>
                  <th className="text-right py-3 px-4 font-medium text-brand-ivorySmoke">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-[rgba(214,179,112,0.18)]">
                    <td className="py-3 px-4 font-medium">{product.name}</td>
                    <td className="py-3 px-4 text-brand-graphiteWine/70 font-mono">{product.sku}</td>
                    <td className="py-3 px-4">
                      {product.category ? (
                        <span className="badge bg-brand-graphiteWine/10 text-brand-graphiteWine">{product.category}</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4 font-medium">{formatPrice(product.price)}</td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${product.quantity <= 5 ? 'text-red-600' : 'text-brand-blackCherry'}`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => openEdit(product)} className="text-brand-roseGold hover:text-brand-champagneGold font-medium">Editar</button>
                      <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800 font-medium">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-brand-blackCherry/45 flex items-center justify-center z-50">
          <div className="card rounded-2xl w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold mb-6">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Nome</label>
                <input type="text" className="input-field" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blackCherry mb-1">SKU</label>
                  <input type="text" className="input-field" required value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-blackCherry mb-1">Categoria</label>
                  <input type="text" className="input-field" value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blackCherry mb-1">Preco</label>
                  <input type="number" step="0.01" min="0" className="input-field" required value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-blackCherry mb-1">Quantidade</label>
                  <input type="number" min="0" className="input-field" required value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">URL da Imagem</label>
                <input type="text" className="input-field" value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
