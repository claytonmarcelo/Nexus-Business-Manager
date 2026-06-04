import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { Company } from '../../types';

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', document: '', phone: '', email: '' });
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/companies');
      setCompanies(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ name: '', slug: '', document: '', phone: '', email: '' });
    setError('');
    setShowModal(true);
  }

  function openEdit(c: Company) {
    setEditing(c);
    setFormData({ name: c.name, slug: c.slug, document: c.document || '', phone: c.phone || '', email: c.email || '' });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/companies/${editing.id}`, formData);
      } else {
        await api.post('/companies', formData);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar empresa');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500 mt-1">Gerenciamento multiempresa</p>
        </div>
        <button onClick={openCreate} className="btn-primary">Nova Empresa</button>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma empresa cadastrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Empresa</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Slug</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Documento</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Contato</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{c.name}</td>
                    <td className="py-3 px-4 text-gray-500 font-mono">{c.slug}</td>
                    <td className="py-3 px-4 text-gray-500">{c.document || '-'}</td>
                    <td className="py-3 px-4 text-gray-500">{c.email || c.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => openEdit(c)} className="text-nexus-600 hover:text-nexus-800 font-medium">Editar</button>
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
            <h2 className="text-xl font-semibold mb-6">{editing ? 'Editar Empresa' : 'Nova Empresa'}</h2>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" className="input-field" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (identificador unico)</label>
                <input type="text" className="input-field" required value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <input type="text" className="input-field" value={formData.document}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input type="text" className="input-field" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="input-field" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
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
