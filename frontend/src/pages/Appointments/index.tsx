import { useState, useEffect, FormEvent } from 'react';
import api from '../../services/api';
import { Appointment, Client } from '../../types';

export function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '', client_id: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData(date?: string) {
    try {
      const url = date ? `/appointments?date=${date}` : '/appointments';
      const [appRes, cliRes] = await Promise.all([api.get(url), api.get('/clients')]);
      setAppointments(appRes.data);
      setClients(cliRes.data);
    } catch { console.error('Erro ao carregar agendamentos'); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setFormData({ title: '', description: '', appointment_date: new Date().toISOString().split('T')[0], appointment_time: '', client_id: 0 });
    setError('');
    setShowModal(true);
  }

  function openEdit(a: Appointment) {
    setEditing(a);
    setFormData({
      title: a.title, description: a.description || '',
      appointment_date: a.appointment_date, appointment_time: a.appointment_time || '',
      client_id: a.client_id || 0,
    });
    setError('');
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...formData, client_id: formData.client_id || null };
      if (editing) {
        await api.put(`/appointments/${editing.id}`, payload);
      } else {
        await api.post('/appointments', payload);
      }
      setShowModal(false);
      loadData(filterDate || undefined);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar agendamento');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      loadData(filterDate || undefined);
    } catch { console.error('Erro ao excluir agendamento'); }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      await api.put(`/appointments/${id}`, { status });
      loadData(filterDate || undefined);
    } catch { console.error('Erro ao alterar status do agendamento'); }
  }

  function handleFilter(date: string) {
    setFilterDate(date);
    loadData(date || undefined);
  }

  const statusBadge: Record<string, string> = {
    scheduled: 'bg-brand-roseGold/20 text-brand-roseGold',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabel: Record<string, string> = {
    scheduled: 'Agendado',
    completed: 'Concluido',
    cancelled: 'Cancelado',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="text-brand-graphiteWine/60 mt-1">Compromissos e agendamentos</p>
        </div>
        <button onClick={openCreate} className="btn-primary">Novo Agendamento</button>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-brand-blackCherry mb-1">Filtrar por data</label>
          <input type="date" className="input-field" value={filterDate}
            onChange={(e) => handleFilter(e.target.value)} />
        </div>
        {filterDate && (
          <button onClick={() => handleFilter('')} className="btn-secondary mt-6">Limpar filtro</button>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Carregando...</div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Nenhum agendamento encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-blackCherry text-brand-ivorySmoke">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Hora</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Titulo</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-brand-ivorySmoke">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-[rgba(214,179,112,0.18)]">
                    <td className="py-3 px-4">{new Date(a.appointment_date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 px-4 text-brand-graphiteWine/70">{a.appointment_time || '-'}</td>
                    <td className="py-3 px-4 font-medium">{a.title}</td>
                    <td className="py-3 px-4 text-brand-graphiteWine/70">{a.client_name || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${statusBadge[a.status]}`}>{statusLabel[a.status]}</span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {a.status === 'scheduled' && (
                        <>
                          <button onClick={() => handleStatusChange(a.id, 'completed')} className="text-green-600 hover:text-green-800 font-medium">Concluir</button>
                          <button onClick={() => handleStatusChange(a.id, 'cancelled')} className="text-red-600 hover:text-red-800 font-medium">Cancelar</button>
                        </>
                      )}
                      <button onClick={() => openEdit(a)} className="text-brand-roseGold hover:text-brand-champagneGold font-medium">Editar</button>
                      <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-800 font-medium">Excluir</button>
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
            <h2 className="text-xl font-semibold mb-6">{editing ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Titulo</label>
                <input type="text" className="input-field" required value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blackCherry mb-1">Data</label>
                  <input type="date" className="input-field" required value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-blackCherry mb-1">Horario</label>
                  <input type="time" className="input-field" value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Cliente</label>
                <select className="input-field" value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}>
                  <option value={0}>Nenhum</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blackCherry mb-1">Descricao</label>
                <textarea className="input-field" rows={3} value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
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
