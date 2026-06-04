import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { Supplier } from '../../types';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ company_name: '', phone: '', email: '', contact_name: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadSuppliers(); }, []);

  async function loadSuppliers() {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch { console.error('Erro ao carregar fornecedores'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ company_name: '', phone: '', email: '', contact_name: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setFormData({ company_name: s.company_name, phone: s.phone || '', email: s.email || '', contact_name: s.contact_name || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar fornecedor');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      loadSuppliers();
    } catch { console.error('Erro ao excluir fornecedor'); }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-500 mt-1">Cadastro de fornecedores</p>
        </div>
        <button onClick={openCreate} className="btn-primary">Novo Fornecedor</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum fornecedor encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Empresa</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Telefone</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Contato</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{s.company_name}</td>
                    <td className="py-3 px-4 text-gray-500">{s.phone || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{s.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{s.contact_name || '-'}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => openEdit(s)} className="text-nexus-600 hover:text-nexus-800 font-medium">Editar</button>
                      <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 font-medium">Excluir</button>
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
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-6">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <input type="text" className="input-field" required value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" className="input-field" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" className="input-field" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Contato</label>
                <input type="text" className="input-field" value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
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
