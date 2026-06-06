import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { Sale, Client, Product } from '../../types';
import { useToast } from '../../contexts/ToastContext';

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

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [salRes, cliRes, prodRes] = await Promise.all([api.get('/sales'), api.get('/clients'), api.get('/products')]);
      setSales(salRes.data || []);
      setClients(cliRes.data || []);
      setProducts(prodRes.data || []);
    } catch { console.error('Erro ao carregar vendas'); }
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="text-brand-muted text-sm mt-0.5">Registro de vendas</p>
        </div>
        <button onClick={openCreate} className="btn-primary">Nova Venda</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-brand-muted">Carregando...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-brand-muted">Nenhuma venda encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-blackCherry text-brand-ivorySmoke">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Valor Total</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Observacoes</th>
                  <th className="text-center py-3 px-4 font-medium text-brand-ivorySmoke">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-[rgba(214,179,112,0.18)]">
                    <td className="py-3 px-4 text-brand-muted">{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4 font-medium">{s.client_name || '-'}</td>
                    <td className="py-3 px-4 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.total_value)}
                    </td>
                    <td className="py-3 px-4 text-brand-muted">{s.notes || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => openEdit(s)} className="text-brand-gold hover:text-brand-gold/80 text-xs font-medium mr-3">Editar</button>
                      <button onClick={() => handleDelete(s.id)} className="text-brand-danger hover:text-brand-danger/80 text-xs font-medium">Excluir</button>
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
          <div className="card rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-6">{editing ? 'Editar Venda' : 'Nova Venda'}</h2>
            {error && <div className="bg-red-500/20 text-red-500 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Cliente</label>
                <select className="input-field" value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}>
                  <option value={0}>Selecione...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-brand-muted mb-2">Itens</label>
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-end">
                      <select className="input-field flex-1" value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))} required>
                        <option value={0}>Produto...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} (qtd: {p.quantity})</option>)}
                      </select>
                      <input type="number" min="1" className="input-field w-20" placeholder="Qtd" value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} required />
                      <input type="number" step="0.01" min="0" className="input-field w-28" placeholder="Preco" value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))} required />
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} className="text-brand-danger hover:text-brand-danger/80 px-2">X</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addItem} className="text-brand-gold hover:text-brand-gold/80 text-sm font-medium">+ Adicionar item</button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-brand-muted mb-1">Observacoes</label>
                <input type="text" className="input-field" value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">{editing ? 'Salvar' : 'Concluir Venda'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
