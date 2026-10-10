import { useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { LoadingInline, ErrorState } from "../components/StateView";
import { formatDateTime } from "../lib/format";

interface Paged<T> { data: T[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }
interface Member { id: string; name: string; email: string; role: string }
interface AuditRow { id: string; action: string; entity: string; createdAt: string; entityId: string | null }

export function Dashboard() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Paged<Member> | null>(null);
  const [audit, setAudit] = useState<Paged<AuditRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [m, a] = await Promise.all([
        api.get<Paged<Member>>("/users", { params: { page: 1, pageSize: 1 } }),
        api.get<Paged<AuditRow>>("/audit", { params: { page: 1, pageSize: 6 } }),
      ]);
      setMembers(m.data);
      setAudit(a.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Olá, {user ? user.name.split(" ")[0] : ""}</h1>
          <p className="page-sub">Visão geral de {user ? user.companyName : ""}</p>
        </div>
      </div>

      {loading ? (
        <LoadingInline label="Carregando indicadores…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="kpi-grid">
            <KpiCard label="Membros da empresa" value={members ? members.meta.total : 0} hint="Usuários com acesso" />
            <KpiCard label="Eventos de auditoria" value={audit ? audit.meta.total : 0} hint="Histórico registrado" />
            <KpiCard label="Seu papel" value={user ? user.role : "—"} hint="Permissões no sistema" />
            <KpiCard label="Empresa ativa" value={user ? user.companyName : "—"} hint="Contexto multiempresa" mono={false} />
          </div>

          <section className="card-surface panel">
            <h2 className="panel-title">Atividades recentes</h2>
            {audit && audit.data.length > 0 ? (
              <ul className="activity-list">
                {audit.data.map((row) => (
                  <li key={row.id} className="activity-item">
                    <span className="activity-dot" aria-hidden="true" />
                    <span className="activity-action mono">{row.action}</span>
                    <span className="activity-entity">{row.entity}</span>
                    <time className="activity-time">{formatDateTime(row.createdAt)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">Nenhuma atividade registrada ainda.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, hint, mono = true }: { label: string; value: string | number; hint?: string; mono?: boolean }) {
  return (
    <div className="kpi card-surface">
      <p className="kpi-label">{label}</p>
      <p className={"kpi-value" + (mono ? " mono" : "")}>{value}</p>
      {hint ? <p className="kpi-hint">{hint}</p> : null}
    </div>
  );
}
