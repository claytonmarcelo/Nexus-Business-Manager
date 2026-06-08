import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { AuditLog } from '../../types';

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/audit');
      setLogs(res.data?.data || []);
    } catch { console.error('Erro ao carregar auditoria'); }
    finally { setLoading(false); }
  }

  function actionLabel(action: string) {
    const map: Record<string, string> = {
      create: 'Criacao',
      update: 'Alteracao',
      delete: 'Exclusao',
      login: 'Login',
    };
    return map[action] || action;
  }

  const badge = (bg: string, color: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem',
    borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500, background: bg, color,
  });

  const actionBadgeStyle: Record<string, ReturnType<typeof badge>> = {
    create: badge('rgba(125,218,106,0.12)', '#7DDA6A'),
    update: badge('rgba(212,149,86,0.12)', '#D49556'),
    delete: badge('rgba(216,75,95,0.12)', '#D84B5F'),
    login: badge('rgba(148,163,184,0.12)', '#94A3B8'),
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Auditoria</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Historico de acoes no sistema</p>
        </div>
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)', fontSize: '0.875rem' }}>Carregando...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nexus-muted-2)' }}>Nenhum registro encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Data/Hora</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Usuario</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Acao</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>Entidade</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nexus-muted-2)', borderBottom: '1px solid rgba(212,149,86,0.1)' }}>ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}
                    style={{ background: hoveredRowId === log.id ? 'rgba(212,149,86,0.08)' : 'transparent' }}
                    onMouseEnter={() => setHoveredRowId(log.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500 }}>{log.user_name}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>
                      <span style={actionBadgeStyle[log.action] || actionBadgeStyle['login']}>{actionLabel(log.action)}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem', textTransform: 'capitalize' }}>{log.entity_type}</td>
                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(212,149,86,0.05)', color: 'var(--nexus-text)', fontSize: '0.875rem' }}>{log.entity_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
