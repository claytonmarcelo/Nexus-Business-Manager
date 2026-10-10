import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO, usePaginacaoLocal } from "../components/Pagination";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { ACTIONS, MODAL_COPY, modalTitle } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { baixarCsv } from "../lib/csv";
import { formatCurrency, formatDateTime } from "../lib/format";

interface PurchaseItem { id: string; productId: string; productName: string | null; quantity: number; unitCost: number; lineTotal: number }
interface PurchaseRow { id: string; status: "DRAFT" | "RECEIVED" | "CANCELLED"; total: number; notes: string | null; supplierName: string | null; userName: string | null; createdAt: string; items: PurchaseItem[] }
interface SupplierRow { id: string; name: string; email: string | null; phone: string | null; document: string | null; notes: string | null; active: boolean }
interface ProductOpt { id: string; name: string; unit: string; costPrice: number | null; salePrice: number; active: boolean }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

// Espelho exato de compras() em apps/api/src/modules/reports/reports.service.ts.
interface PurchaseReport {
  gasto: number;
  pedidos: number;
  ticket: number;
  fornecedoresAtivos: number;
  fornecedoresCadastrados: number;
  porStatus: { status: string; rotulo: string; quantidade: number; valor: number }[];
  topFornecedores: { id: string; nome: string; pedidos: number; valor: number; participacao: number }[];
  cotacoes: { id: string; fornecedor: string; valor: number; itens: number; createdAt: string }[];
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const statusLabel = { DRAFT: "Rascunho", RECEIVED: "Recebida", CANCELLED: "Cancelada" } as const;
const statusClass = { DRAFT: "is-off", RECEIVED: "is-on", CANCELLED: "is-off" } as const;

const ABAS: TabItem[] = [
  { id: "pedidos", label: "Pedidos de Compra", hint: "Lista, filtros e ações sobre as compras" },
  { id: "fornecedores", label: "Fornecedores", hint: "Cadastro, edição e desativação" },
  { id: "cotacoes", label: "Cotações", hint: "Análise de compras e rascunhos em aberto" },
];

// Modulo Compras: pedidos a fornecedor com entrada de estoque ao receber e
// estorno no cancelamento. Navegacao por abas: pedidos, fornecedores e cotacoes.
export function Purchases() {
  const { can } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "pedidos");
  const [rows, setRows] = useState<Paged<PurchaseRow> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<PurchaseRow | null>(null);
  // Edicao de fornecedor vive no topo da pagina: o modal fica fora do
  // TabPanel porque a animacao do painel (transform) criaria bloco de
  // contencao e o overlay deixaria de olhar para o viewport.
  const [editing, setEditing] = useState<SupplierRow | "new" | null>(null);
  const [recargaFornecedores, setRecargaFornecedores] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<PurchaseRow>>("/purchases", {
        params: { page, pageSize, search: search || undefined, status: status || undefined },
      });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);

  // A listagem so e buscada com a aba de pedidos ativa (um fetch por aba).
  useEffect(() => {
    if (active !== "pedidos") return;
    void load();
  }, [active, load]);

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
          {can("supplier:read") ? <button type="button" className="btn btn-ghost" onClick={() => onSelect("fornecedores")}>Fornecedores</button> : null}
          {can("purchase:write") ? <button type="button" className="btn btn-brand" onClick={() => setCreating(true)}>Nova compra</button> : null}
        </div>
      </div>

      <Tabs
        tabs={ABAS}
        active={active}
        onSelect={(id) => { setPage(1); onSelect(id); }}
        ariaLabel="Seções de compras"
      />

      <TabPanel id="pedidos" active={active}>
        <div className="toolbar">
          <input className="input" type="search" placeholder="Buscar por fornecedor" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar compras" />
          <select className="select" style={{ maxWidth: 220 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            <option value="DRAFT">Rascunhos</option>
            <option value="RECEIVED">Recebidas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
          <span className="toolbar-note">{loading ? "Atualizando lista…" : rows ? rows.meta.total + (rows.meta.total === 1 ? " compra" : " compras") : "—"}</span>
        </div>

        {loading ? (
          <LoadingInline label="Carregando compras…" />
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
              <Pagination
                page={rows.meta.page}
                pageSize={rows.meta.pageSize}
                total={rows.meta.total}
                totalPages={rows.meta.totalPages}
                onChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                itemLabel="compras"
                itemLabelSingular="compra"
              />
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma compra encontrada"
            description={can("purchase:write") ? "Cadastre um fornecedor e registre a primeira compra." : "Ajuste os filtros."}
            action={can("purchase:write") ? <button type="button" className="btn btn-brand" onClick={() => setCreating(true)}>Nova compra</button> : undefined}
          />
        )}
      </TabPanel>

      <TabPanel id="fornecedores" active={active}>
        {can("supplier:read") ? (
          <SuppliersPanel setEditing={setEditing} recarga={recargaFornecedores} />
        ) : (
          <EmptyState title="Sem permissão" description="Somente perfis com leitura em fornecedores veem este cadastro." />
        )}
      </TabPanel>

      <TabPanel id="cotacoes" active={active}>
        <PurchaseReports temEscrita={can("purchase:write")} />
      </TabPanel>

      {creating ? <PurchaseModal onClose={() => setCreating(false)} onSaved={() => void load()} /> : null}
      {detail ? <PurchaseDetailModal purchase={detail} onClose={() => setDetail(null)} /> : null}
      {editing ? (
        <SupplierFormModal
          supplier={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setRecargaFornecedores((n) => n + 1)}
        />
      ) : null}
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
  const dirty = useDirty({ supplierId, notes, receiveNow, items });
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
    <Modal
      title={modalTitle("purchase", true)}
      subtitle="Informe o fornecedor e os custos; ao receber, o estoque dá entrada."
      onClose={onClose}
      onSubmit={() => void save()}
      busy={saving}
      dirty={dirty}
      submitLabel="Registrar compra"
      busyLabel="Registrando…"
      size="lg"
      hint={<span>Total: <strong className="mono">{brl.format(total)}</strong></span>}
    >
        {loadError ? <ErrorState message={loadError} /> : null}

        <div className="field">
          <label className="field-label" htmlFor="purchase-supplier">Fornecedor *</label>
          <select id="purchase-supplier" className="select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Selecione o fornecedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {suppliers.length === 0 && !loadError ? (
            <span className="auth-hint">Nenhum fornecedor ativo ainda — cadastre na aba "Fornecedores".</span>
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
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((prev) => [...prev, { productId: "", quantity: "1", unitCost: "" }])}>{ACTIONS.addItem}</button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="purchase-notes">Observações</label>
          <textarea id="purchase-notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
        </div>

        <label className="neu-check" style={{ marginBottom: "0.9rem" }}>
          <input type="checkbox" checked={receiveNow} onChange={(e) => setReceiveNow(e.target.checked)} />
          Receber agora (dá entrada no estoque e atualiza o custo)
        </label>

    </Modal>
  );
}

// Detalhe da compra com itens e custos.
function PurchaseDetailModal({ purchase, onClose }: { purchase: PurchaseRow; onClose: () => void }) {
  return (
    <Modal
      title={<>Compra <span className={"status-pill " + statusClass[purchase.status]}>{statusLabel[purchase.status]}</span></>}
      label="Detalhe da compra"
      subtitle={(purchase.supplierName ?? "Fornecedor removido") + " · " + fmtData(purchase.createdAt)}
      onClose={onClose}
    >
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
    </Modal>
  );
}

// Aba "Fornecedores": a gestao que antes vivia num modal agora e um painel
// de aba — listagem paginada, criacao/edicao (modal proprio) e desativacao.
function SuppliersPanel({ setEditing, recarga }: {
  setEditing: (v: SupplierRow | "new" | null) => void;
  recarga: number;
}) {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<SupplierRow> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<SupplierRow>>("/suppliers", { params: { page, pageSize, search: search || undefined } });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, recarga]);

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
    <>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Buscar por nome" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar fornecedor" />
        {can("supplier:write") ? <button type="button" className="btn btn-brand btn-sm" onClick={() => setEditing("new")}>Novo fornecedor</button> : null}
        <span className="toolbar-note">{loading ? "Atualizando cadastro…" : rows ? rows.meta.total + (rows.meta.total === 1 ? " fornecedor" : " fornecedores") : "—"}</span>
      </div>

      {loading ? (
        <LoadingInline label="Carregando fornecedores…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows && rows.data.length > 0 ? (
        <div className="card-surface panel">
          <ul className="company-list">
            {rows.data.map((s) => (
              <li key={s.id} className="company-item">
                <div>
                  <span className="company-name">{s.name} {!s.active ? <span className="badge">inativo</span> : null}</span>
                  <span className="company-meta">{[s.email, s.phone, s.document].filter(Boolean).join(" · ") || "sem contatos"}</span>
                </div>
                {can("supplier:write") ? (
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(s)}>Editar</button>
                    {s.active ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void deactivate(s)}>Desativar</button> : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <Pagination
            page={rows.meta.page}
            pageSize={rows.meta.pageSize}
            total={rows.meta.total}
            totalPages={rows.meta.totalPages}
            onChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            itemLabel="fornecedores"
            itemLabelSingular="fornecedor"
          />
        </div>
      ) : (
        <EmptyState
          title="Nenhum fornecedor"
          description={can("supplier:write") ? "Cadastre o primeiro fornecedor para registrar compras." : "Ajuste a busca."}
          action={can("supplier:write") ? <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo fornecedor</button> : undefined}
        />
      )}
    </>
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
  const dirty = useDirty(form);

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
    <Modal
      title={modalTitle("supplier", isNew)}
      onClose={onClose}
      onSubmit={() => void submit()}
      busy={busy}
      dirty={dirty}
      hint={MODAL_COPY.requiredHint}
      zIndex={90}
    >
        <div className="field"><span className="field-label">Nome *</span><input className="input" value={form.name} onChange={set("name")} /></div>
        <div className="field"><span className="field-label">E-mail</span><input className="input" type="email" value={form.email} onChange={set("email")} /></div>
        <div className="field"><span className="field-label">Telefone</span><input className="input" value={form.phone} onChange={set("phone")} /></div>
        <div className="field"><span className="field-label">Documento (CNPJ/CPF)</span><input className="input" value={form.document} onChange={set("document")} /></div>
        <div className="field"><span className="field-label">Observações</span><textarea className="input" rows={2} value={form.notes} onChange={set("notes")} /></div>
    </Modal>
  );
}

// Aba "Cotacoes": um unico GET /reports/purchases por aba, buscado somente
// quando a aba esta ativa (montada). Inclui o recorte exportavel em CSV.
function PurchaseReports({ temEscrita }: { temEscrita: boolean }) {
  const [rel, setRel] = useState<PurchaseReport | null>(null);

  // As cotacoes (rascunhos) chegam prontas do relatorio: pagina no navegador.
  const cotacoes = usePaginacaoLocal(rel?.cotacoes ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PurchaseReport>("/reports/purchases");
      setRel(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function baixar() {
    if (!rel) return;
    const quantidade = baixarCsv(
      "cotacoes-rascunhos",
      ["ID", "Fornecedor", "Valor", "Itens", "Criada em"],
      rel.cotacoes.map((c) => [c.id, c.fornecedor, String(c.valor).replace(".", ","), c.itens, formatDateTime(c.createdAt)]),
    );
    notify.success(quantidade + (quantidade === 1 ? " cotação exportada em CSV." : " cotações exportadas em CSV."));
  }

  if (loading) return <LoadingInline label="Carregando análise de compras…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!rel) return <EmptyState title="Sem dados" description="Nenhuma informação de compras disponível." />;

  const maxStatus = rel.porStatus.length ? Math.max(...rel.porStatus.map((s) => s.quantidade)) : 0;

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi card-surface">
          <p className="kpi-label">Gasto total</p>
          <p className="kpi-value mono">{formatCurrency(rel.gasto)}</p>
          <p className="kpi-hint">compras recebidas e em rota, exceto canceladas</p>
        </div>
        <div className="kpi card-surface">
          <p className="kpi-label">Pedidos</p>
          <p className="kpi-value">{rel.pedidos}</p>
          <p className="kpi-hint">compras efetivas</p>
        </div>
        <div className="kpi card-surface">
          <p className="kpi-label">Ticket médio</p>
          <p className="kpi-value mono">{formatCurrency(rel.ticket)}</p>
          <p className="kpi-hint">gasto por pedido</p>
        </div>
        <div className="kpi card-surface">
          <p className="kpi-label">Fornecedores</p>
          <p className="kpi-value">{rel.fornecedoresAtivos} / {rel.fornecedoresCadastrados}</p>
          <p className="kpi-hint">ativos por cadastrados</p>
        </div>
      </div>

      <div className="card-surface panel">
        <h2 className="nx-panel-title">Distribuição por status</h2>
        <p className="nx-panel-sub">Quantidade de compras e valor concentrado em cada situação.</p>
        {rel.porStatus.length === 0 ? (
          <p className="form-note">Nenhuma compra registrada até aqui.</p>
        ) : (
          <ul className="nx-distrib">
            {rel.porStatus.map((s) => (
              <li key={s.status} className="nx-distrib-row">
                <span className="nx-distrib-label">{s.rotulo}</span>
                <span className="nx-distrib-track">
                  <span className="nx-distrib-fill" style={{ width: maxStatus ? Math.round((s.quantidade / maxStatus) * 100) + "%" : "0%" }} />
                </span>
                <span className="nx-distrib-value">{s.quantidade} · {formatCurrency(s.valor)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-surface panel">
        <h2 className="nx-panel-title">Fornecedores que mais fornecem</h2>
        <p className="nx-panel-sub">Oito fornecedores com maior valor comprado, com participação no gasto total.</p>
        {rel.topFornecedores.length === 0 ? (
          <EmptyState title="Nenhum fornecedor com compras" description="Registre uma compra para ver o ranking." />
        ) : (
          <ul className="nx-distrib">
            {rel.topFornecedores.map((f) => (
              <li key={f.id} className="nx-distrib-row">
                <span className="nx-distrib-label">{f.nome}</span>
                <span className="nx-distrib-track">
                  <span className="nx-distrib-fill" style={{ width: Math.max(4, f.participacao) + "%" }} />
                </span>
                <span className="nx-distrib-value">{f.pedidos} · {formatCurrency(f.valor)} · {f.participacao}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-surface panel">
        <h2 className="nx-panel-title">Cotações em aberto</h2>
        <p className="nx-panel-sub">Aqui "cotação" é o pedido de compra ainda em rascunho (status DRAFT): ele aguarda decisão de receber ou cancelar.</p>
        <div className="toolbar">
          <button type="button" className="btn btn-ghost btn-sm" onClick={baixar} disabled={rel.cotacoes.length === 0}>
            Baixar CSV
          </button>
          {temEscrita && rel.cotacoes.length > 0 ? (
            <span className="toolbar-note">Para receber ou cancelar, use a aba "Pedidos de Compra".</span>
          ) : null}
        </div>
        {rel.cotacoes.length === 0 ? (
          <EmptyState title="Nenhuma cotação em rascunho" description="Todas as compras criadas já foram recebidas ou canceladas." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Cotação</th>
                  <th scope="col">Fornecedor</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Itens</th>
                  <th scope="col">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {cotacoes.itens.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id.slice(0, 8)}</td>
                    <td>{c.fornecedor}</td>
                    <td className="mono">{formatCurrency(c.valor)}</td>
                    <td>{c.itens}</td>
                    <td className="mono">{formatDateTime(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...cotacoes.pagina} itemLabel="cotações" itemLabelSingular="cotação" />
          </div>
        )}
      </div>
    </>
  );
}
