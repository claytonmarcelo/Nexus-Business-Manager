import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { Transaction, CashFlow } from '../../types';

export function Financial() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlow>({ total_revenue: 0, total_expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'revenue' as 'revenue' | 'expense',
    category: '',
    description: '',
    value: 0,
    transaction_date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [transRes, flowRes] = await Promise.all([api.get('/financial'), api.get('/financial/cashflow')]);
      setTransactions(transRes.data);
      setCashFlow(flowRes.data);
    } catch { console.error('Erro ao carregar dados financeiros'); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/financial', formData);
      setShowModal(false);
      setFormData({ type: 'revenue', category: '', description: '', value: 0, transaction_date: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar transacao');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza?')) return;
    try {
      await api.delete(`/financial/${id}`);
      loadData();
    } catch { console.error('Erro ao excluir transacao'); }
  }

  const revenueCategories = ['Vendas', 'Servicos', 'Investimentos', 'Outros'];
  const expenseCategories = ['Agua', 'Luz', 'Internet', 'Salarios', 'Aluguel', 'Material', 'Outros'];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="text-brand-graphiteWine/60 mt-1">Fluxo de caixa</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(''); }} className="btn-primary">Nova Transacao</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-brand-graphiteWine/70 mb-1">Receitas</p>
          <p className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cashFlow.total_revenue)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-brand-graphiteWine/70 mb-1">Despesas</p>
          <p className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cashFlow.total_expense)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-brand-graphiteWine/70 mb-1">Saldo</p>
          <p className={`text-2xl font-bold ${cashFlow.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cashFlow.balance)}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Carregando...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Nenhuma transacao encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-blackCherry text-brand-ivorySmoke">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Categoria</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Descricao</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Valor</th>
                  <th className="text-right py-3 px-4 font-medium text-brand-ivorySmoke">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[rgba(214,179,112,0.18)]">
                    <td className="py-3 px-4 text-brand-graphiteWine/70">{new Date(t.transaction_date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${t.type === 'revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {t.type === 'revenue' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{t.category}</td>
                    <td className="py-3 px-4 text-brand-graphiteWine/70">{t.description}</td>
                    <td className={`py-3 px-4 font-medium ${t.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800 font-medium">Excluir</button>
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
          <div className="card rounded-2xl w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-6">Nova Transacao</h2>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Tipo</label>
                <select className="input-field" value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'revenue' | 'expense', category: '' })}>
                  <option value="revenue">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Categoria</label>
                <select className="input-field" required value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  <option value="">Selecione...</option>
                  {(formData.type === 'revenue' ? revenueCategories : expenseCategories).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Descricao</label>
                <input type="text" className="input-field" required value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blackCherry mb-1">Valor</label>
                  <input type="number" step="0.01" min="0" className="input-field" required value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-blackCherry mb-1">Data</label>
                  <input type="date" className="input-field" required value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })} />
                </div>
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
