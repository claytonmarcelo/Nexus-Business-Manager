import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { ACTIONS, modalTitle } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { baixarCsv } from "../lib/csv";
import { formatCurrency, formatDate } from "../lib/format";

interface SaleItem { id: string; productId: string; productName: string | null; quantity: number; unitPrice: number; lineTotal: number }
interface SaleRow { id: string; status: "PENDING" | "CONFIRMED" | "CANCELLED"; total: number; notes: string | null; clientName: string | null; userName: string | null; createdAt: string; items: SaleItem[] }
interface ClientOpt { id: string; name: string }
interface ProductOpt { id: string; name: string; salePrice: number; unit: string; stockQuantity: number; trackStock: boolean; active: boolean }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

// Espelho exato de vendas() em apps/api/src/modules/reports/reports.service.ts.
interface SaleReport {
  de: string;
  ate: string;
  receita: number;
  pedidos: number;
  ticket: number;
  canceladas: number;
  porStatus: { status: string; rotulo: string; quantidade: number; receita: number }[];
  porDia: { dia: string; receita: number; pedidos: number }[];
  topProdutos: { nome: string; quantidade: number; receita: number }[];
  topClientes: { nome: string; pedidos: number; receita: number }[];
  porVendedor: { nome: string; pedidos: number; receita: number }[];
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const statusLabel = { PENDING: "Pendente", CONFIRMED: "Confirmada", CANCELLED: "Cancelada" } as const;
const statusClass = { PENDING: "is-off", CONFIRMED: "is-on", CANCELLED: "is-off" } as const;

const ABAS: TabItem[] = [
  { id: "pedidos", label: "Pedidos de Venda", hint: "Lista, filtros e ações sobre os pedidos" },
  { id: "nova", label: "Nova Venda", hint: "Registrar uma venda com itens" },
  { id: "relatorios", label: "Relatórios", hint: "Receita, status e destaques do período" },
];

// Modulo Vendas: navegacao por abas — pedidos, criacao em painel proprio e relatorios.
export function Sales() {
  const { can } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "pedidos");
  const [rows, setRows] = useState<Paged<SaleRow> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SaleRow | null>(null);
  // Incremento pedido apos salvar na aba "nova": manda recarregar a lista
  // mesmo quando a pessoa ja esta de volta na aba "pedidos".
  const [recarga, setRecarga] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<SaleRow>>("/sales", {
        params: { page, pageSize, search: search || undefined, status: status || undefined },
      });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, recarga]);

  // A lista so e buscada com a aba de pedidos ativa (um fetch por aba).
  useEffect(() => {
    if (active !== "pedidos") return;
    void load();
  }, [active, load]);

  async function changeStatus(row: SaleRow, next: "CONFIRMED" | "CANCELLED") {
    const ok = await confirmAction({
      title: next === "CONFIRMED" ? "Confirmar venda" : "Cancelar venda",
      text: next === "CONFIRMED"
        ? "O estoque dos itens controlados será baixado."
        : "Se a venda estava confirmada, o estoque volta automaticamente.",
      confirmLabel: next === "CONFIRMED" ? "Confirmar" : "Cancelar venda",
    });
    if (!ok) return;
    try {
      await api.patch("/sales/" + row.id + "/status", { status: next });
      notify.success(next === "CONFIRMED" ? "Venda confirmada." : "Venda cancelada.");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  function vendaSalva() {
    setRecarga((n) => n + 1);
    onSelect("pedidos");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="page-sub">Pedidos da empresa ativa</p>
        </div>
        {can("sale:write") ? <button type="button" className="btn btn-brand" onClick={() => onSelect("nova")}>Nova venda</button> : null}
      </div>

      <Tabs
        tabs={ABAS}
        active={active}
        onSelect={(id) => { setPage(1); onSelect(id); }}
        ariaLabel="Seções de vendas"
      />

      <TabPanel id="pedidos" active={active}>
        <div className="toolbar">
          <input className="input" type="search" placeholder="Buscar por cliente" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar vendas" />
          <select className="select" style={{ maxWidth: 220 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            <option value="PENDING">Pendentes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
          <span className="toolbar-note">{loading ? "Atualizando lista…" : rows ? rows.meta.total + (rows.meta.total === 1 ? " venda" : " vendas") : "—"}</span>
        </div>

        {loading ? (
          <LoadingInline label="Carregando vendas…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : rows && rows.data.length > 0 ? (
          <div className="card-surface table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Itens</th>
                  <th scope="col">Total</th>
                  <th scope="col">Status</th>
                  <th scope="col">Data</th>
                  <th scope="col">Vendedor</th>
                  {can("sale:write") ? <th scope="col">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.data.map((s) => (
                  <tr key={s.id}>
                    <td><button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, height: "auto" }} onClick={() => setDetail(s)}>{s.clientName ?? "Consumidor final"}</button></td>
                    <td>{s.items.length}</td>
                    <td className="mono">{brl.format(s.total)}</td>
                    <td><span className={"status-pill " + statusClass[s.status]}>{statusLabel[s.status]}</span></td>
                    <td className="mono">{fmtData(s.createdAt)}</td>
                    <td>{s.userName ?? "—"}</td>
                    {can("sale:write") ? (
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          {s.status === "PENDING" ? (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void changeStatus(s, "CONFIRMED")}>Confirmar</button>
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
                itemLabel="pedidos"
                itemLabelSingular="pedido"
              />
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma venda encontrada"
            description={can("sale:write") ? "Registre a primeira venda para começar." : "Ajuste os filtros."}
            action={can("sale:write") ? <button type="button" className="btn btn-brand" onClick={() => onSelect("nova")}>Nova venda</button> : undefined}
          />
        )}
      </TabPanel>

      <TabPanel id="nova" active={active}>
        {can("sale:write") ? (
          <SaleForm onSaved={vendaSalva} />
        ) : (
          <EmptyState title="Sem permissão" description="Somente perfis com escrita em vendas podem registrar pedidos." />
        )}
      </TabPanel>

      <TabPanel id="relatorios" active={active}>
        <SaleReports />
      </TabPanel>

      {detail ? <SaleDetailModal sale={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

// Aba "Nova Venda": o formulario que antes vivia no modal agora e um painel
// de aba de verdade. Ao salvar: notify, limpeza do formulario, recarga da
// lista e volta para a aba "pedidos".
interface ItemDraft { productId: string; quantity: string; unitPrice: string }

const ITENS_INICIAIS: ItemDraft[] = [{ productId: "", quantity: "1", unitPrice: "" }];

function SaleForm({ onSaved }: { onSaved: () => void }) {
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmNow, setConfirmNow] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>(ITENS_INICIAIS);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api.get<Paged<ClientOpt>>("/clients", { params: { page: 1, pageSize: 100 } }),
      api.get<Paged<ProductOpt>>("/products", { params: { page: 1, pageSize: 100 } }),
    ])
      .then(([c, p]) => {
        if (!vivo) return;
        setClients(c.data.data.filter((x) => x.name));
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
    patchItem(idx, { productId: id, unitPrice: p ? String(p.salePrice) : "" });
  }

  const total = items.reduce((acc, it) => {
    const q = parseFloat(it.quantity.replace(",", ".")) || 0;
    const v = parseFloat(it.unitPrice.replace(",", ".")) || 0;
    return acc + q * v;
  }, 0);

  function limparFormulario() {
    setClientId("");
    setNotes("");
    setConfirmNow(false);
    setItems(ITENS_INICIAIS.map((it) => ({ ...it })));
  }

  async function save() {
    const clean = items.filter((it) => it.productId);
    if (clean.length === 0) { notify.error("Adicione ao menos um produto."); return; }
    for (const it of clean) {
      const q = parseFloat(it.quantity.replace(",", ".")) || 0;
      if (q <= 0) { notify.error("Quantidade deve ser maior que zero."); return; }
    }
    setSaving(true);
    try {
      await api.post("/sales", {
        clientId: clientId || undefined,
        notes: notes.trim() || undefined,
        confirm: confirmNow,
        items: clean.map((it) => ({
          productId: it.productId,
          quantity: parseFloat(it.quantity.replace(",", ".")),
          unitPrice: parseFloat(it.unitPrice.replace(",", ".")) || 0,
        })),
      });
      notify.success(confirmNow ? "Venda registrada e confirmada." : "Venda registrada como pendente.");
      limparFormulario();
      onSaved();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-surface panel">
      <h2 className="nx-panel-title">{modalTitle("sale", true)}</h2>
      <p className="nx-panel-sub">Some os itens, confirme agora para dar baixa no estoque ou salve como pedido pendente.</p>

      {loadError ? <ErrorState message={loadError} /> : null}

      <div className="field">
        <label className="field-label" htmlFor="sale-client">Cliente</label>
        <select id="sale-client" className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Consumidor final</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="field">
        <span className="field-label">Itens</span>
        {items.map((it, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) 60px 84px 76px 30px", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <select className="select" value={it.productId} onChange={(e) => chooseProduct(idx, e.target.value)} aria-label={"Produto " + (idx + 1)}>
              <option value="">Selecione o produto</option>
              {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
            <input className="input" inputMode="decimal" value={it.quantity} onChange={(e) => patchItem(idx, { quantity: e.target.value })} aria-label="Quantidade" />
            <input className="input" inputMode="decimal" value={it.unitPrice} onChange={(e) => patchItem(idx, { unitPrice: e.target.value })} aria-label="Preço unitário" />
            <span className="mono" style={{ fontSize: "0.78rem" }}>{brl.format((parseFloat(it.quantity.replace(",", ".")) || 0) * (parseFloat(it.unitPrice.replace(",", ".")) || 0))}</span>
            {items.length > 1 ? (
              <button type="button" className="btn btn-ghost btn-sm" aria-label="Remover item" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>×</button>
            ) : <span />}
          </div>
        ))}
        {items.some((it) => it.productId && productById(it.productId)?.trackStock) ? (
          <p className="form-note">
            {items.filter((it) => it.productId && productById(it.productId)?.trackStock)
              .map((it) => { const p = productById(it.productId)!; return p.name + ": " + p.stockQuantity + " " + p.unit; })
              .join(" · ")}
          </p>
        ) : null}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setItems((prev) => [...prev, { productId: "", quantity: "1", unitPrice: "" }])}>{ACTIONS.addItem}</button>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="sale-notes">Observações</label>
        <textarea id="sale-notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </div>

      <label className="neu-check" style={{ marginBottom: "0.9rem" }}>
        <input type="checkbox" checked={confirmNow} onChange={(e) => setConfirmNow(e.target.checked)} />
        Confirmar agora (baixa o estoque dos itens controlados)
      </label>

      <div className="toolbar" style={{ marginTop: 0 }}>
        <button type="button" className="btn btn-brand" onClick={() => void save()} disabled={saving}>
          {saving ? "Registrando…" : "Registrar venda"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={limparFormulario} disabled={saving}>Limpar formulário</button>
        <span className="toolbar-note">Total: <strong className="mono">{brl.format(total)}</strong></span>
      </div>
    </div>
  );
}

// Aba "Relatorios": um unico GET /reports/sales por aba, buscado somente
// quando a aba esta ativa (o componente e montado so nesse momento).
function SaleReports() {
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [rel, setRel] = useState<SaleReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<SaleReport>("/reports/sales", {
        params: { de: de || undefined, ate: ate || undefined },
      });
      setRel(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [de, ate]);

  useEffect(() => {
    void load();
  }, [load]);

  function baixar() {
    if (!rel) return;
    const quantidade = baixarCsv(
      "vendas-por-dia-" + rel.de + "-ate-" + rel.ate,
      ["Dia", "Receita", "Pedidos"],
      rel.porDia.map((d) => [d.dia, String(d.receita).replace(".", ","), d.pedidos]),
    );
    notify.success(quantidade + (quantidade === 1 ? " dia exportado em CSV." : " dias exportados em CSV."));
  }

  const maxDia = rel && rel.porDia.length ? Math.max(...rel.porDia.map((d) => d.receita)) : 0;
  const maxStatus = rel && rel.porStatus.length ? Math.max(...rel.porStatus.map((s) => s.quantidade)) : 0;

  return (
    <>
      <div className="toolbar">
        <input className="input" type="date" style={{ maxWidth: 158 }} value={de}
          onChange={(e) => setDe(e.target.value)} aria-label="Do dia" />
        <input className="input" type="date" style={{ maxWidth: 158 }} value={ate}
          onChange={(e) => setAte(e.target.value)} aria-label="Até o dia" />
        <span className="toolbar-note">{rel ? "Período: " + formatDate(rel.de) + " a " + formatDate(rel.ate) : "Carregando período…"}</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={baixar} disabled={loading || !rel || rel.porDia.length === 0}>
          Baixar CSV
        </button>
      </div>

      {loading ? (
        <LoadingInline label="Carregando relatório de vendas…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rel ? null : (
        <>
          <div className="kpi-grid">
            <div className="kpi card-surface">
              <p className="kpi-label">Receita</p>
              <p className="kpi-value mono">{formatCurrency(rel.receita)}</p>
              <p className="kpi-hint">no período, exceto canceladas</p>
            </div>
            <div className="kpi card-surface">
              <p className="kpi-label">Pedidos</p>
              <p className="kpi-value">{rel.pedidos}</p>
              <p className="kpi-hint">vendas efetivas</p>
            </div>
            <div className="kpi card-surface">
              <p className="kpi-label">Ticket médio</p>
              <p className="kpi-value mono">{formatCurrency(rel.ticket)}</p>
              <p className="kpi-hint">receita por pedido</p>
            </div>
            <div className="kpi card-surface">
              <p className="kpi-label">Canceladas</p>
              <p className="kpi-value">{rel.canceladas}</p>
              <p className="kpi-hint">pedidos cancelados no período</p>
            </div>
          </div>

          {rel.pedidos === 0 && rel.canceladas === 0 ? (
            <EmptyState title="Nenhuma venda no período" description="Ajuste as datas acima para outra faixa." />
          ) : (
            <>
              <div className="card-surface panel">
                <h2 className="nx-panel-title">Distribuição por status</h2>
                <p className="nx-panel-sub">Quantidade de pedidos e receita acumulada em cada situação.</p>
                <ul className="nx-distrib">
                  {rel.porStatus.map((s) => (
                    <li key={s.status} className="nx-distrib-row">
                      <span className="nx-distrib-label">{s.rotulo}</span>
                      <span className="nx-distrib-track">
                        <span className="nx-distrib-fill" style={{ width: maxStatus ? Math.round((s.quantidade / maxStatus) * 100) + "%" : "0%" }} />
                      </span>
                      <span className="nx-distrib-value">{s.quantidade} · {formatCurrency(s.receita)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-surface panel">
                <h2 className="nx-panel-title">Receita por dia</h2>
                <p className="nx-panel-sub">Barras proporcionais ao faturamento de cada dia com venda efetiva.</p>
                {rel.porDia.length === 0 ? (
                  <EmptyState title="Sem vendas no período" description="Nenhum dia com receita na faixa selecionada." />
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "0.35rem", height: "9rem" }}>
                    {rel.porDia.map((d) => (
                      <div
                        key={d.dia}
                        title={formatDate(d.dia) + " · " + formatCurrency(d.receita) + " · " + d.pedidos + (d.pedidos === 1 ? " pedido" : " pedidos")}
                        style={{ flex: "1 1 0", minWidth: 6, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }}
                      >
                        <div style={{ height: maxDia ? Math.max(4, Math.round((d.receita / maxDia) * 100)) + "%" : 4, borderRadius: 6, background: "linear-gradient(180deg, var(--brand), var(--accent))" }} />
                      </div>
                    ))}
                  </div>
                )}
                {rel.porDia.length > 0 ? (
                  <p className="form-note">{formatDate(rel.porDia[0].dia)} a {formatDate(rel.porDia[rel.porDia.length - 1].dia)} · passe o mouse nas barras para ver os valores.</p>
                ) : null}
              </div>

              <div className="nx-split">
                <div className="card-surface panel">
                  <h2 className="nx-panel-title">Top produtos</h2>
                  <p className="nx-panel-sub">Oito produtos com maior receita no período.</p>
                  {rel.topProdutos.length === 0 ? (
                    <p className="form-note">Nenhum item vendido no período.</p>
                  ) : (
                    <ul className="nx-distrib">
                      {rel.topProdutos.map((p) => (
                        <li key={p.nome} className="nx-distrib-row">
                          <span className="nx-distrib-label">{p.nome}</span>
                          <span className="nx-distrib-track">
                            <span className="nx-distrib-fill" style={{ width: Math.max(4, Math.round((p.receita / Math.max(1, rel.topProdutos[0].receita)) * 100)) + "%" }} />
                          </span>
                          <span className="nx-distrib-value">{formatCurrency(p.receita)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="card-surface panel">
                  <h2 className="nx-panel-title">Top clientes</h2>
                  <p className="nx-panel-sub">Oito clientes com maior receita gerada.</p>
                  {rel.topClientes.length === 0 ? (
                    <p className="form-note">Nenhuma venda com cliente identificado no período.</p>
                  ) : (
                    <ul className="nx-distrib">
                      {rel.topClientes.map((c) => (
                        <li key={c.nome} className="nx-distrib-row">
                          <span className="nx-distrib-label">{c.nome}</span>
                          <span className="nx-distrib-track">
                            <span className="nx-distrib-fill" style={{ width: Math.max(4, Math.round((c.receita / Math.max(1, rel.topClientes[0].receita)) * 100)) + "%" }} />
                          </span>
                          <span className="nx-distrib-value">{c.pedidos} · {formatCurrency(c.receita)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="card-surface panel">
                <h2 className="nx-panel-title">Desempenho por vendedor</h2>
                <p className="nx-panel-sub">Pedidos efetivos e receita atribuída a cada vendedor.</p>
                {rel.porVendedor.length === 0 ? (
                  <p className="form-note">Nenhuma venda atribuída no período.</p>
                ) : (
                  <ul className="nx-distrib">
                    {rel.porVendedor.map((v) => (
                      <li key={v.nome} className="nx-distrib-row">
                        <span className="nx-distrib-label">{v.nome}</span>
                        <span className="nx-distrib-track">
                          <span className="nx-distrib-fill" style={{ width: Math.max(4, Math.round((v.receita / Math.max(1, rel.porVendedor[0].receita)) * 100)) + "%" }} />
                        </span>
                        <span className="nx-distrib-value">{v.pedidos} · {formatCurrency(v.receita)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

// Detalhe da venda: cabeçalho com situação e lista dos itens com totais por linha.
function SaleDetailModal({ sale, onClose }: { sale: SaleRow; onClose: () => void }) {
  return (
    <Modal
      title={<>Venda <span className={"status-pill " + statusClass[sale.status]}>{statusLabel[sale.status]}</span></>}
      label="Detalhe da venda"
      subtitle={(sale.clientName ?? "Consumidor final") + " · " + fmtData(sale.createdAt)}
      onClose={onClose}
    >
        <dl className="kv">
          <div><dt>Cliente</dt><dd>{sale.clientName ?? "Consumidor final"}</dd></div>
          <div><dt>Vendedor</dt><dd>{sale.userName ?? "—"}</dd></div>
          <div><dt>Data</dt><dd className="mono">{fmtData(sale.createdAt)}</dd></div>
          <div><dt>Total</dt><dd className="mono">{brl.format(sale.total)}</dd></div>
          {sale.notes ? <div><dt>Observações</dt><dd>{sale.notes}</dd></div> : null}
        </dl>
        <h3 className="panel-title" style={{ marginTop: "1rem" }}>Itens</h3>
        <ul className="activity-list">
          {sale.items.map((it) => (
            <li key={it.id} className="activity-item">
              <span className="activity-dot" />
              <span className="activity-entity">{it.productName ?? "Produto removido"}</span>
              <span style={{ marginLeft: "auto" }} className="mono">{it.quantity} × {brl.format(it.unitPrice)} = {brl.format(it.lineTotal)}</span>
            </li>
          ))}
        </ul>
    </Modal>
  );
}
