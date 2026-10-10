import { useCallback, useEffect, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { ACTIONS, modalTitle } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";

interface SaleItem { id: string; productId: string; productName: string | null; quantity: number; unitPrice: number; lineTotal: number }
interface SaleRow { id: string; status: "PENDING" | "CONFIRMED" | "CANCELLED"; total: number; notes: string | null; clientName: string | null; userName: string | null; createdAt: string; items: SaleItem[] }
interface ClientOpt { id: string; name: string }
interface ProductOpt { id: string; name: string; salePrice: number; unit: string; stockQuantity: number; trackStock: boolean; active: boolean }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const statusLabel = { PENDING: "Pendente", CONFIRMED: "Confirmada", CANCELLED: "Cancelada" } as const;
const statusClass = { PENDING: "is-off", CONFIRMED: "is-on", CANCELLED: "is-off" } as const;

// Modulo Vendas: lista paginada, criacao com itens e baixa de estoque na confirmacao.
export function Sales() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<SaleRow> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<SaleRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<SaleRow>>("/sales", {
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="page-sub">Pedidos da empresa ativa</p>
        </div>
        {can("sale:write") ? <button type="button" className="btn btn-brand" onClick={() => setCreating(true)}>Nova venda</button> : null}
      </div>

      <div className="toolbar">
        <input className="input" type="search" placeholder="Buscar por cliente" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Buscar vendas" />
        <select className="select" style={{ maxWidth: 220 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          <option value="PENDING">Pendentes</option>
          <option value="CONFIRMED">Confirmadas</option>
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
            <Pagination page={rows.meta.page} pageSize={rows.meta.pageSize} total={rows.meta.total} totalPages={rows.meta.totalPages} onChange={setPage} />
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma venda encontrada"
          description={can("sale:write") ? "Registre a primeira venda para começar." : "Ajuste os filtros."}
          action={can("sale:write") ? <button type="button" className="btn btn-brand" onClick={() => setCreating(true)}>Nova venda</button> : undefined}
        />
      )}

      {creating ? <SaleModal onClose={() => setCreating(false)} onSaved={() => void load()} /> : null}
      {detail ? <SaleDetailModal sale={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

// Modal de criação: itens dinâmicos, preço sugerido do produto, total calculado ao vivo.
interface ItemDraft { productId: string; quantity: string; unitPrice: string }

function SaleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmNow, setConfirmNow] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([{ productId: "", quantity: "1", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);
  const dirty = useDirty({ clientId, notes, confirmNow, items });
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
      title={modalTitle("sale", true)}
      subtitle="Some os itens, confirme agora para dar baixa no estoque ou salve como pedido pendente."
      onClose={onClose}
      onSubmit={() => void save()}
      busy={saving}
      dirty={dirty}
      submitLabel="Registrar venda"
      busyLabel="Registrando…"
      size="lg"
      hint={<span>Total: <strong className="mono">{brl.format(total)}</strong></span>}
    >

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
          {items.map((it, idx) => {
            return (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) 72px 100px 90px 32px", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                <select className="select" value={it.productId} onChange={(e) => chooseProduct(idx, e.target.value)} aria-label={"Produto " + (idx + 1)}>
                  <option value="">Selecione o produto</option>
                  {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                </select>
                <input className="input" inputMode="decimal" value={it.quantity} onChange={(e) => patchItem(idx, { quantity: e.target.value })} aria-label="Quantidade" />
                <input className="input" inputMode="decimal" value={it.unitPrice} onChange={(e) => patchItem(idx, { unitPrice: e.target.value })} aria-label="Preço unitário" />
                <span className="mono" style={{ fontSize: "0.85rem" }}>{brl.format((parseFloat(it.quantity.replace(",", ".")) || 0) * (parseFloat(it.unitPrice.replace(",", ".")) || 0))}</span>
                {items.length > 1 ? (
                  <button type="button" className="btn btn-ghost btn-sm" aria-label="Remover item" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>×</button>
                ) : <span />}
              </div>
            );
          })}
          {items.some((it) => it.productId && productById(it.productId)?.trackStock) ? (
            <p className="text-muted" style={{ fontSize: "0.78rem", margin: "0.15rem 0 0.5rem" }}>
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

    </Modal>
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
