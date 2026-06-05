import { useState, useEffect } from 'react';
import api from '../../services/api';
import { AuditLog } from '../../types';

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/audit');
      setLogs(res.data);
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

  function actionColor(action: string) {
    const map: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-brand-champagneGold/20 text-brand-champagneGold',
      delete: 'bg-red-100 text-red-800',
      login: 'bg-brand-graphiteWine/10 text-brand-graphiteWine',
    };
    return map[action] || 'bg-brand-graphiteWine/10 text-brand-graphiteWine';
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Auditoria</h1>
        <p className="text-brand-graphiteWine/60 mt-1">Historico de acoes no sistema</p>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-brand-graphiteWine/70">Nenhum registro de auditoria</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-blackCherry text-brand-ivorySmoke">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Data/Hora</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Usuario</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Acao</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">Entidade</th>
                  <th className="text-left py-3 px-4 font-medium text-brand-ivorySmoke">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[rgba(214,179,112,0.18)]">
                    <td className="py-3 px-4 text-brand-graphiteWine/70">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td className="py-3 px-4 font-medium">{log.user_name}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${actionColor(log.action)}`}>{actionLabel(log.action)}</span>
                    </td>
                    <td className="py-3 px-4 capitalize">{log.entity_type}</td>
                    <td className="py-3 px-4 text-brand-graphiteWine/70">{log.entity_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
