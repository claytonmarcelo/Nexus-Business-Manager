import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { Appointment, Client } from '../../types';

export function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
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
      setAppointments(appRes.data?.data || []);
      setClients(cliRes.data?.data || []);
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

  const statusLabel: Record<string, string> = {
    scheduled: 'Agendado',
    completed: 'Concluido',
    cancelled: 'Cancelado',
  };

  const badge = (bg: string, color: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem',
    borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: bg, color,
  });

  const statusBadgeStyle: Record<string, ReturnType<typeof badge>> = {
    scheduled: badge('rgba(212,149,86,0.12)', '#D49556'),
    completed: badge('rgba(125,218,106,0.12)', '#7DDA6A'),
    cancelled: badge('rgba(216,75,95,0.12)', '#D84B5F'),
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Agenda</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Compromissos e agendamentos</p>
        </div>
        <button onClick={openCreate} style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 500, cursor: 'pointer' }}>Novo Agendamento</button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div>
          <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Filtrar por data</label>
          <input type="date" value={filterDate}
            style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
            onChange={(e) => handleFilter(e.target.value)} />
        </div>
        {filterDate && (
          <button onClick={() => handleFilter('')} style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem', marginTop: '1.5rem' }}>Limpar filtro</button>
        )}
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)', fontSize: '0.875rem' }}>Carregando...</div>
        ) : appointments.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Nenhum registro encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Data</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Hora</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Titulo</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id}
                    style={{ background: hoveredRowId === a.id ? 'rgba(212,149,86,0.08)' : 'transparent' }}
                    onMouseEnter={() => setHoveredRowId(a.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{new Date(a.appointment_date).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{a.appointment_time || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500 }}>{a.title}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{a.client_name || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>
                      <span style={statusBadgeStyle[a.status]}>{statusLabel[a.status]}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        {a.status === 'scheduled' && (
                          <>
                            <button onClick={() => handleStatusChange(a.id, 'completed')} style={{ color: '#D49556', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Concluir</button>
                            <button onClick={() => handleStatusChange(a.id, 'cancelled')} style={{ color: '#D84B5F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Cancelar</button>
                          </>
                        )}
                        <button onClick={() => openEdit(a)} style={{ color: '#D49556', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Editar</button>
                        <button onClick={() => handleDelete(a.id)} style={{ color: '#D84B5F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>Excluir</button>
                      </div>
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
          <div style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: '18px', padding: '2rem', width: '100%', maxWidth: '32rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--nexus-text)', marginBottom: '1.5rem' }}>{editing ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
            {error && <div style={{ background: 'rgba(216,75,95,0.12)', color: '#D84B5F', border: '1px solid rgba(216,75,95,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Titulo</label>
                <input type="text" required value={formData.title}
                  style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Data</label>
                  <input type="date" required value={formData.appointment_date}
                    style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} />
                </div>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Horario</label>
                  <input type="time" value={formData.appointment_time}
                    style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Cliente</label>
                <select value={formData.client_id}
                  style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' }}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}>
                  <option value={0}>Nenhum</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Descricao</label>
                <textarea rows={3} value={formData.description}
                  style={{ padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem' }}>Cancelar</button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
