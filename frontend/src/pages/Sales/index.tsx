import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Vendas</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Gerenciar vendas</p>
        </div>
        <button onClick={openCreate} style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 500, cursor: 'pointer' }}>
          Nova Venda
        </button>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Carregando...</div>
        ) : sales.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Nenhuma venda encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Data</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Valor Total</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Observacoes</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,149,86,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                  >
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500 }}>{s.client_name || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500 }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.total_value)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-muted-2)', fontSize: '0.875rem' }}>{s.notes || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', textAlign: 'center' }}>
                      <button onClick={() => openEdit(s)} style={{ color: '#D49556', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Editar</button>
                      <button onClick={() => handleDelete(s.id)} style={{ color: '#D84B5F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, marginLeft: '0.75rem' }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--nexus-text)', marginBottom: '1.5rem' }}>{editing ? 'Editar Venda' : 'Nova Venda'}</h2>
            {error && <div style={{ background: 'rgba(216,75,95,0.12)', color: '#D84B5F', border: '1px solid rgba(216,75,95,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Cliente</label>
                <select style={{ width: '100%', padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }} value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}>
                  <option value={0}>Selecione...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {!editing && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Itens</label>
                  {formData.items.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                      <select style={{ flex: 1, padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }} value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))} required>
                        <option value={0}>Produto...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} (qtd: {p.quantity})</option>)}
                      </select>
                      <input type="number" min="1" style={{ width: '5rem', padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }} placeholder="Qtd" value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} required />
                      <input type="number" step="0.01" min="0" style={{ width: '7rem', padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }} placeholder="Preco" value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))} required />
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} style={{ color: '#D84B5F', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0.5rem' }}>X</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addItem} style={{ color: '#D49556', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>+ Adicionar item</button>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Observacoes</label>
                <input type="text" style={{ width: '100%', padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }} value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: '1px solid var(--nexus-border)', color: 'var(--nexus-muted-2)', borderRadius: '10px', padding: '0.625rem 1.25rem', fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.625rem 1.25rem', fontWeight: 500, cursor: 'pointer' }}>{editing ? 'Salvar' : 'Concluir Venda'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
