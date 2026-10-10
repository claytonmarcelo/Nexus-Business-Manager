import { useCallback, useEffect, useRef, useState } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { baixarCsv } from "../lib/csv";
import { notify } from "../lib/notify";
import { formatDateTime } from "../lib/format";
import { descricaoDaAcao } from "../lib/auditLabels";

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

const ABAS: TabItem[] = [
  { id: "logs", label: "Logs do Sistema", hint: "Cada operação registrada pela empresa" },
  { id: "sensiveis", label: "Alterações Sensíveis", hint: "Exclusões, dinheiro, estoque e acessos" },
  { id: "exportar", label: "Exportação", hint: "Baixar em CSV o recorte filtrado" },
];

const ENTIDADES: { value: string; label: string }[] = [
  { value: "", label: "Todas as origens" },
  { value: "client", label: "Clientes" },
  { value: "product", label: "Produtos" },
  { value: "category", label: "Categorias" },
  { value: "product_category", label: "Categorias" },
  { value: "sale", label: "Vendas" },
  { value: "purchase", label: "Compras" },
  { value: "supplier", label: "Fornecedores" },
  { value: "finance-entry", label: "Lançamentos" },
  { value: "finance-category", label: "Categorias financeiras" },
  { value: "lead", label: "Leads" },
  { value: "agenda-event", label: "Agenda" },
  { value: "stock_movement", label: "Estoque" },
  { value: "user", label: "Usuários" },
  { value: "company", label: "Empresas" },
];

function plural(n: number, um: string, varios: string): string {
  return n + " " + (n === 1 ? um : varios);
}

function rotuloEntidade(entity: string): string {
  const achado = ENTIDADES.find((e) => e.value === entity);
  return achado ? achado.label : entity;
}

// Auditoria em três abas: trilha completa, recorte sensível (filtrado no
// servidor, para a paginação continuar correta) e exportação CSV do recorte.
export function Audit() {
  const { active, onSelect } = useTabState(ABAS, "logs");
  const [busca, setBusca] = useState("");
  const [entidade, setEntidade] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [rows, setRows] = useState<Paged<AuditRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soSensiveis, setSoSensiveis] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [totalExportavel, setTotalExportavel] = useState<number | null>(null);
  const ultimaAbaDeDados = useRef("logs");

  const sensivel = active === "sensiveis";
  if (active === "logs" || active === "sensiveis") ultimaAbaDeDados.current = active;

  const temFiltro = Boolean(busca.trim() || entidade || de || ate);

  const filtros = useCallback(() => {
    const base: Record<string, string> = {};
    if (busca.trim()) base.search = busca.trim();
    if (entidade) base.entity = entidade;
    if (de) base.de = de;
    if (ate) base.ate = ate;
    return base;
  }, [busca, entidade, de, ate]);

  const load = useCallback(async () => {
    if (active === "exportar") return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, pageSize, ...filtros() };
      if (sensivel) params.sensivel = "true";
      const { data } = await api.get<Paged<AuditRow>>("/audit", { params });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [active, page, pageSize, filtros, sensivel]);

  useEffect(() => {
    void load();
  }, [load]);

  // Ao abrir a exportação, o recorte sensível herdado da aba onde a pessoa estava.
  useEffect(() => {
    if (active === "exportar") setSoSensiveis(ultimaAbaDeDados.current === "sensiveis");
  }, [active]);

  // Contagem do recorte exportável: uma chamada mínima só para ler meta.total.
  useEffect(() => {
    if (active !== "exportar") return;
    let vivo = true;
    const params: Record<string, string | number> = { page: 1, pageSize: 1, ...filtros() };
    if (soSensiveis) params.sensivel = "true";
    api
      .get<Paged<AuditRow>>("/audit", { params })
      .then(({ data }) => { if (vivo) setTotalExportavel(data.meta.total); })
      .catch(() => { if (vivo) setTotalExportavel(null); });
    return () => { vivo = false; };
  }, [active, filtros, soSensiveis]);

  async function exportar() {
    setExportando(true);
    try {
      const linhas: AuditRow[] = [];
      for (let p = 1; p <= 50; p++) {
        const params: Record<string, string | number> = { page: p, pageSize: 100, ...filtros() };
        if (soSensiveis) params.sensivel = "true";
        const { data } = await api.get<Paged<AuditRow>>("/audit", { params });
        linhas.push(...data.data);
        if (p >= data.meta.totalPages) break;
      }
      const quantidade = baixarCsv(
        "auditoria-" + new Date().toISOString().slice(0, 10),
        ["Quando", "Acao", "Entidade", "Registro", "Usuario", "Origem"],
        linhas.map((r) => [
          formatDateTime(r.createdAt),
          r.action,
          rotuloEntidade(r.entity),
          r.entityId ?? "",
          r.userName ?? "Sistema",
          r.ip ?? "",
        ]),
      );
      notify.success(quantidade + (quantidade === 1 ? " evento exportado em CSV." : " eventos exportados em CSV."));
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setExportando(false);
    }
  }

  function limpar() {
    setBusca("");
    setEntidade("");
    setDe("");
    setAte("");
    setPage(1);
  }

  function filtroUi() {
    return (
      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Buscar por ação, entidade, usuário ou IP"
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPage(1); }}
          aria-label="Buscar na auditoria"
        />
        <select
          className="select"
          style={{ maxWidth: 170 }}
          value={entidade}
          onChange={(e) => { setEntidade(e.target.value); setPage(1); }}
          aria-label="Filtrar por origem"
        >
          {ENTIDADES.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          className="input"
          type="date"
          style={{ maxWidth: 158 }}
          value={de}
          onChange={(e) => { setDe(e.target.value); setPage(1); }}
          aria-label="Do dia"
        />
        <input
          className="input"
          type="date"
          style={{ maxWidth: 158 }}
          value={ate}
          onChange={(e) => { setAte(e.target.value); setPage(1); }}
          aria-label="Até o dia"
        />
        {temFiltro ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={limpar}>
            Limpar filtros
          </button>
        ) : null}
        <span className="toolbar-note">
          {loading ? "Atualizando trilha…" : rows ? plural(rows.meta.total, "evento", "eventos") : "—"}
        </span>
      </div>
    );
  }

  function corpoTabela(vazioTitulo: string, vazioDescricao: string) {
    if (loading) return <LoadingInline label="Carregando trilha de auditoria…" />;
    if (error) return <ErrorState message={error} onRetry={load} />;
    if (!rows || rows.data.length === 0) return <EmptyState title={vazioTitulo} description={vazioDescricao} />;
    return (
      <div className="card-surface table-wrap nx-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col" className="col-acao">Ação</th>
              <th scope="col">Entidade</th>
              <th scope="col">Quem</th>
              <th scope="col">Origem</th>
              <th scope="col" className="col-quando">Quando</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((r) => (
              <tr key={r.id}>
                <td className="col-acao">
                  <span className="company-name">{descricaoDaAcao(r.action, r.entity)}</span>
                  <span className="company-meta mono">{r.action}</span>
                </td>
                <td>{rotuloEntidade(r.entity)}</td>
                <td>{r.userName ?? "Sistema"}</td>
                <td className="mono">{r.ip ?? "—"}</td>
                <td className="mono col-quando">{formatDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={rows.meta.page}
          pageSize={rows.meta.pageSize}
          total={rows.meta.total}
          totalPages={rows.meta.totalPages}
          onChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
          itemLabel="eventos"
          itemLabelSingular="evento"
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Auditoria</h1>
          <p className="page-sub">Rastreabilidade das operações da empresa</p>
        </div>
      </div>

      <Tabs
        tabs={ABAS}
        active={active}
        onSelect={(id) => { setPage(1); onSelect(id); }}
        ariaLabel="Seções da auditoria"
      />

      <TabPanel id="logs" active={active}>
        {filtroUi()}
        {corpoTabela(
          "Nenhum evento de auditoria",
          "As ações realizadas no sistema aparecerão aqui.",
        )}
      </TabPanel>

      <TabPanel id="sensiveis" active={active}>
        {filtroUi()}
        {corpoTabela(
          "Nenhuma alteração sensível no recorte",
          "Exclusões, baixas de pagamento, cancelamentos, mudanças de papel e falhas de login aparecem nesta aba.",
        )}
      </TabPanel>

      <TabPanel id="exportar" active={active}>
        <div className="card-surface panel">
          <h2 className="nx-panel-title">Exportar a trilha de auditoria</h2>
          <p className="nx-panel-sub">
            O arquivo CSV respeita os filtros escolhidos nas abas de consulta e abre direto no Excel
            brasileiro (separador ponto e vírgula, UTF-8 sem BOM).
          </p>
          <label className="check-line">
            <input
              type="checkbox"
              checked={soSensiveis}
              onChange={(e) => setSoSensiveis(e.target.checked)}
            />
            <span>Incluir somente alterações sensíveis</span>
          </label>
          <div className="toolbar">
            <span className="toolbar-note">
              {totalExportavel === null
                ? "Calculando o recorte…"
                : totalExportavel === 0
                  ? "Nenhum evento neste recorte."
                  : plural(totalExportavel, "evento", "eventos") + " no recorte atual" + (temFiltro ? " (filtrado)" : "") + "."}
              {totalExportavel !== null && totalExportavel > 5000
                ? " Serão exportados os 5.000 registros mais recentes."
                : ""}
            </span>
            <button
              type="button"
              className="btn btn-brand btn-sm"
              onClick={() => void exportar()}
              disabled={exportando || totalExportavel === 0}
            >
              {exportando ? "Gerando arquivo…" : "Baixar CSV"}
            </button>
            {temFiltro ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={limpar}>
                Limpar filtros
              </button>
            ) : null}
          </div>
        </div>
      </TabPanel>
    </div>
  );
}
