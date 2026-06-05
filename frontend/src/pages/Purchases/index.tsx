import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { Purchase, Supplier, Product } from '../../types';

export function Purchases() {
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
      setPurchases(purRes.data);
      setSuppliers(supRes.data);
      setProducts(prodRes.data);
    } catch { console.error('Erro ao carregar compras'); }
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
      setError(err.response?.data?.error || 'Erro ao criar compra');
    }
  }

  async function handleReceive(id: number) {
    try {
      await api.post(`/purchases/${id}/receive`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao receber compra');
    }
  }

  const statusBadge: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    received: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pendente',
    received: 'Recebido',
    cancelled: 'Cancelado',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-gray-500 mt-1">Pedidos de compra</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(''); }} className="btn-primary">Nova Compra</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : purchases.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma compra encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-graphiteWine text-brand-ivorySmoke">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Fornecedor</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Valor Total</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-brand-ivorySmoke">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4 font-medium">{p.supplier_name || '-'}</td>
                    <td className="py-3 px-4 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.total_value)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${statusBadge[p.status]}`}>{statusLabel[p.status]}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'pending' && (
                        <button onClick={() => handleReceive(p.id)} className="text-green-600 hover:text-green-800 font-medium">Receber</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6">Nova Compra</h2>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                <select className="input-field" value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: Number(e.target.value) })}>
                  <option value={0}>Selecione...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Itens</label>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-end">
                    <select className="input-field flex-1" value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))} required>
                      <option value={0}>Produto...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min="1" className="input-field w-20" placeholder="Qtd" value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} required />
                    <input type="number" step="0.01" min="0" className="input-field w-28" placeholder="Preco" value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))} required />
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 px-2">X</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addItem} className="text-brand-roseGold hover:text-brand-champagneGold text-sm font-medium">+ Adicionar item</button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <input type="text" className="input-field" value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Criar Compra</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
