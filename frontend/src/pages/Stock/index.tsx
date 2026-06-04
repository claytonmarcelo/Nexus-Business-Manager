import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { StockMovement, Product } from '../../types';

export function Stock() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ product_id: 0, type: 'in' as 'in' | 'out', quantity: 1, description: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [movRes, prodRes] = await Promise.all([api.get('/stock'), api.get('/products')]);
      setMovements(movRes.data);
      setProducts(prodRes.data);
    } catch { console.error('Erro ao carregar estoque'); }
    finally { setLoading(false); }
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-gray-500 mt-1">Movimentacoes de estoque</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">Nova Movimentacao</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma movimentacao encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Produto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Qtd</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Descricao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500">{new Date(m.created_at).toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-4 font-medium">{m.product_name}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${m.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {m.type === 'in' ? 'Entrada' : 'Saida'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{m.quantity}</td>
                    <td className="py-3 px-4 text-gray-500">{m.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-6">Nova Movimentacao</h2>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <select className="input-field" required value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: Number(e.target.value) })}>
                  <option value={0}>Selecione...</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} (qtd: {p.quantity})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select className="input-field" value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'in' | 'out' })}>
                  <option value="in">Entrada</option>
                  <option value="out">Saida</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                <input type="number" min="1" className="input-field" required value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <input type="text" className="input-field" value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
