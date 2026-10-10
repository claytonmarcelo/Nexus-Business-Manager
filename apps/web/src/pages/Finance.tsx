import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";

interface CategoryRow { id: string; name: string; type: "INCOME" | "EXPENSE" }
interface EntryRow {
  id: string; type: "INCOME" | "EXPENSE"; status: "PENDING" | "PAID" | "CANCELLED";
  description: string; amount: number; dueDate: string; paidAt: string | null; notes: string | null;
  categoryName: string | null; categoryId: string | null; clientName: string | null; supplierName: string | null; userName: string | null;
}
interface Summary { month: string; income: number; expense: number; balance: number; pendingIncome: number; pendingExpense: number; overdueCount: number; overdueAmount: number }
interface Option { id: string; name: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const mesAtual = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};
const statusLabel = { PENDING: "Pendente", PAID: "Pago", CANCELLED: "Cancelado" } as const;
const statusClass = { PENDING: "is-off", PAID: "is-on", CANCELLED: "is-off" } as const;

// Modulo Financeiro: receitas e despesas com vencimento, status e resumo mensal.
export function Finance() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<EntryRow> | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState(mesAtual());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EntryRow | "new" | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lista, resumo] = await Promise.all([
        api.get<Paged<EntryRow>>("/finance/entries", {
          params: { page, pageSize: 10, search: search || undefined, type: type || undefined, status: status || undefined, month: month || undefined },
        }),
        api.get<Summary>("/finance/summary", { params: { month: month || undefined } }),
      ]);
      setRows(lista.data);
      setSummary(resumo.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, type, status, month]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(row: EntryRow, next: "PAID" | "PENDING" | "CANCELLED") {
    const textos = {
      PAID: { title: "Registrar pagamento", text: "Marcar " + row.description + " como pago hoje?", label: "Pagar" },
      PENDING: { title: "Reabrir lançamento", text: "Voltar para pendente?", label: "Reabrir" },
      CANCELLED: { title: "Cancelar lançamento", text: "Este lançamento deixará de contar nos resumos.", label: "Cancelar" },
    }[next];
    const ok = await confirmAction({ title: textos.title, text: textos.text, confirmLabel: textos.label });
    if (!ok) return;
    try {
      await api.patch("/finance/entries/" + row.id + "/status", { status: next });
      notify.success("Lançamento atualizado.");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-sub">Receitas e despesas da empresa ativa</p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {can("finance:read") ? <button type="button" className="btn btn-ghost" onClick={() => setCategoriesOpen(true)}>Categorias</button> : null}
          {can("finance:write") ? <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo lançamento</button> : null}
        </div>
      </div>

      {summary ? (
        <div className="kpi-grid">
          <div className="kpi card-surface"><span className="kpi-label">Receitas pagas</span><div className="kpi-value" style={{ color: "var(--success)" }}>{brl.format(summary.income)}</div><span className="kpi-hint">+ {brl.format(summary.pendingIncome)} a receber</span></div>
          <div className="kpi card-surface"><span className="kpi-label">Despesas pagas</span><div className="kpi-value" style={{ color: "var(--danger)" }}>{brl.format(summary.expense)}</div><span className="kpi-hint">+ {brl.format(summary.pendingExpense)} a pagar</span></div>
          <div className="kpi card-surface"><span className="kpi-label">Saldo do mês</span><div className="kpi-value">{brl.format(summary.balance)}</div><span className="kpi-hint">{summary.month}</span></div>
          <div className="kpi card-surface"><span className="kpi-label">Atrasados</span><div className="kpi-value">{summary.overdueCount}</div><span className="kpi-hint">{brl.format(summary.overdueAmount)} vencidos</span></div>
        </div>
      ) : null}

      <div className="toolbar">
        <input className="input" type="search" placeholder="Buscar por descrição" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar lançamentos" />
        <select className="select" style={{ maxWidth: 170 }} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filtrar por tipo">
          <option value="">Receitas e despesas</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </select>
        <select className="select" style={{ maxWidth: 170 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="PENDING">Pendentes</option>
          <option value="PAID">Pagos</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
        <input className="input" type="month" style={{ maxWidth: 180 }} value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} aria-label="Filtrar por mês" />
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
                <th scope="col">Descrição</th>
                <th scope="col">Tipo</th>
                <th scope="col">Categoria</th>
                <th scope="col">Valor</th>
                <th scope="col">Vencimento</th>
                <th scope="col">Status</th>
                {can("finance:write") ? <th scope="col">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.data.map((e) => (
                <tr key={e.id}>
                  <td><button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, height: "auto" }} onClick={() => setEditing(e)}>{e.description}</button></td>
                  <td><span className="badge" style={e.type === "EXPENSE" ? { background: "color-mix(in srgb, var(--danger) 16%, transparent)", color: "var(--danger)" } : { background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>{e.type === "INCOME" ? "Receita" : "Despesa"}</span></td>
                  <td>{e.categoryName ?? "—"}</td>
                  <td className="mono">{brl.format(e.amount)}</td>
                  <td className="mono">{fmtData(e.dueDate)}</td>
                  <td><span className={"status-pill " + statusClass[e.status]}>{statusLabel[e.status]}</span></td>
                  {can("finance:write") ? (
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {e.status === "PENDING" ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void changeStatus(e, "PAID")}>Pagar</button> : null}
                        {e.status === "PAID" ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void changeStatus(e, "PENDING")}>Reabrir</button> : null}
                        {e.status !== "CANCELLED" ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void changeStatus(e, "CANCELLED")}>Cancelar</button> : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {rows ? (
            <Pagination page={rows.meta.page} pageSize={rows.meta.pageSize} total={rows.meta.total} totalPages={rows.meta.totalPages} onChange={setPage} />
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Nenhum lançamento no período"
          description={can("finance:write") ? "Registre a primeira receita ou despesa." : "Ajuste os filtros."}
          action={can("finance:write") ? <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo lançamento</button> : undefined}
        />
      )}

      {editing ? <EntryModal entry={editing} onClose={() => setEditing(null)} onSaved={() => void load()} /> : null}
      {categoriesOpen ? <CategoriesModal onClose={() => setCategoriesOpen(false)} /> : null}
    </div>
  );
}

const hoje = () => new Date().toISOString().slice(0, 10);

// Lancamento (criar/editar): tipo define as categorias; opcionalmente vincula cliente ou fornecedor.
function EntryModal({ entry, onClose, onSaved }: { entry: EntryRow | "new"; onClose: () => void; onSaved: () => void }) {
  const isNew = entry === "new";
  const [form, setForm] = useState({
    type: isNew ? "INCOME" : entry.type,
    description: isNew ? "" : entry.description,
    amount: isNew ? "" : String(entry.amount),
    dueDate: isNew ? hoje() : entry.dueDate.slice(0, 10),
    categoryId: isNew ? "" : entry.categoryId ?? "",
    clientId: "",
    supplierId: "",
    notes: isNew ? "" : entry.notes ?? "",
    paid: !isNew && entry.status === "PAID",
  });
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [clients, setClients] = useState<Option[]>([]);
  const [suppliers, setSuppliers] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<CategoryRow[]>("/finance/categories", { params: { type: form.type } })
      .then((r) => setCategories(r.data))
      .catch(() => setCategories([]));
  }, [form.type]);

  useEffect(() => {
    if (isNew) {
      Promise.all([
        api.get<Paged<Option>>("/clients", { params: { page: 1, pageSize: 100 } }),
        api.get<Paged<Option>>("/suppliers", { params: { page: 1, pageSize: 100, active: "true" } }),
      ])
        .then(([c, s]) => { setClients(c.data.data); setSuppliers(s.data.data); })
        .catch(() => { /* selects ficam vazios; erro aparece ao salvar */ });
    }
  }, [isNew]);

  async function submit() {
    const valor = parseFloat(form.amount.replace(",", ".")) || 0;
    if (form.description.trim().length < 3) { notify.error("Descreva o lançamento."); return; }
    if (valor <= 0) { notify.error("Informe um valor maior que zero."); return; }
    setBusy(true);
    const payload = {
      type: form.type,
      description: form.description.trim(),
      amount: valor,
      dueDate: form.dueDate,
      categoryId: form.categoryId || undefined,
      clientId: form.clientId || undefined,
      supplierId: form.supplierId || undefined,
      notes: form.notes.trim() || undefined,
      paid: form.paid,
    };
    try {
      if (isNew) {
        await api.post("/finance/entries", payload);
        notify.success("Lançamento registrado.");
      } else {
        await api.patch("/finance/entries/" + entry.id, payload);
        notify.success("Lançamento atualizado.");
      }
      onSaved();
      onClose();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label={isNew ? "Novo lançamento" : "Editar lançamento"} onClick={onClose}>
      <div className="nx-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="nx-dialog-title">{isNew ? "Novo lançamento" : "Editar lançamento"}</h2>
        <div className="field">
          <span className="field-label">Tipo</span>
          <div className="theme-choice">
            <button type="button" className={"btn " + (form.type === "INCOME" ? "btn-brand" : "btn-ghost")} aria-pressed={form.type === "INCOME"} onClick={() => setForm({ ...form, type: "INCOME", categoryId: "" })}>Receita</button>
            <button type="button" className={"btn " + (form.type === "EXPENSE" ? "btn-brand" : "btn-ghost")} aria-pressed={form.type === "EXPENSE"} onClick={() => setForm({ ...form, type: "EXPENSE", categoryId: "" })}>Despesa</button>
          </div>
        </div>
        <div className="field"><span className="field-label">Descrição *</span><input className="input" value={form.description} onChange={set("description")} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="field"><span className="field-label">Valor (R$) *</span><input className="input" inputMode="decimal" value={form.amount} onChange={set("amount")} placeholder="0,00" /></div>
          <div className="field"><span className="field-label">Vencimento *</span><input className="input" type="date" value={form.dueDate} onChange={set("dueDate")} /></div>
        </div>
        <div className="field">
          <span className="field-label">Categoria</span>
          <select className="select" value={form.categoryId} onChange={set("categoryId")}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {isNew ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <span className="field-label">Cliente (opcional)</span>
              <select className="select" value={form.clientId} onChange={set("clientId")}>
                <option value="">Nenhum</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span className="field-label">Fornecedor (opcional)</span>
              <select className="select" value={form.supplierId} onChange={set("supplierId")}>
                <option value="">Nenhum</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        ) : null}
        <div className="field"><span className="field-label">Observações</span><textarea className="input" rows={2} value={form.notes} onChange={set("notes")} /></div>
        <label className="neu-check" style={{ marginBottom: "0.9rem" }}>
          <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />
          {form.type === "INCOME" ? "Já recebido" : "Já pago"}
        </label>
        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-brand" disabled={busy} onClick={() => void submit()}>{busy ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}

// Categorias do plano financeiro por tipo (receita/despesa).
function CategoriesModal({ onClose }: { onClose: () => void }) {
  const { can } = useAuth();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<CategoryRow[]>("/finance/categories");
      setRows(data);
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    if (name.trim().length < 2) { notify.error("Informe o nome da categoria."); return; }
    setBusy(true);
    try {
      await api.post("/finance/categories", { name: name.trim(), type });
      notify.success("Categoria criada.");
      setName("");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: CategoryRow) {
    const ok = await confirmAction({ title: "Excluir categoria", text: c.name + " será removida (lançamentos existentes ficam sem categoria).", confirmLabel: "Excluir" });
    if (!ok) return;
    try {
      await api.delete("/finance/categories/" + c.id);
      notify.success("Categoria excluída.");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label="Categorias financeiras" onClick={onClose}>
      <div className="nx-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="nx-dialog-title">Categorias financeiras</h2>
        {can("finance:write") ? (
          <div className="toolbar" style={{ marginBottom: "0.9rem" }}>
            <input className="input" placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da categoria" />
            <select className="select" style={{ maxWidth: 140 }} value={type} onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")} aria-label="Tipo da categoria">
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
            <button type="button" className="btn btn-brand btn-sm" disabled={busy} onClick={() => void add()}>Adicionar</button>
          </div>
        ) : null}
        {rows.length > 0 ? (
          <ul className="company-list">
            {rows.map((c) => (
              <li key={c.id} className="company-item">
                <div>
                  <span className="company-name">{c.name}</span>
                  <span className="company-meta">{c.type === "INCOME" ? "Receita" : "Despesa"}</span>
                </div>
                {can("finance:write") ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void remove(c)}>Excluir</button> : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhuma categoria" description="Crie categorias para organizar seus lançamentos." />
        )}
        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
