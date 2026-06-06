import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'framer-motion';
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
    } catch { console.error('Erro ao carregar empresas'); }
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 1rem', background: 'rgba(0,0,0,0.5)', color: 'var(--nexus-text)',
    border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Empresas</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Gerenciamento multiempresa</p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none',
            borderRadius: '10px', padding: '0.625rem 1.25rem', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Nova Empresa
        </button>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Carregando...</div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Nenhuma empresa cadastrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Empresa</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Slug</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Documento</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Contato</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212, 149, 86, 0.1)' }}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,149,86,0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', fontFamily: 'monospace' }}>{c.slug}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{c.document || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{c.email || c.phone || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', textAlign: 'right' }}>
                      <button
                        onClick={() => openEdit(c)}
                        style={{ color: '#D49556', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
                      >
                        Editar
                      </button>
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--nexus-text)', marginBottom: '1.5rem' }}>
              {editing ? 'Editar Empresa' : 'Nova Empresa'}
            </h2>
            {error && (
              <div style={{ background: 'rgba(216, 75, 95, 0.12)', color: '#D84B5F', border: '1px solid rgba(216, 75, 95, 0.2)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Nome</label>
                <input type="text" style={inputStyle} required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Slug (identificador unico)</label>
                <input type="text" style={inputStyle} required value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>CNPJ</label>
                  <input type="text" style={inputStyle} value={formData.document}
                    onChange={(e) => setFormData({ ...formData, document: e.target.value })} />
                </div>
                <div>
                  <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Telefone</label>
                  <input type="text" style={inputStyle} value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Email</label>
                <input type="email" style={inputStyle} value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  type="button" onClick={() => setShowModal(false)}
                  style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #C65A71, #9d4e58)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.625rem 1.25rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
