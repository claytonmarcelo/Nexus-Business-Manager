import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";

interface ClientRow { id: string; name: string; email: string | null; phone: string | null; document: string | null; active: boolean; createdAt: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

// Módulo Clientes: listagem paginada server-side, busca, criação/edição em modal
// e exclusão lógica com confirmação SweetAlert2 (nunca alert nativo).
export function Clients() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<ClientRow> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClientRow | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<ClientRow>>("/clients", {
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

  async function deactivate(row: ClientRow) {
    const ok = await confirmAction({
      title: "Desativar cliente",
      text: "O cliente " + row.name + " será desativado. O histórico é preservado.",
      confirmLabel: "Desativar",
    });
    if (!ok) return;
    try {
      await api.delete("/clients/" + row.id);
      notify.success("Cliente desativado.");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-sub">Cadastro da empresa ativa</p>
        </div>
        {can("client:write") ? (
          <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo cliente</button>
        ) : null}
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Buscar por nome, e-mail ou documento"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          aria-label="Buscar clientes"
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
                <th scope="col">Telefone</th>
                <th scope="col">Documento</th>
                <th scope="col">Situação</th>
                {can("client:write") ? <th scope="col">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.data.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="mono">{c.email ?? "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td className="mono">{c.document ?? "—"}</td>
                  <td>
                    <span className={"status-pill " + (c.active ? "is-on" : "is-off")}>
                      {c.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  {can("client:write") ? (
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>Editar</button>
                        {c.active ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void deactivate(c)}>Desativar</button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
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
        <EmptyState
          title="Nenhum cliente encontrado"
          description={can("client:write") ? "Cadastre o primeiro cliente para começar a vender." : "Ajuste a busca."}
          action={can("client:write") ? <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo cliente</button> : undefined}
        />
      )}

      {editing ? <ClientModal client={editing} onClose={() => setEditing(null)} onSaved={() => void load()} /> : null}
    </div>
  );
}

function ClientModal({ client, onClose, onSaved }: { client: ClientRow | "new"; onClose: () => void; onSaved: () => void }) {
  const isNew = client === "new";
  const initial = isNew
    ? { name: "", email: "", phone: "", document: "", notes: "" }
    : {
        name: (client as ClientRow).name,
        email: (client as ClientRow).email ?? "",
        phone: (client as ClientRow).phone ?? "",
        document: (client as ClientRow).document ?? "",
        notes: "",
      };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    // Campos vazios viram undefined: a API rejeita string vazia como e-mail invalido.
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? undefined : v.trim()]),
    );
    try {
      if (isNew) {
        await api.post("/clients", payload);
        notify.success("Cliente cadastrado.");
      } else {
        await api.patch("/clients/" + (client as ClientRow).id, payload);
        notify.success("Cliente atualizado.");
      }
      onSaved();
      onClose();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label={isNew ? "Novo cliente" : "Editar cliente"}>
      <div className="nx-dialog card-surface">
        <h2 className="nx-dialog-title">{isNew ? "Novo cliente" : "Editar cliente"}</h2>
        <div className="field">
          <span className="field-label">Nome</span>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">E-mail</span>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Telefone</span>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Documento (CPF/CNPJ)</span>
          <input className="input" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Observações</span>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-brand" onClick={submit} disabled={busy}>
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
