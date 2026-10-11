import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import { MODAL_COPY, modalTitle } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { baixarCsv } from "../lib/csv";
import { formatCurrency, formatDateTime } from "../lib/format";

interface ProductRow {
  id: string; name: string; sku: string | null; unit: string; categoryName: string | null;
  salePrice: number; costPrice: number | null; stockQuantity: number; minStock: number;
  trackStock: boolean; lowStock: boolean; active: boolean;
}
interface Category { id: string; name: string; active: boolean }
interface Movement { id: string; kind: "IN" | "OUT" | "ADJUST"; quantity: number; note: string | null; createdAt: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }
interface Summary { totalProducts: number; lowStock: number; outOfStock: number }

// Campos exatamente como /reports/products e /reports/movements devolvem.
interface CategoriaReport {
  id: string; nome: string; ativa: boolean;
  produtos: number; estoque: number; valorVendaMedio: number; participacao: number;
}
interface ProductsReport { total: number; semCategoria: number; categorias: CategoriaReport[] }
interface MovRow {
  id: string; produto: string; unidade: string; kind: "IN" | "OUT" | "ADJUST";
  quantidade: number; nota: string | null; createdAt: string;
}
interface MovReport {
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  totais: { entradas: number; saidas: number; ajustes: number };
  data: MovRow[];
}

const ABAS: TabItem[] = [
  { id: "catalogo", label: "Catálogo", hint: "Cadastro, busca e situação de estoque" },
  { id: "categorias", label: "Categorias & Marcas", hint: "Agrupamento do catálogo por categoria" },
  { id: "movimentacoes", label: "Movimentações", hint: "Entradas, saídas e ajustes de estoque" },
];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const KIND_LABEL: Record<MovRow["kind"], string> = { IN: "Entrada", OUT: "Saída", ADJUST: "Ajuste" };
const KIND_COR: Record<MovRow["kind"], string> = { IN: "var(--success)", OUT: "var(--danger)", ADJUST: "var(--warning)" };

// Modulo Produtos + Estoque em tres abas: o catalogo de sempre, o agrupamento
// por categoria (painel lido de /reports/products) e a trilha de movimentacoes.
export function Products() {
  const { can } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "catalogo");

  const [rows, setRows] = useState<Paged<ProductRow> | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [moving, setMoving] = useState<ProductRow | null>(null);
  const [history, setHistory] = useState<ProductRow | null>(null);
  const [catDialog, setCatDialog] = useState(false);

  // Painel "Categorias & Marcas": unico GET /reports/products, sob demanda.
  const [catReport, setCatReport] = useState<ProductsReport | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Aba "Movimentacoes": paginacao e filtro de tipo server-side.
  const [movPage, setMovPage] = useState(1);
  const [movPageSize, setMovPageSize] = useState(PAGE_SIZE_PADRAO);
  const [movKind, setMovKind] = useState("");
  const [mov, setMov] = useState<MovReport | null>(null);
  const [movLoading, setMovLoading] = useState(false);
  const [movError, setMovError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lista, resumo, cats] = await Promise.all([
        api.get<Paged<ProductRow>>("/products", {
          params: { page, pageSize, search: search || undefined, lowStock: onlyLow ? "true" : undefined },
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
  }, [page, pageSize, search, onlyLow]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadCatReport = useCallback(async () => {
    setCatLoading(true);
    setCatError(null);
    try {
      const { data } = await api.get<ProductsReport>("/reports/products");
      setCatReport(data);
    } catch (err) {
      setCatError(extractErrorMessage(err));
    } finally {
      setCatLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active === "categorias" && !catReport && !catLoading && !catError) void loadCatReport();
  }, [active, catReport, catLoading, catError, loadCatReport]);

  const loadMov = useCallback(async () => {
    setMovLoading(true);
    setMovError(null);
    try {
      const { data } = await api.get<MovReport>("/reports/movements", {
        params: { page: movPage, pageSize: movPageSize, kind: movKind || undefined },
      });
      setMov(data);
    } catch (err) {
      setMovError(extractErrorMessage(err));
    } finally {
      setMovLoading(false);
    }
  }, [movPage, movPageSize, movKind]);

  useEffect(() => {
    if (active === "movimentacoes") void loadMov();
  }, [active, loadMov]);

  async function deactivate(row: ProductRow) {
    await confirmAction({
      title: "Inativar produto",
      text: "Confirma a alteração de status do produto {nome}?",
      nome: row.name,
      detalhe: "Ele deixará de aparecer nas novas opções de venda. O saldo atual de estoque e o histórico de movimentações continuam preservados.",
      confirmLabel: "Inativar",
      danger: true,
      action: async () => {
        try {
          await api.delete("/products/" + row.id);
          notify.success("Produto inativado.");
          void load();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        }
      },
    });
  }

  function exportarMov() {
    if (!mov || mov.data.length === 0) return;
    const quantidade = baixarCsv(
      "movimentacoes-estoque",
      ["Produto", "Tipo", "Quantidade", "Unidade", "Nota", "Quando"],
      mov.data.map((m) => [
        m.produto,
        KIND_LABEL[m.kind],
        String(m.quantidade),
        m.unidade,
        m.nota ?? "",
        formatDateTime(m.createdAt),
      ]),
    );
    notify.success(quantidade + (quantidade === 1 ? " movimentação exportada em CSV." : " movimentações exportadas em CSV."));
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-sub">Catálogo e estoque da empresa ativa</p>
        </div>
        {can("product:write") ? (
          <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo produto</button>
        ) : null}
      </div>

      <Tabs tabs={ABAS} active={active} onSelect={onSelect} ariaLabel="Seções de produtos" />

      <TabPanel id="catalogo" active={active}>
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
                  {can("product:write") ? <th scope="col" className="col-acoes">Ações</th> : null}
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
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>Editar</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMoving(p)}>Estoque</button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHistory(p)}>Histórico</button>
                          {p.active ? (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void deactivate(p)}>Inativar</button>
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
                itemLabel="produtos"
                itemLabelSingular="produto"
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
      </TabPanel>

      <TabPanel id="categorias" active={active}>
        {catLoading ? (
          <LoadingInline label="Carregando categorias…" />
        ) : catError ? (
          <ErrorState message={catError} onRetry={loadCatReport} />
        ) : !catReport ? (
          <EmptyState
            title="Painel ainda não carregado"
            description="Abra o painel para ver como o catálogo está distribuído entre as categorias."
            action={<button type="button" className="btn btn-brand" onClick={() => void loadCatReport()}>Atualizar</button>}
          />
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="nx-alerta">
              <div>
                <div className="nx-alerta-titulo">Sobre "marca"</div>
                <div className="nx-alerta-texto">
                  Enquanto "marca" não existir como campo no cadastro de produto, esta tela agrupa o
                  catálogo por categoria. Não há dados de marca para mostrar — nada aqui é estimado.
                </div>
              </div>
            </div>

            {can("product:write") ? (
              <div className="toolbar">
                <button type="button" className="btn btn-ghost" onClick={() => setCatDialog(true)}>Nova categoria</button>
                <span className="toolbar-note">
                  {catReport.total} {catReport.total === 1 ? "produto ativo" : "produtos ativos"} ·{" "}
                  {catReport.categorias.length} {catReport.categorias.length === 1 ? "categoria" : "categorias"}
                </span>
              </div>
            ) : null}

            <div className="card-surface panel">
              <h2 className="nx-panel-title">Distribuição por categoria</h2>
              <p className="nx-panel-sub">
                Participação de cada categoria no catálogo ativo, com estoque e preço médio de venda.
              </p>
              {catReport.categorias.length === 0 ? (
                <EmptyState
                  title="Nenhuma categoria cadastrada"
                  description="Crie categorias para organizar o catálogo e enxergar esta distribuição."
                />
              ) : (
                <ul className="nx-distrib">
                  {catReport.categorias.map((c) => (
                    <li key={c.id} className="nx-distrib-row">
                      <span className="nx-distrib-label" title={c.nome}>{c.nome}</span>
                      <span className="nx-distrib-track">
                        <span className="nx-distrib-fill" style={{ width: Math.max(0, Math.min(100, c.participacao)) + "%" }} />
                      </span>
                      <span className="nx-distrib-value">
                        {c.produtos} p · {c.estoque} un · {formatCurrency(c.valorVendaMedio)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card-surface panel">
              <h2 className="nx-panel-title">Sem categoria</h2>
              <p className="nx-panel-sub">Produtos ativos que ainda não foram agrupados.</p>
              <ul className="nx-distrib">
                <li className="nx-distrib-row">
                  <span className="nx-distrib-label">Sem categoria</span>
                  <span className="nx-distrib-track">
                    <span
                      className="nx-distrib-fill"
                      style={{ width: catReport.total ? Math.round((catReport.semCategoria / catReport.total) * 100) + "%" : "0%" }}
                    />
                  </span>
                  <span className="nx-distrib-value">{catReport.semCategoria}</span>
                </li>
              </ul>
            </div>

            <div className="toolbar">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadCatReport()} disabled={catLoading}>
                Atualizar
              </button>
            </div>
          </div>
        )}
      </TabPanel>

      <TabPanel id="movimentacoes" active={active}>
        <div className="toolbar">
          <select
            className="select"
            style={{ maxWidth: 170 }}
            value={movKind}
            onChange={(e) => { setMovKind(e.target.value); setMovPage(1); }}
            aria-label="Filtrar movimentações por tipo"
          >
            <option value="">Todos os tipos</option>
            <option value="IN">Entrada</option>
            <option value="OUT">Saída</option>
            <option value="ADJUST">Ajuste</option>
          </select>
          <span className="toolbar-note">
            {movLoading ? "Atualizando movimentações…" : mov ? (mov.meta.total + (mov.meta.total === 1 ? " movimentação" : " movimentações")) : "—"}
          </span>
          {mov && mov.data.length > 0 ? (
            <button type="button" className="btn btn-brand btn-sm" onClick={exportarMov}>Baixar CSV</button>
          ) : null}
        </div>

        {movLoading ? (
          <LoadingInline label="Carregando movimentações de estoque…" />
        ) : movError ? (
          <ErrorState message={movError} onRetry={loadMov} />
        ) : !mov ? (
          <EmptyState
            title="Nenhuma movimentação carregada"
            description="Abra o painel para listar entradas, saídas e ajustes do estoque."
            action={<button type="button" className="btn btn-brand" onClick={() => void loadMov()}>Atualizar</button>}
          />
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="kpi-grid">
              <div className="kpi card-surface">
                <span className="kpi-label">Entradas</span>
                <div className="kpi-value" style={{ color: "var(--success)" }}>{mov.totais.entradas}</div>
                <span className="kpi-hint">unidades no recorte</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Saídas</span>
                <div className="kpi-value" style={{ color: "var(--danger)" }}>{mov.totais.saidas}</div>
                <span className="kpi-hint">unidades no recorte</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Ajustes</span>
                <div className="kpi-value" style={{ color: "var(--warning)" }}>{mov.totais.ajustes}</div>
                <span className="kpi-hint">unidades no recorte</span>
              </div>
            </div>

            {mov.data.length === 0 ? (
              <EmptyState
                title="Nenhuma movimentação neste recorte"
                description="Ajuste o filtro de tipo para ver outras movimentações."
              />
            ) : (
              <div className="card-surface table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Produto</th>
                      <th scope="col">Tipo</th>
                      <th scope="col">Quantidade</th>
                      <th scope="col">Nota</th>
                      <th scope="col">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mov.data.map((m) => (
                      <tr key={m.id}>
                        <td>{m.produto}</td>
                        <td>
                          <span className="status-pill" style={{ color: KIND_COR[m.kind], borderColor: KIND_COR[m.kind] }}>
                            {KIND_LABEL[m.kind]}
                          </span>
                        </td>
                        <td className="mono">{m.quantidade} {m.unidade}</td>
                        <td>{m.nota ?? "—"}</td>
                        <td>{formatDateTime(m.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  page={mov.meta.page}
                  pageSize={mov.meta.pageSize}
                  total={mov.meta.total}
                  totalPages={mov.meta.totalPages}
                  onChange={setMovPage}
                  onPageSizeChange={(n) => { setMovPageSize(n); setMovPage(1); }}
                  itemLabel="movimentacoes"
                  itemLabelSingular="movimentacao"
                />
              </div>
            )}
          </div>
        )}
      </TabPanel>

      {editing ? <ProductModal product={editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => void load()} /> : null}
      {moving ? <MovementModal product={moving} onClose={() => setMoving(null)} onSaved={() => void load()} /> : null}
      {history ? <HistoryModal product={history} onClose={() => setHistory(null)} /> : null}
      {catDialog ? <CategoryModal onClose={() => setCatDialog(false)} onSaved={() => { void load(); void loadCatReport(); }} /> : null}
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
  const dirty = useDirty(form);

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
    <Modal
      title={modalTitle("product", isNew)}
      subtitle={isNew ? "Cadastre o item que será vendido." : "Ajuste preço, estoque e categoria."}
      onClose={onClose}
      onSubmit={() => void submit()}
      busy={busy}
      dirty={dirty}
      hint={MODAL_COPY.requiredHint}
    >
        <div className="field">
          <span className="field-label">Nome *</span>
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
    </Modal>
  );
}

function MovementModal({ product, onClose, onSaved }: { product: ProductRow; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = useDirty({ kind, quantity, note });

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
    <Modal
      title={"Estoque · " + product.name}
      onClose={onClose}
      onSubmit={() => void submit()}
      busy={busy}
      dirty={dirty}
      submitLabel="Registrar"
      busyLabel="Registrando…"
      size="sm"
    >
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
    </Modal>
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
    <Modal title={"Histórico · " + product.name} onClose={onClose} size="lg">
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
    </Modal>
  );
}

function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = useDirty({ name });
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
    <Modal
      title={modalTitle("category", true)}
      onClose={onClose}
      onSubmit={() => void submit()}
      busy={busy}
      dirty={dirty}
      submitLabel="Criar"
      busyLabel="Criando…"
      hint={MODAL_COPY.requiredHint}
      size="sm"
    >
        <div className="field">
          <span className="field-label">Nome *</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
    </Modal>
  );
}
