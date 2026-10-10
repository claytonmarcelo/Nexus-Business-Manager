import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";

interface ProductRow {
  id: string; name: string; sku: string | null; unit: string; categoryName: string | null;
  salePrice: number; costPrice: number | null; stockQuantity: number; minStock: number;
  trackStock: boolean; lowStock: boolean; active: boolean;
}
interface Category { id: string; name: string; active: boolean }
interface Movement { id: string; kind: "IN" | "OUT" | "ADJUST"; quantity: number; note: string | null; createdAt: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }
interface Summary { totalProducts: number; lowStock: number; outOfStock: number }

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Modulo Produtos + Estoque: KPIs, listagem paginada, movimentacoes e categorias.
export function Products() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<ProductRow> | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [moving, setMoving] = useState<ProductRow | null>(null);
  const [history, setHistory] = useState<ProductRow | null>(null);
  const [catDialog, setCatDialog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lista, resumo, cats] = await Promise.all([
        api.get<Paged<ProductRow>>("/products", {
          params: { page, pageSize: 10, search: search || undefined, lowStock: onlyLow ? "true" : undefined },
        }),
        api.get<Summary>("/products/stock-summary"),
        api.get<Category[]>("/product-categories"),
      ]);
      setRows(lista.data);
      setSummary(resumo.data);
      setCategories(cats.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, onlyLow]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deactivate(row: ProductRow) {
    const ok = await confirmAction({
      title: "Desativar produto",
      text: "O produto " + row.name + " será desativado. O histórico de estoque é preservado.",
      confirmLabel: "Desativar",
    });
    if (!ok) return;
    try {
      await api.delete("/products/" + row.id);
      notify.success("Produto desativado.");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-sub">Catálogo e estoque da empresa ativa</p>
        </div>
        {can("product:write") ? (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCatDialog(true)}>Nova categoria</button>
            <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo produto</button>
          </div>
        ) : null}
      </div>

      {summary ? (
        <div className="kpi-grid">
          <div className="kpi card-surface"><div className="kpi-label">Produtos ativos</div><div className="kpi-value">{summary.totalProducts}</div><div className="kpi-hint">no catálogo</div></div>
          <div className="kpi card-surface"><div className="kpi-label">Estoque baixo</div><div className="kpi-value" style={{ color: "var(--warning)" }}>{summary.lowStock}</div><div className="kpi-hint">no ou abaixo do mínimo</div></div>
          <div className="kpi card-surface"><div className="kpi-label">Sem estoque</div><div className="kpi-value" style={{ color: "var(--danger)" }}>{summary.outOfStock}</div><div className="kpi-hint">itens zerados</div></div>
        </div>
      ) : null}

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Buscar por nome, SKU ou descrição"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          aria-label="Buscar produtos"
        />
        <label className="neu-check" style={{ color: "var(--text-2)" }}>
          <input type="checkbox" checked={onlyLow} onChange={(e) => { setOnlyLow(e.target.checked); setPage(1); }} />
          <span className="neu-check-box" aria-hidden="true" />
          <span>Somente estoque baixo</span>
        </label>
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
                <th scope="col">Produto</th>
                <th scope="col">Categoria</th>
                <th scope="col">Preço</th>
                <th scope="col">Estoque</th>
                <th scope="col">Situação</th>
                {can("product:write") ? <th scope="col">Ações</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.sku ? <span className="company-meta mono">SKU {p.sku}</span> : null}
                  </td>
                  <td>{p.categoryName ?? "—"}</td>
                  <td className="mono">{brl.format(p.salePrice)}</td>
                  <td className="mono">
                    {p.trackStock ? p.stockQuantity + " " + p.unit : "sem controle"}
                    {p.lowStock && p.active ? <span className="badge" style={{ marginLeft: "0.4rem" }}>baixo</span> : null}
                  </td>
                  <td>
                    <span className={"status-pill " + (p.active ? "is-on" : "is-off")}>
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  {can("product:write") ? (
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>Editar</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMoving(p)}>Estoque</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHistory(p)}>Histórico</button>
                        {p.active ? (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void deactivate(p)}>Desativar</button>
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
          title="Nenhum produto encontrado"
          description={can("product:write") ? "Cadastre o primeiro produto para controlar o estoque." : "Ajuste a busca."}
          action={can("product:write") ? <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo produto</button> : undefined}
        />
      )}

      {editing ? <ProductModal product={editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => void load()} /> : null}
      {moving ? <MovementModal product={moving} onClose={() => setMoving(null)} onSaved={() => void load()} /> : null}
      {history ? <HistoryModal product={history} onClose={() => setHistory(null)} /> : null}
      {catDialog ? <CategoryModal onClose={() => setCatDialog(false)} onSaved={() => void load()} /> : null}
    </div>
  );
}

function ProductModal({ product, categories, onClose, onSaved }: {
  product: ProductRow | "new"; categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const isNew = product === "new";
  const p = isNew ? null : (product as ProductRow);
  const [form, setForm] = useState({
    name: p?.name ?? "",
    sku: p?.sku ?? "",
    unit: p?.unit ?? "un",
    categoryId: p ? categories.find((c) => c.name === p.categoryName)?.id ?? "" : "",
    salePrice: p ? String(p.salePrice) : "",
    costPrice: p?.costPrice != null ? String(p.costPrice) : "",
    stockQuantity: p ? String(p.stockQuantity) : "0",
    minStock: p ? String(p.minStock) : "0",
    trackStock: p?.trackStock ?? true,
  });
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!form.name.trim() || form.salePrice === "") {
      notify.error("Informe ao menos nome e preço de venda.");
      return;
    }
    setBusy(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      sku: form.sku || undefined,
      unit: form.unit || "un",
      categoryId: form.categoryId || undefined,
      salePrice: Number(form.salePrice),
      costPrice: form.costPrice === "" ? undefined : Number(form.costPrice),
      minStock: Number(form.minStock || 0),
      trackStock: form.trackStock,
    };
    try {
      if (isNew) {
        payload.stockQuantity = Number(form.stockQuantity || 0);
        await api.post("/products", payload);
        notify.success("Produto cadastrado.");
      } else {
        await api.patch("/products/" + (p as ProductRow).id, payload);
        notify.success("Produto atualizado.");
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
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label={isNew ? "Novo produto" : "Editar produto"}>
      <div className="nx-dialog card-surface">
        <h2 className="nx-dialog-title">{isNew ? "Novo produto" : "Editar produto"}</h2>
        <div className="field">
          <span className="field-label">Nome</span>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="auth-row" style={{ gap: "0.75rem", alignItems: "flex-start" }}>
          <div className="field" style={{ flex: 1 }}>
            <span className="field-label">SKU</span>
            <input className="input mono" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div className="field" style={{ width: 90 }}>
            <span className="field-label">Unidade</span>
            <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <span className="field-label">Categoria</span>
          <select className="select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Sem categoria</option>
            {categories.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="auth-row" style={{ gap: "0.75rem", alignItems: "flex-start" }}>
          <div className="field" style={{ flex: 1 }}>
            <span className="field-label">Preço de venda (R$)</span>
            <input className="input" type="number" min="0" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <span className="field-label">Custo (R$)</span>
            <input className="input" type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </div>
        </div>
        {isNew ? (
          <div className="field">
            <span className="field-label">Estoque inicial</span>
            <input className="input" type="number" min="0" step="0.001" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
          </div>
        ) : null}
        <div className="field">
          <span className="field-label">Estoque mínimo</span>
          <input className="input" type="number" min="0" step="0.001" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
        </div>
        <label className="neu-check" style={{ marginBottom: "0.5rem" }}>
          <input type="checkbox" checked={form.trackStock} onChange={(e) => setForm({ ...form, trackStock: e.target.checked })} />
          <span className="neu-check-box" aria-hidden="true" />
          <span>Controlar estoque deste produto</span>
        </label>
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

function MovementModal({ product, onClose, onSaved }: { product: ProductRow; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (quantity === "" || Number(quantity) <= 0) {
      notify.error("Informe uma quantidade maior que zero.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/products/" + product.id + "/movements", { kind, quantity: Number(quantity), note: note || undefined });
      notify.success("Estoque atualizado.");
      onSaved();
      onClose();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const labels = { IN: "Entrada", OUT: "Saída", ADJUST: "Ajuste (define o saldo)" } as const;
  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label="Movimentar estoque">
      <div className="nx-dialog card-surface">
        <h2 className="nx-dialog-title">Estoque — {product.name}</h2>
        <p className="page-sub" style={{ marginTop: "-0.5rem", marginBottom: "0.9rem" }}>
          Saldo atual: <strong className="mono">{product.stockQuantity} {product.unit}</strong> · mínimo {product.minStock}
        </p>
        <div className="field">
          <span className="field-label">Tipo de movimentação</span>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as "IN" | "OUT" | "ADJUST")}>
            <option value="IN">{labels.IN}</option>
            <option value="OUT">{labels.OUT}</option>
            <option value="ADJUST">{labels.ADJUST}</option>
          </select>
        </div>
        <div className="field">
          <span className="field-label">{kind === "ADJUST" ? "Novo saldo" : "Quantidade"}</span>
          <input className="input" type="number" min="0" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <span className="field-label">Observação</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: compra, inventário, perda" />
        </div>
        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-brand" onClick={submit} disabled={busy}>
            {busy ? "Registrando…" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryModal({ product, onClose }: { product: ProductRow; onClose: () => void }) {
  const [items, setItems] = useState<Paged<Movement> | null>(null);
  useEffect(() => {
    api.get<Paged<Movement>>("/products/" + product.id + "/movements", { params: { pageSize: 10 } })
      .then((r) => setItems(r.data))
      .catch((e) => notify.error(extractErrorMessage(e)));
  }, [product.id]);
  const kindLabel = { IN: "Entrada", OUT: "Saída", ADJUST: "Ajuste" } as const;
  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label="Histórico de estoque">
      <div className="nx-dialog card-surface">
        <h2 className="nx-dialog-title">Histórico — {product.name}</h2>
        {!items ? <LoadingInline /> : items.data.length === 0 ? (
          <p className="text-muted">Nenhuma movimentação registrada.</p>
        ) : (
          <ul className="activity-list">
            {items.data.map((m) => (
              <li key={m.id} className="activity-item">
                <span className="activity-dot" style={{ background: m.kind === "IN" ? "var(--success)" : m.kind === "OUT" ? "var(--danger)" : "var(--warning)" }} />
                <span>
                  <span className="activity-action">{kindLabel[m.kind]}</span>{" "}
                  <span className="mono">{m.quantity}</span>
                  {m.note ? <span className="activity-entity"> · {m.note}</span> : null}
                </span>
                <span className="activity-time">{fmtData(m.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (name.trim().length < 2) {
      notify.error("Informe um nome de categoria com pelo menos 2 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/product-categories", { name });
      notify.success("Categoria criada.");
      onSaved();
      onClose();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="nx-dialog-overlay" role="dialog" aria-modal="true" aria-label="Nova categoria">
      <div className="nx-dialog card-surface">
        <h2 className="nx-dialog-title">Nova categoria</h2>
        <div className="field">
          <span className="field-label">Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="nx-dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-brand" onClick={submit} disabled={busy}>
            {busy ? "Salvando…" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}
