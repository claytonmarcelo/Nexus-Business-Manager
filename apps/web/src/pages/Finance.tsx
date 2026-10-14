import { useCallback, useEffect, useRef, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO, usePaginacaoLocal } from "../components/Pagination";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { ACTIONS, MODAL_COPY, modalTitle, notice } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { baixarCsv } from "../lib/csv";
import { formatCurrency, formatDate } from "../lib/format";
import { valorNumerico } from "../lib/money";

interface CategoryRow { id: string; name: string; type: "INCOME" | "EXPENSE" }
interface EntryRow {
  id: string; type: "INCOME" | "EXPENSE"; status: "PENDING" | "PAID" | "CANCELLED";
  description: string; amount: number; dueDate: string; paidAt: string | null; notes: string | null;
  categoryName: string | null; categoryId: string | null; clientName: string | null; supplierName: string | null; userName: string | null;
}
interface Summary { month: string; income: number; expense: number; balance: number; pendingIncome: number; pendingExpense: number; overdueCount: number; overdueAmount: number }
interface Option { id: string; name: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

// Campos exatos de financeiro() em apps/api/src/modules/reports/reports.service.ts.
interface FluxoPonto { dia: string; entradas: number; saidas: number; saldo: number }
interface ContaPendente { id: string; descricao: string; valor: number; vencimento: string; atrasada: boolean }
interface VencidaItem { tipo: "INCOME" | "EXPENSE"; quantidade: number; valor: number }
interface CentroItem { id: string; nome: string; tipo: "INCOME" | "EXPENSE"; quantidade: number; valor: number; participacao: number }
interface FinanceiroRelatorio {
  janelaDias: number;
  fluxo: FluxoPonto[];
  resumo: { entradas: number; saidas: number; saldo: number };
  aReceber: (ContaPendente & { cliente: string })[];
  aPagar: (ContaPendente & { fornecedor: string })[];
  vencidas: VencidaItem[];
  centros: CentroItem[];
}

const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const mesAtual = () => {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};
const statusLabel = { PENDING: "Pendente", PAID: "Pago", CANCELLED: "Cancelado" } as const;
const statusClass = { PENDING: "is-off", PAID: "is-on", CANCELLED: "is-off" } as const;

const ABAS: TabItem[] = [
  { id: "fluxo", label: "Fluxo de Caixa", hint: "Entradas, saídas e saldo dia a dia" },
  { id: "contas", label: "Contas a Pagar / Receber", hint: "Lançamentos, filtros e baixa de pagamento" },
  { id: "centros", label: "Centros de Custo", hint: "Distribuição por categoria e gestão de categorias" },
];

const JANELAS = [7, 15, 30, 60, 90];

// Português correto de contagem: "1 lançamento", "3 lançamentos".
const plural = (n: number, um: string, varios: string) => n + " " + (n === 1 ? um : varios);

// Módulo Financeiro em três abas: fluxo de caixa (análise), contas a pagar/receber
// (operação do dia a dia, preservada) e centros de custo (distribuição por categoria).
export function Finance() {
  const { can } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "fluxo");

  // Lançamentos (aba Contas): comportamento histórico da página, mantido por completo.
  const [rows, setRows] = useState<Paged<EntryRow> | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState(mesAtual());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EntryRow | "new" | null>(null);

  // Relatório financeiro (abas Fluxo e Centros, e os alertas da aba Contas):
  // é buscado apenas quando a aba ativa precisa dele — um fetch por aba.
  const [dias, setDias] = useState(30);
  const [relatorio, setRelatorio] = useState<FinanceiroRelatorio | null>(null);
  const [relLoading, setRelLoading] = useState(true);
  const [relError, setRelError] = useState<string | null>(null);

  // O fluxo diario vem inteiro do relatorio (ate 90 dias): a virada de pagina
  // e feita no navegador com o mesmo componente das tabelas paginadas.
  const fluxo = usePaginacaoLocal(relatorio?.fluxo ?? []);

  // N51 (P14, passada da F5): quatro filtros e um campo de busca na mesma barra —
  // trocar dois no mesmo segundo dispara dois pedidos. A lista que vale é a do mais
  // novo, e o resumo viaja junto com ela porque é do mesmo filtro de mês.
  const ultimaLista = useRef(0);

  const loadContas = useCallback(async () => {
    const minhaBusca = ++ultimaLista.current;
    setLoading(true);
    setError(null);
    try {
      const [lista, resumo] = await Promise.all([
        api.get<Paged<EntryRow>>("/finance/entries", {
          params: { page, pageSize, search: search || undefined, type: type || undefined, status: status || undefined, month: month || undefined },
        }),
        api.get<Summary>("/finance/summary", { params: { month: month || undefined } }),
      ]);
      if (minhaBusca !== ultimaLista.current) return;
      setRows(lista.data);
      setSummary(resumo.data);
    } catch (err) {
      if (minhaBusca !== ultimaLista.current) return;
      setError(extractErrorMessage(err));
    } finally {
      if (minhaBusca === ultimaLista.current) setLoading(false);
    }
  }, [page, pageSize, search, type, status, month]);

  const loadRelatorio = useCallback(async () => {
    setRelLoading(true);
    setRelError(null);
    try {
      const { data } = await api.get<FinanceiroRelatorio>("/reports/finance", { params: { dias } });
      setRelatorio(data);
    } catch (err) {
      setRelError(extractErrorMessage(err));
    } finally {
      setRelLoading(false);
    }
  }, [active, dias]);

  useEffect(() => {
    if (active === "contas") void loadContas();
  }, [active, loadContas]);

  useEffect(() => {
    void loadRelatorio();
  }, [loadRelatorio]);

  function recarregar() {
    if (active === "contas") void loadContas();
    void loadRelatorio();
  }

  async function changeStatus(row: EntryRow, next: "PAID" | "PENDING" | "CANCELLED") {
    const textos = {
      PAID: { title: "Registrar pagamento", text: "Marcar {nome} como pago hoje?", label: "Pagar", danger: false },
      PENDING: { title: "Reabrir lançamento", text: "Voltar {nome} para pendente?", label: "Reabrir", danger: false },
      CANCELLED: { title: "Cancelar lançamento", text: "Deseja realmente cancelar {nome}?", label: "Cancelar", danger: true },
    }[next];
    await confirmAction({
      title: textos.title,
      text: textos.text,
      nome: row.description,
      detalhe:
        (row.type === "INCOME" ? "Recebimento" : "Despesa") + " de " + formatCurrency(row.amount) +
        ", vencimento em " + formatDate(row.dueDate) +
        (row.categoryName ? " · " + row.categoryName : "") +
        (next === "PAID"
          ? ". A data de pagamento registrada é hoje."
          : next === "PENDING"
            ? ". Ele volta a contar nas contas em aberto e no alerta de vencidos."
            : ". Ele deixa de contar nos resumos e no fluxo de caixa."),
      confirmLabel: textos.label,
      danger: textos.danger,
      action: async () => {
        try {
          await api.patch("/finance/entries/" + row.id + "/status", { status: next });
          notify.success("Lançamento atualizado.");
          recarregar();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        }
      },
    });
  }

  function exportarFluxo() {
    if (!relatorio || relatorio.fluxo.length === 0) {
      notify.error("Não há fluxo de caixa para exportar neste período.");
      return;
    }
    const quantidade = baixarCsv(
      "fluxo-de-caixa-" + relatorio.janelaDias + "-dias",
      ["Dia", "Entradas", "Saidas", "Saldo"],
      relatorio.fluxo.map((f) => [formatDate(f.dia), f.entradas, f.saidas, f.saldo]),
    );
    notify.success(quantidade + (quantidade === 1 ? " dia exportado em CSV." : " dias exportados em CSV."));
  }

  // Barra do saldo acumulado, escalada pelo maior valor absoluto da janela.
  const maxAbs = relatorio && relatorio.fluxo.length
    ? Math.max(1, ...relatorio.fluxo.map((f) => Math.abs(f.saldo)))
    : 1;

  const centrosEntrada = relatorio ? relatorio.centros.filter((c) => c.tipo === "INCOME") : [];
  const centrosSaida = relatorio ? relatorio.centros.filter((c) => c.tipo === "EXPENSE") : [];

  const vencidasQtd = relatorio ? relatorio.vencidas.reduce((s, v) => s + v.quantidade, 0) : 0;
  const vencidasValor = relatorio ? relatorio.vencidas.reduce((s, v) => s + v.valor, 0) : 0;

  function alertasResumo() {
    if (relLoading) return <LoadingInline label="Carregando o resumo pendente…" />;
    if (relError) return <ErrorState message={relError} onRetry={loadRelatorio} />;
    if (!relatorio) return null;
    const detalhes = relatorio.vencidas.length
      ? relatorio.vencidas.map((v) => (v.tipo === "INCOME" ? "a receber" : "a pagar") + " " + plural(v.quantidade, "item", "itens") + " · " + formatCurrency(v.valor)).join(" · ")
      : "Nenhum lançamento venceu até hoje.";
    return (
      <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="nx-alerta is-aviso">
          <div>
            <div className="nx-alerta-titulo">A receber</div>
            <div className="nx-alerta-texto">{plural(relatorio.aReceber.length, "receita", "receitas")} em aberto</div>
          </div>
          <span className="nx-alerta-qty">{relatorio.aReceber.length}</span>
        </div>
        <div className="nx-alerta is-aviso">
          <div>
            <div className="nx-alerta-titulo">A pagar</div>
            <div className="nx-alerta-texto">{plural(relatorio.aPagar.length, "despesa", "despesas")} em aberto</div>
          </div>
          <span className="nx-alerta-qty">{relatorio.aPagar.length}</span>
        </div>
        <div className="nx-alerta is-critico">
          <div>
            <div className="nx-alerta-titulo">Vencidos</div>
            <div className="nx-alerta-texto">{relatorio.vencidas.length ? plural(vencidasQtd, "lançamento", "lançamentos") + " · " + formatCurrency(vencidasValor) + " · " + detalhes : detalhes}</div>
          </div>
          <span className="nx-alerta-qty">{vencidasQtd}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Financeiro</h1>
          <p className="page-sub">Receitas, despesas e análise da empresa ativa</p>
        </div>
      </div>

      <Tabs tabs={ABAS} active={active} onSelect={onSelect} ariaLabel="Seções do financeiro" />

      {/* ---- Aba Fluxo de Caixa ---- */}
      <TabPanel id="fluxo" active={active}>
        {relLoading ? (
          <LoadingInline label="Carregando o fluxo de caixa…" />
        ) : relError ? (
          <ErrorState message={relError} onRetry={loadRelatorio} />
        ) : relatorio ? (
          <>
            <div className="kpi-grid">
              <div className="kpi card-surface">
                <span className="kpi-label">Entradas</span>
                <div className="kpi-value" style={{ color: "var(--success)" }}>{formatCurrency(relatorio.resumo.entradas)}</div>
                <span className="kpi-hint">recebido nos últimos {relatorio.janelaDias} dias</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Saídas</span>
                <div className="kpi-value" style={{ color: "var(--danger)" }}>{formatCurrency(relatorio.resumo.saidas)}</div>
                <span className="kpi-hint">pago nos últimos {relatorio.janelaDias} dias</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Saldo</span>
                <div className="kpi-value">{formatCurrency(relatorio.resumo.saldo)}</div>
                <span className="kpi-hint">{relatorio.resumo.saldo >= 0 ? "resultado positivo no período" : "resultado negativo no período"}</span>
              </div>
            </div>

            <div className="toolbar">
              <select
                className="select"
                style={{ maxWidth: 170 }}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                aria-label="Janela de dias do fluxo"
              >
                {JANELAS.map((d) => <option key={d} value={d}>{d} dias</option>)}
              </select>
              <button type="button" className="btn btn-ghost btn-sm" onClick={exportarFluxo}>
                Baixar CSV
              </button>
              <span className="toolbar-note">Fluxo diário considerando apenas lançamentos já pagos.</span>
            </div>

            {relatorio.fluxo.length === 0 ? (
              <EmptyState title="Sem movimento no período" description="Registre lançamentos pagos para vê-los aqui." />
            ) : (
              <div className="card-surface table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Dia</th>
                      <th scope="col">Entradas</th>
                      <th scope="col">Saídas</th>
                      <th scope="col">Saldo</th>
                      <th scope="col">Saldo acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fluxo.itens.map((f) => (
                      <tr key={f.dia}>
                        <td className="mono">{formatDate(f.dia)}</td>
                        <td className="mono">{f.entradas > 0 ? formatCurrency(f.entradas) : "—"}</td>
                        <td className="mono">{f.saidas > 0 ? formatCurrency(f.saidas) : "—"}</td>
                        <td className="mono">{formatCurrency(f.saldo)}</td>
                        <td>
                          <span className="nx-distrib-track" style={{ display: "block", maxWidth: 160 }}>
                            <span className="nx-distrib-fill" style={{ width: Math.max(2, Math.round((Math.abs(f.saldo) / maxAbs) * 100)) + "%" }} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination {...fluxo.pagina} itemLabel="dias" itemLabelSingular="dia" />
              </div>
            )}
          </>
        ) : null}
      </TabPanel>

      {/* ---- Aba Contas a Pagar / Receber (operações históricas preservadas) ---- */}
      <TabPanel id="contas" active={active}>
        {alertasResumo()}

        <div className="card-surface panel">
          <h2 className="nx-panel-title">Resumo do mês</h2>
          <p className="nx-panel-sub">Valores fechados no mês selecionado, considerando somente lançamentos pagos.</p>
          {summary ? (
            <div className="kpi-grid">
              <div className="kpi card-surface"><span className="kpi-label">Receitas pagas</span><div className="kpi-value" style={{ color: "var(--success)" }}>{formatCurrency(summary.income)}</div><span className="kpi-hint">+ {formatCurrency(summary.pendingIncome)} a receber</span></div>
              <div className="kpi card-surface"><span className="kpi-label">Despesas pagas</span><div className="kpi-value" style={{ color: "var(--danger)" }}>{formatCurrency(summary.expense)}</div><span className="kpi-hint">+ {formatCurrency(summary.pendingExpense)} a pagar</span></div>
              <div className="kpi card-surface"><span className="kpi-label">Saldo do mês</span><div className="kpi-value">{formatCurrency(summary.balance)}</div><span className="kpi-hint">{summary.month}</span></div>
              <div className="kpi card-surface"><span className="kpi-label">Atrasados</span><div className="kpi-value">{summary.overdueCount}</div><span className="kpi-hint">{formatCurrency(summary.overdueAmount)} vencidos</span></div>
            </div>
          ) : loading ? (
            <LoadingInline label="Carregando o resumo…" />
          ) : (
            <p className="nx-panel-sub" style={{ margin: 0 }}>Nenhum dado de resumo para este mês.</p>
          )}
        </div>

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
          {can("finance:write") ? (
            <button type="button" className="btn btn-brand btn-sm" onClick={() => setEditing("new")}>Novo lançamento</button>
          ) : null}
        </div>

        {loading ? (
          <LoadingInline label="Carregando lançamentos…" />
        ) : error ? (
          <ErrorState message={error} onRetry={loadContas} />
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
                  {can("finance:write") ? <th scope="col" className="col-acoes">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.data.map((e) => (
                  <tr key={e.id}>
                    <td><button type="button" className="btn btn-ghost btn-sm" style={{ padding: 0, height: "auto" }} onClick={() => setEditing(e)}>{e.description}</button></td>
                    <td><span className="badge" style={e.type === "EXPENSE" ? { background: "color-mix(in srgb, var(--danger) 16%, transparent)", color: "var(--danger)" } : { background: "color-mix(in srgb, var(--success) 16%, transparent)", color: "var(--success)" }}>{e.type === "INCOME" ? "Receita" : "Despesa"}</span></td>
                    <td>{e.categoryName ?? "—"}</td>
                    <td className="mono">{formatCurrency(e.amount)}</td>
                    <td className="mono">{fmtData(e.dueDate)}</td>
                    <td><span className={"status-pill " + statusClass[e.status]}>{statusLabel[e.status]}</span></td>
                    {can("finance:write") ? (
                      <td>
                        <div className="row-actions">
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
              <Pagination
                page={rows.meta.page}
                pageSize={rows.meta.pageSize}
                total={rows.meta.total}
                totalPages={rows.meta.totalPages}
                onChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                itemLabel="lançamentos"
                itemLabelSingular="lançamento"
              />
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Nenhum lançamento no período"
            description={can("finance:write") ? "Registre a primeira receita ou despesa." : "Ajuste os filtros."}
            action={can("finance:write") ? <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo lançamento</button> : undefined}
          />
        )}
      </TabPanel>

      {/* ---- Aba Centros de Custo ---- */}
      <TabPanel id="centros" active={active}>
        {relLoading ? (
          <LoadingInline label="Carregando a distribuição por categoria…" />
        ) : relError ? (
          <ErrorState message={relError} onRetry={loadRelatorio} />
        ) : relatorio ? (
          <div className="card-surface panel">
            <h2 className="nx-panel-title">Distribuição por centro de custo</h2>
            <p className="nx-panel-sub">
              Aqui o centro de custo é a categoria do lançamento: cada receita ou despesa entra no bolo
              conforme a categoria em que foi classificada. Ajuste as categorias logo abaixo.
            </p>
            {relatorio.centros.length === 0 ? (
              <EmptyState title="Nenhum lançamento categorizado" description="Classifique lançamentos por categoria para ver a distribuição." />
            ) : (
              <div className="nx-split">
                {blocoCentro("Entradas (receitas)", centrosEntrada)}
                {blocoCentro("Saídas (despesas)", centrosSaida)}
              </div>
            )}
          </div>
        ) : null}

        <GestaoCategorias />
      </TabPanel>

      {editing ? <EntryModal entry={editing} onClose={() => setEditing(null)} onSaved={recarregar} /> : null}
    </div>
  );
}

// Barras .nx-distrib de um grupo (entradas ou saídas), ordenadas por valor.
function blocoCentro(titulo: string, itens: CentroItem[]) {
  return (
    <div className="card-surface panel">
      <h3 className="nx-panel-title">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="nx-panel-sub" style={{ margin: 0 }}>Nenhum lançamento neste tipo.</p>
      ) : (
        <ul className="nx-distrib">
          {itens.map((c) => (
            <li key={c.tipo + "-" + c.id} className="nx-distrib-row">
              <span className="nx-distrib-label" title={c.nome}>{c.nome}</span>
              <span className="nx-distrib-track">
                <span className="nx-distrib-fill" style={{ width: Math.max(2, Math.min(100, c.participacao)) + "%" }} />
              </span>
              <span className="nx-distrib-value">{formatCurrency(c.valor)} · {plural(c.quantidade, "lançamento", "lançamentos")}</span>
            </li>
          ))}
        </ul>
      )}
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
  const dirty = useDirty(form);

  useEffect(() => {
    // N51/P14: ao trocar o tipo, a resposta antiga das categorias nao pode chegar
    // depois da nova e encher o seletor com categorias de outro tipo.
    let vivo = true;
    api.get<CategoryRow[]>("/finance/categories", { params: { type: form.type } })
      .then((r) => { if (vivo) setCategories(r.data); })
      .catch(() => { if (vivo) setCategories([]); });
    return () => { vivo = false; };
  }, [form.type]);

  useEffect(() => {
    // N51/P14: o modal pode fechar antes de as listas chegarem. Reabri-lo dispara
    // nova busca, e a resposta de fora nao pode reescrever os seletores de dentro.
    let vivo = true;
    if (isNew) {
      Promise.all([
        api.get<Paged<Option>>("/clients", { params: { page: 1, pageSize: 100 } }),
        api.get<Paged<Option>>("/suppliers", { params: { page: 1, pageSize: 100, active: "true" } }),
      ])
        .then(([c, s]) => { if (vivo) { setClients(c.data.data); setSuppliers(s.data.data); } })
        .catch(() => { /* selects ficam vazios; erro aparece ao salvar */ });
    }
    return () => { vivo = false; };
  }, [isNew]);

  async function submit() {
    const valor = valorNumerico(form.amount);
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
        notify.success(notice("entry", "registered"));
      } else {
        await api.patch("/finance/entries/" + entry.id, payload);
        notify.success(notice("entry", "updated"));
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
    <Modal
      title={modalTitle("entry", isNew)}
      subtitle={isNew ? "Registre o que entra e o que sai da empresa." : "Ajuste os dados do lançamento."}
      onClose={onClose}
      onSubmit={() => void submit()}
      busy={busy}
      dirty={dirty}
      hint={MODAL_COPY.requiredHint}
    >
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
    </Modal>
  );
}

// Gestão de categorias financeiras (listar/criar/excluir): movida do antigo
// modal para a aba Centros de Custo, exibida em linha na própria aba.
function GestaoCategorias() {
  const { can } = useAuth();
  const [rows, setRows] = useState<CategoryRow[]>([]);

  // Lista de categorias financeiras paginada no proprio navegador.
  const listaCategorias = usePaginacaoLocal(rows);
  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<CategoryRow[]>("/finance/categories");
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
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
      notify.success(notice("category", "created"));
      setName("");
      void load();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: CategoryRow) {
    await confirmAction({
      title: "Excluir categoria",
      text: "Deseja realmente excluir a categoria {nome}?",
      nome: c.name,
      detalhe: "Os lançamentos já feitos com ela continuam no sistema, apenas sem categoria. Não dá para desfazer.",
      confirmLabel: "Excluir",
      danger: true,
      action: async () => {
        try {
          await api.delete("/finance/categories/" + c.id);
          notify.success(notice("category", "deleted"));
          void load();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        }
      },
    });
  }

  return (
    <div className="card-surface panel">
      <h2 className="nx-panel-title">Categorias financeiras</h2>
      <p className="nx-panel-sub">Separe receitas e despesas por tipo; a categoria escolhida no lançamento define o centro de custo.</p>
      {can("finance:write") ? (
        <div className="toolbar" style={{ marginBottom: "0.9rem" }}>
          <input className="input" placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da categoria" />
          <select className="select" style={{ maxWidth: 140 }} value={type} onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")} aria-label="Tipo da categoria">
            <option value="INCOME">Receita</option>
            <option value="EXPENSE">Despesa</option>
          </select>
          <button type="button" className="btn btn-brand btn-sm" disabled={busy} onClick={() => void add()}>{ACTIONS.add}</button>
        </div>
      ) : null}
      {loading ? (
        <LoadingInline label="Carregando categorias…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rows.length > 0 ? (
        <>
          <ul className="company-list">
            {listaCategorias.itens.map((c) => (
              <li key={c.id} className="company-item">
                <div>
                  <span className="company-name">{c.name}</span>
                  <span className="company-meta">{c.type === "INCOME" ? "Receita" : "Despesa"}</span>
                </div>
                {can("finance:write") ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => void remove(c)}>Excluir</button> : null}
              </li>
            ))}
          </ul>
          <Pagination {...listaCategorias.pagina} itemLabel="categorias" itemLabelSingular="categoria" />
        </>
      ) : (
        <EmptyState title="Nenhuma categoria" description="Crie categorias para organizar seus lançamentos." />
      )}
    </div>
  );
}
