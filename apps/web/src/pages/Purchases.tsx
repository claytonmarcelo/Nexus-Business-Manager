import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";

interface PurchaseItem { id: string; productId: string; productName: string | null; quantity: number; unitCost: number; lineTotal: number }
interface PurchaseRow { id: string; status: "DRAFT" | "RECEIVED" | "CANCELLED"; total: number; notes: string | null; supplierName: string | null; userName: string | null; createdAt: string; items: PurchaseItem[] }
interface SupplierRow { id: string; name: string; email: string | null; phone: string | null; document: string | null; notes: string | null; active: boolean }
interface ProductOpt { id: string; name: string; unit: string; costPrice: number | null; salePrice: number; active: boolean }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const statusLabel = { DRAFT: "Rascunho", RECEIVED: "Recebida", CANCELLED: "Cancelada" } as const;
const statusClass = { DRAFT: "is-off", RECEIVED: "is-on", CANCELLED: "is-off" } as const;

// Modulo Compras: pedidos a fornecedor com entrada de estoque ao receber e estorno no cancelamento.
export function Purchases() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<PurchaseRow> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<PurchaseRow | null>(null);
  const [suppliersOpen, setSuppliersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<PurchaseRow>>("/purchases", {
        params: { page, pageSize: 10, search: search || undefined, status: status || undefined },
      });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(row: PurchaseRow, next: "RECEIVED" | "CANCELLED") {
    const ok = await confirmAction({
      title: next === "RECEIVED" ? "Receber compra" : "Cancelar compra",
      text: next === "RECEIVED"
        ? "Os itens controlados entram no estoque e o custo do produto é atualizado."
        : "Se a compra estava recebida, o estoque é estornado (bloqueia se as unidades já foram consumidas).",
      confirmLabel: next === "RECEIVED" ? "Receber" : "Cancelar compra",
    });
    if (!ok) return;
    try {
      await api.patch("/purchases/" + row.id + "/status", { status: next });
      notify.success(next === "RECEIVED" ? "Compra recebida." : "Compra cancelada.");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-sub">Pedidos a fornecedores da empresa ativa</p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {can("supplier:read") ? <button type="button" className="btn btn-ghost" onClick={() => setSuppliersOpen(true)}>Fornecedores</button> : null}
          {can("purchase:write") ? <button type="button" className="btn btn-brand" onClick={() => setCreating(true)}>Nova compra</button> : null}
        </div>
      </div>

      <div className="toolbar">
        <input className="input" type="search" placeholder="Buscar por fornecedor" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar compras" />
        <select className="select" style={{ maxWidth: 220 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="DRAFT">Rascunhos</option>
          <option value="RECEIVED">Recebidas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
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
                <th scope="col">Fornecedor</th>
                <th scope="col">Itens</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Data</th>
                <th scope="col">Comprador</th>
                {can("purchase:write") ? <th scope="col">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.data.map((s) => (
                <tr key={s.id}>
                  <td><button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, height: "auto" }} onClick={() => setDetail(s)}>{s.supplierName ?? "—"}</button></td>
                  <td>{s.items.length}</td>
                  <td className="mono">{brl.format(s.total)}</td>
                  <td><span className={"status-pill " + statusClass[s.status]}>{statusLabel[s.status]}</span></td>
                  <td className="mono">{fmtData(s.createdAt)}</td>
                  <td>{s.userName ?? "—"}</td>
                  {can("purchase:write") ? (
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {s.status === "DRAFT" ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void changeStatus(s, "RECEIVED")}>Receber</button>
                        ) : null}
                        {s.status !== "CANCELLED" ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void changeStatus(s, "CANCELLED")}>Cancelar</button>
                        ) : null}
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
          title="Nenhuma compra encontrada"
          description={can("purchase:write") ? "Cadastre um fornecedor e registre a primeira compra." : "Ajuste os filtros."}
          action={can("purchase:write") ? <button type="button" className="btn btn-brand" onClick={() => setCreating(true)}>Nova compra</button> : undefined}
        />
      )}

      {creating ? <PurchaseModal onClose={() => setCreating(false)} onSaved={() => void load()} /> : null}
      {detail ? <PurchaseDetailModal purchase={detail} onClose={() => setDetail(null)} /> : null}
      {suppliersOpen ? <SuppliersModal onClose={() => setSuppliersOpen(false)} /> : null}
    </div>
  );
}

// Modal de criacao: itens dinamicos, custo sugerido do produto, total ao vivo e opcao de receber ja.
interface ItemDraft { productId: string; quantity: string; unitCost: string }

function PurchaseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiveNow, setReceiveNow] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api.get<Paged<SupplierRow>>("/suppliers", { params: { page: 1, pageSize: 100, active: "true" } }),
      api.get<Paged<ProductOpt>>("/products", { params: { page: 1, pageSize: 100 } }),
    ])
      .then(([s, p]) => {
        if (!vivo) return;
        setSuppliers(s.data.data);
        setProducts(p.data.data.filter((x) => x.active));
      })
      .catch((e) => { if (vivo) setLoadError(extractErrorMessage(e)); });
    return () => { vivo = false; };
  }, []);

  const productById = (id: string) => products.find((p) => p.id === id);

  function patchItem(idx: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function chooseProduct(idx: number, id: string) {
    const p = productById(id);
    patchItem(idx, { productId: id, unitCost: p && p.costPrice != null ? String(p.costPrice) : "" });
  }

  const total = items.reduce((acc, it) => {
    const q = parseFloat(it.quantity.replace(",", ".")) || 0;
    const c = parseFloat(it.unitCost.replace(",", ".")) || 0;
    return acc + q * c;
  }, 0);

  async function save() {
    if (!supplierId) { notify.error("Selecione o fornecedor."); return; }
    const clean = items.filter((it) => it.productId);
    if (clean.length === 0) { notify.error("Adicione ao menos um produto."); return; }
    for (const it of clean) {
      const q = parseFloat(it.quantity.replace(",", ".")) || 0;
      if (q <= 0) { notify.error("Quantidade deve ser maior que zero."); return; }
    }
    setSaving(true);
    try {
      await api.post("/purchases", {
        supplierId,
        notes: notes.trim() || undefined,
        receive: receiveNow,
        items: clean.map((it) => ({
          productId: it.productId,
          quantity: parseFloat(it.quantity.replace(",", ".")),
          unitCost: parseFloat(it.unitCost.replace(",", ".")) || 0,
        })),
      });
      notify.success(receiveNow ? "Compra registrada e recebida." : "Compra criada como rascunho.");
      onSaved();
      onClose();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label="Nova compra" onClick={onClose}>
      <div className="nx-dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(680px, 100%)" }}>
        <h2 className="nx-dialog-title">Nova compra</h2>
        {loadError ? <ErrorState message={loadError} /> : null}

        <div className="field">
          <label className="field-label" htmlFor="purchase-supplier">Fornecedor *</label>
          <select id="purchase-supplier" className="select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Selecione o fornecedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {suppliers.length === 0 && !loadError ? (
            <span className="auth-hint">Nenhum fornecedor ativo ainda — cadastre em "Fornecedores".</span>
          ) : null}
        </div>

        <div className="field">
          <span className="field-label">Itens</span>
          {items.map((it, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 72px 100px 90px 32px", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <select className="select" value={it.productId} onChange={(e) => chooseProduct(idx, e.target.value)} aria-label={"Produto " + (idx + 1)}>
                <option value="">Selecione o produto</option>
                {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
              <input className="input" inputMode="decimal" value={it.quantity} onChange={(e) => patchItem(idx, { quantity: e.target.value })} aria-label="Quantidade" />
              <input className="input" inputMode="decimal" value={it.unitCost} onChange={(e) => patchItem(idx, { unitCost: e.target.value })} aria-label="Custo unitário" />
              <span className="mono" style={{ fontSize: "0.85rem" }}>{brl.format((parseFloat(it.quantity.replace(",", ".")) || 0) * (parseFloat(it.unitCost.replace(",", ".")) || 0))}</span>
              {items.length > 1 ? (
                <button type="button" className="btn btn-ghost btn-sm" aria-label="Remover item" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>×</button>
              ) : <span />}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((prev) => [...prev, { productId: "", quantity: "1", unitCost: "" }])}>+ Adicionar item</button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="purchase-notes">Observações</label>
          <textarea id="purchase-notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </div>

        <label className="neu-check" style={{ marginBottom: "0.9rem" }}>
          <input type="checkbox" checked={receiveNow} onChange={(e) => setReceiveNow(e.target.checked)} />
          Receber agora (dá entrada no estoque e atualiza o custo)
        </label>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <strong className="mono" style={{ fontSize: "1.1rem" }}>Total: {brl.format(total)}</strong>
          <div className="nx-dialog-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-brand" disabled={saving} onClick={() => void save()}>{saving ? "Salvando…" : "Registrar compra"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Detalhe da compra com itens e custos.
function PurchaseDetailModal({ purchase, onClose }: { purchase: PurchaseRow; onClose: () => void }) {
  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label="Detalhe da compra" onClick={onClose}>
      <div className="nx-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="nx-dialog-title">Compra · <span className={"status-pill " + statusClass[purchase.status]}>{statusLabel[purchase.status]}</span></h2>
        <dl className="kv">
          <div><dt>Fornecedor</dt><dd>{purchase.supplierName ?? "—"}</dd></div>
          <div><dt>Comprador</dt><dd>{purchase.userName ?? "—"}</dd></div>
          <div><dt>Data</dt><dd className="mono">{fmtData(purchase.createdAt)}</dd></div>
          <div><dt>Total</dt><dd className="mono">{brl.format(purchase.total)}</dd></div>
          {purchase.notes ? <div><dt>Observações</dt><dd>{purchase.notes}</dd></div> : null}
        </dl>
        <h3 className="panel-title" style={{ marginTop: "1rem" }}>Itens</h3>
        <ul className="activity-list">
          {purchase.items.map((it) => (
            <li key={it.id} className="activity-item">
              <span className="activity-dot" />
              <span className="activity-entity">{it.productName ?? "Produto removido"}</span>
              <span style={{ marginLeft: "auto" }} className="mono">{it.quantity} × {brl.format(it.unitCost)} = {brl.format(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// Gestao de fornecedores: lista, criacao, edicao e desativacao logica.
function SuppliersModal({ onClose }: { onClose: () => void }) {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<SupplierRow> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SupplierRow | "new" | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Paged<SupplierRow>>("/suppliers", { params: { page, pageSize: 10, search: search || undefined } });
      setRows(data);
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deactivate(s: SupplierRow) {
    const ok = await confirmAction({ title: "Desativar fornecedor", text: s.name + " deixará de aparecer nas novas compras.", confirmLabel: "Desativar" });
    if (!ok) return;
    try {
      await api.delete("/suppliers/" + s.id);
      notify.success("Fornecedor desativado.");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label="Fornecedores" onClick={onClose}>
      <div className="nx-dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(760px, 100%)" }}>
        <h2 className="nx-dialog-title">Fornecedores</h2>
        <div className="toolbar" style={{ marginBottom: "0.9rem" }}>
          <input className="input" type="search" placeholder="Buscar por nome" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar fornecedor" />
          {can("supplier:write") ? <button type="button" className="btn btn-brand btn-sm" onClick={() => setEditing("new")}>Novo fornecedor</button> : null}
        </div>

        {loading ? <LoadingInline /> : rows && rows.data.length > 0 ? (
          <>
            <ul className="company-list">
              {rows.data.map((s) => (
                <li key={s.id} className="company-item">
                  <div>
                    <span className="company-name">{s.name} {!s.active ? <span className="badge">inativo</span> : null}</span>
                    <span className="company-meta">{[s.email, s.phone, s.document].filter(Boolean).join(" · ") || "sem contatos"}</span>
                  </div>
                  {can("supplier:write") ? (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(s)}>Editar</button>
                      {s.active ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void deactivate(s)}>Desativar</button> : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            <Pagination page={rows.meta.page} pageSize={rows.meta.pageSize} total={rows.meta.total} totalPages={rows.meta.totalPages} onChange={setPage} />
          </>
        ) : (
          <EmptyState title="Nenhum fornecedor" description={can("supplier:write") ? "Cadastre o primeiro fornecedor." : undefined} />
        )}

        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>

        {editing ? <SupplierFormModal supplier={editing} onClose={() => setEditing(null)} onSaved={() => void load()} /> : null}
      </div>
    </div>
  );
}

function SupplierFormModal({ supplier, onClose, onSaved }: { supplier: SupplierRow | "new"; onClose: () => void; onSaved: () => void }) {
  const isNew = supplier === "new";
  const [form, setForm] = useState(isNew
    ? { name: "", email: "", phone: "", document: "", notes: "" }
    : {
        name: supplier.name,
        email: supplier.email ?? "",
        phone: supplier.phone ?? "",
        document: supplier.document ?? "",
        notes: supplier.notes ?? "",
      });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (form.name.trim().length < 2) { notify.error("Informe o nome do fornecedor."); return; }
    setBusy(true);
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? undefined : v.trim()]),
    );
    try {
      if (isNew) {
        await api.post("/suppliers", payload);
        notify.success("Fornecedor cadastrado.");
      } else {
        await api.patch("/suppliers/" + supplier.id, payload);
        notify.success("Fornecedor atualizado.");
      }
      onSaved();
      onClose();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label={isNew ? "Novo fornecedor" : "Editar fornecedor"} style={{ zIndex: 80 }} onClick={onClose}>
      <div className="nx-dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="nx-dialog-title">{isNew ? "Novo fornecedor" : "Editar fornecedor"}</h2>
        <div className="field"><span className="field-label">Nome *</span><input className="input" value={form.name} onChange={set("name")} /></div>
        <div className="field"><span className="field-label">E-mail</span><input className="input" type="email" value={form.email} onChange={set("email")} /></div>
        <div className="field"><span className="field-label">Telefone</span><input className="input" value={form.phone} onChange={set("phone")} /></div>
        <div className="field"><span className="field-label">Documento (CNPJ/CPF)</span><input className="input" value={form.document} onChange={set("document")} /></div>
        <div className="field"><span className="field-label">Observações</span><textarea className="input" rows={2} value={form.notes} onChange={set("notes")} /></div>
        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-brand" disabled={busy} onClick={() => void submit()}>{busy ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
