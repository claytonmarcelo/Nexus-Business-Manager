import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { formatDateTime } from "../lib/format";

interface AuditRow { id: string; action: string; entity: string; entityId: string | null; createdAt: string; ip: string | null }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

export function Audit() {
  const [rows, setRows] = useState<Paged<AuditRow> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<AuditRow>>("/audit", { params: { page, pageSize: 15 } });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Auditoria</h1>
          <p className="page-sub">Rastreabilidade das operações da empresa</p>
        </div>
      </div>

      {loading ? (
        <LoadingInline />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows && rows.data.length > 0 ? (
        <div className="card-surface table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Ação</th>
                <th scope="col">Entidade</th>
                <th scope="col">Origem</th>
                <th scope="col">Quando</th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.action}</td>
                  <td>{r.entity}</td>
                  <td className="mono">{r.ip ?? "—"}</td>
                  <td>{formatDateTime(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows ? (
            <Pagination
              page={rows.meta.page}
              pageSize={rows.meta.pageSize}
              total={rows.meta.total}
              totalPages={rows.meta.totalPages}
              onChange={setPage}
            />
          ) : null}
        </div>
      ) : (
        <EmptyState title="Sem eventos de auditoria" description="As ações realizadas no sistema aparecerão aqui." />
      )}
    </div>
  );
}
