import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";

interface Member { id: string; name: string; email: string; active: boolean; role: string; membershipId: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }
const ROLES = ["OWNER", "ADMIN", "MANAGER", "STAFF"];

export function Users() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<Member> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<Member>>("/users", {
        params: { page, pageSize: 10, search: search || undefined },
      });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(member: Member, role: string) {
    const ok = await confirmAction({
      title: "Alterar papel",
      text: "Definir " + member.name + " como " + role + " nesta empresa?",
      confirmLabel: "Alterar",
    });
    if (!ok) return;
    try {
      await api.patch("/users/" + member.id + "/role", { role });
      notify.success("Papel atualizado.");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-sub">Membros da empresa ativa</p>
        </div>
        {can("user:write") ? (
          <button type="button" className="btn btn-brand" onClick={() => setShowAdd(true)}>Novo membro</button>
        ) : null}
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          aria-label="Buscar usuários"
        />
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
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Papel</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {rows.data.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td className="mono">{m.email}</td>
                  <td>
                    {can("user:write") ? (
                      <select
                        className="select"
                        value={m.role}
                        onChange={(e) => void changeRole(m, e.target.value)}
                        aria-label={"Papel de " + m.name}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className="badge">{m.role}</span>
                    )}
                  </td>
                  <td>
                    <span className={"status-pill " + (m.active ? "is-on" : "is-off")}>
                      {m.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
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
        <EmptyState title="Nenhum usuário encontrado" description="Ajuste a busca ou adicione um novo membro." />
      )}

      {showAdd ? <AddMemberModal onClose={() => setShowAdd(false)} onCreated={() => void load()} /> : null}
    </div>
  );
}

function AddMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api.post("/users", form);
      notify.success("Membro adicionado.");
      onCreated();
      onClose();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Novo membro">
      <div className="modal card-surface">
        <h2 className="modal-title">Novo membro</h2>
        <div className="field">
          <span className="field-label">Nome</span>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">E-mail</span>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Senha</span>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Papel</span>
          <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-brand" onClick={submit} disabled={busy}>
            {busy ? "Salvando…" : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
