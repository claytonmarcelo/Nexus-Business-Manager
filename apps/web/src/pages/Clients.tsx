import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO, usePaginacaoLocal } from "../components/Pagination";
import { MODAL_COPY, modalTitle } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { baixarCsv } from "../lib/csv";
import { formatCurrency, formatDate } from "../lib/format";

interface ClientRow { id: string; name: string; email: string | null; phone: string | null; document: string | null; active: boolean; createdAt: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

// Campos exatamente como /reports/clients devolve (verificados contra a API).
interface Segmento { nivel: string; rotulo: string; clientes: number; faturamento: number; participacao: number }
interface RecenciaBucket { rotulo: string; clientes: number }
interface TopCliente { id: string; nome: string; pedidos: number; faturamento: number; ultimaCompra: string | null; ativo: boolean }
interface ClientReport {
  total: number;
  ativos: number;
  inativos: number;
  novosNoMes: number;
  faturamentoTotal: number;
  ticketMedio: number;
  segmentos: Segmento[];
  recencia: RecenciaBucket[];
  nuncaCompraram: number;
  semEmail: number;
  semTelefone: number;
  semDocumento: number;
  top: TopCliente[];
}

const ABAS: TabItem[] = [
  { id: "todos", label: "Todos os Clientes", hint: "Busca, cadastro e edição da carteira" },
  { id: "segmentos", label: "Segmentos / Grupos", hint: "Curva A/B/C/D e recência de compra" },
  { id: "analises", label: "Análises", hint: "Indicadores e clientes que mais compram" },
];

// Modulo Clientes em tres abas: a carteira editavel de sempre (aba "todos")
// e dois paineis de leitura calculados no servidor em um unico
// GET /reports/clients, buscado apenas quando a pessoa abre a aba.
export function Clients() {
  const { can } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "todos");

  const [rows, setRows] = useState<Paged<ClientRow> | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClientRow | "new" | null>(null);

  const [report, setReport] = useState<ClientReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // O ranking "quem mais compra" chega pronto do relatorio: a virada de pagina
  // dele e feita aqui, com o mesmo componente das tabelas paginadas.
  const ranking = usePaginacaoLocal(report?.top ?? []);

  // N51 (P14, passada da F5): a lista que vale é a da última busca, não a do último
  // pacote que chegou. Cada recarga recebe um número e só o mais novo toca a tela —
  // digitar enquanto a lista cheia ainda está em voo dispara dois pedidos, e a rede
  // não devolve na ordem em que eles saíram.
  const ultimaLista = useRef(0);

  const load = useCallback(async () => {
    const minhaBusca = ++ultimaLista.current;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<ClientRow>>("/clients", {
        params: { page, pageSize, search: search || undefined },
      });
      if (minhaBusca !== ultimaLista.current) return;
      setRows(data);
    } catch (err) {
      if (minhaBusca !== ultimaLista.current) return;
      setError(extractErrorMessage(err));
    } finally {
      // O spin pertence ao pedido mais novo; o perdedor fica mudo, inclusive quanto
      // ao erro — uma resposta velha não pode abrir aviso na tela.
      if (minhaBusca === ultimaLista.current) setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void load();
  }, [load]);

  // Os paineis de analise pesam pouco no servidor, mas so fazem sentido quando
  // abertos: o fetch roda uma unica vez e fica em memoria ate "Atualizar".
  const loadReport = useCallback(async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const { data } = await api.get<ClientReport>("/reports/clients");
      setReport(data);
    } catch (err) {
      setReportError(extractErrorMessage(err));
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if ((active === "segmentos" || active === "analises") && !report && !reportLoading && !reportError) {
      void loadReport();
    }
  }, [active, report, reportLoading, reportError, loadReport]);

  async function deactivate(row: ClientRow) {
    await confirmAction({
      title: "Desativar cliente",
      text: "Tem certeza de que deseja desativar o cliente {nome}?",
      nome: row.name,
      detalhe: "Ele deixa de aparecer em novas vendas, orçamentos e buscas. O histórico de compras continua guardado no sistema.",
      confirmLabel: "Desativar",
      danger: true,
      action: async () => {
        try {
          await api.delete("/clients/" + row.id);
          notify.success("Cliente desativado.");
          void load();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        }
      },
    });
  }

  // Envolve o conteudo dos paineis de analise com os estados da casa.
  function painelAnalise(render: (r: ClientReport) => ReactNode) {
    if (reportLoading) return <LoadingInline label="Calculando a análise de clientes…" />;
    if (reportError) return <ErrorState message={reportError} onRetry={() => void loadReport()} />;
    if (!report) {
      return (
        <EmptyState
          title="Análise ainda não carregada"
          description="Alimente o painel para ver a curva de clientes e a recência de compra."
          action={
            <button type="button" className="btn btn-brand" onClick={() => void loadReport()}>
              Atualizar
            </button>
          }
        />
      );
    }
    return render(report);
  }

  function barra(label: string, percentual: number, valor: string, chave = label) {
    const largura = Math.max(0, Math.min(100, Math.round(percentual)));
    return (
      <li key={chave} className="nx-distrib-row">
        <span className="nx-distrib-label" title={label}>{label}</span>
        <span className="nx-distrib-track">
          <span className="nx-distrib-fill" style={{ width: largura + "%" }} />
        </span>
        <span className="nx-distrib-value">{valor}</span>
      </li>
    );
  }

  function exportarTop(r: ClientReport) {
    const quantidade = baixarCsv(
      "clientes-top-faturamento",
      ["Cliente", "Pedidos", "Faturamento", "Última compra"],
      r.top.map((t) => [
        t.nome,
        t.pedidos,
        String(t.faturamento),
        t.ultimaCompra ? formatDate(t.ultimaCompra) : "nunca comprou",
      ]),
    );
    notify.success(quantidade + (quantidade === 1 ? " cliente exportado em CSV." : " clientes exportados em CSV."));
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-sub">Gestão e base de clientes da empresa ativa</p>
        </div>
        {can("client:write") ? (
          <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo cliente</button>
        ) : null}
      </div>

      <Tabs tabs={ABAS} active={active} onSelect={onSelect} ariaLabel="Seções de clientes" />

      <TabPanel id="todos" active={active}>
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
                  {can("client:write") ? <th scope="col" className="col-acoes">Ações</th> : null}
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
                        <div className="row-actions">
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
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                itemLabel="clientes"
                itemLabelSingular="cliente"
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
      </TabPanel>

      <TabPanel id="segmentos" active={active}>
        {painelAnalise((r) => (
          <div className="nx-split">
            {r.segmentos.map((s) => (
              <div key={s.nivel} className="card-surface panel">
                <h2 className="nx-panel-title">{s.rotulo}</h2>
                <p className="nx-panel-sub">
                  {s.clientes} {s.clientes === 1 ? "cliente" : "clientes"} · {formatCurrency(s.faturamento)} de faturamento
                </p>
                <ul className="nx-distrib">
                  {barra("Participação da carteira", s.participacao, s.participacao + "%")}
                </ul>
              </div>
            ))}
            <div className="card-surface panel">
              <h2 className="nx-panel-title">Recência de compra</h2>
              <p className="nx-panel-sub">
                Há quanto tempo cada cliente comprou por último.
                {r.nuncaCompraram > 0
                  ? " " + r.nuncaCompraram + (r.nuncaCompraram === 1 ? " cliente nunca gerou venda." : " clientes nunca geraram venda.")
                  : null}
              </p>
              <ul className="nx-distrib">
                {r.recencia.map((b) => barra(b.rotulo, r.total ? (b.clientes / r.total) * 100 : 0, String(b.clientes), b.rotulo))}
                {barra("Nunca compraram", r.total ? (r.nuncaCompraram / r.total) * 100 : 0, String(r.nuncaCompraram))}
              </ul>
            </div>
          </div>
        ))}
      </TabPanel>

      <TabPanel id="analises" active={active}>
        {painelAnalise((r) => (
          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="kpi-grid">
              <div className="kpi card-surface">
                <span className="kpi-label">Clientes</span>
                <div className="kpi-value">{r.total}</div>
                <span className="kpi-hint">na carteira</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Ativos</span>
                <div className="kpi-value">{r.ativos}</div>
                <span className="kpi-hint">habilitados a comprar</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Inativos</span>
                <div className="kpi-value" style={{ color: "var(--text-muted)" }}>{r.inativos}</div>
                <span className="kpi-hint">desativados</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Novos no mês</span>
                <div className="kpi-value" style={{ color: "var(--success)" }}>{r.novosNoMes}</div>
                <span className="kpi-hint">cadastrados no mês corrente</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Faturamento total</span>
                <div className="kpi-value">{formatCurrency(r.faturamentoTotal)}</div>
                <span className="kpi-hint">vendas não canceladas</span>
              </div>
              <div className="kpi card-surface">
                <span className="kpi-label">Ticket médio</span>
                <div className="kpi-value">{formatCurrency(r.ticketMedio)}</div>
                <span className="kpi-hint">por pedido</span>
              </div>
            </div>

            <div className="card-surface panel">
              <h2 className="nx-panel-title">Clientes que mais compram</h2>
              <p className="nx-panel-sub">Ranking por faturamento, com dez clientes por pagina ate os cinquenta primeiros.</p>
              <div className="toolbar">
                <span className="toolbar-note">
                  {r.top.length === 0 ? "Nenhuma venda registrada ainda." : r.top.length + " clientes no recorte."}
                </span>
                {r.top.length > 0 ? (
                  <button type="button" className="btn btn-brand btn-sm" onClick={() => exportarTop(r)}>
                    Baixar CSV
                  </button>
                ) : null}
              </div>
              {r.top.length === 0 ? (
                <EmptyState
                  title="Sem vendas para ranquear"
                  description="Assim que os pedidos forem confirmados, os melhores clientes aparecem aqui."
                />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Cliente</th>
                        <th scope="col">Pedidos</th>
                        <th scope="col">Faturamento</th>
                        <th scope="col">Última compra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.itens.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.nome}</strong>
                            {!t.ativo ? <span className="company-meta"> inativo</span> : null}
                          </td>
                          <td className="mono">{t.pedidos}</td>
                          <td className="mono">{formatCurrency(t.faturamento)}</td>
                          <td>{t.ultimaCompra ? formatDate(t.ultimaCompra) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination {...ranking.pagina} itemLabel="clientes" itemLabelSingular="cliente" />
                </div>
              )}
            </div>

            <div className="card-surface panel">
              <h2 className="nx-panel-title">Cadastro incompleto</h2>
              <p className="nx-panel-sub">
                Clientes sem dados de contato dificultam campanhas, cobranças e a nota fiscal.
              </p>
              <div style={{ display: "grid", gap: "0.6rem" }}>
                <div className="nx-alerta is-aviso">
                  <div>
                    <div className="nx-alerta-titulo">Sem e-mail</div>
                    <div className="nx-alerta-texto">Clientes cadastrados sem endereço de e-mail.</div>
                  </div>
                  <span className="nx-alerta-qty">{r.semEmail}</span>
                </div>
                <div className="nx-alerta is-aviso">
                  <div>
                    <div className="nx-alerta-titulo">Sem telefone</div>
                    <div className="nx-alerta-texto">Clientes sem telefone para contato rápido.</div>
                  </div>
                  <span className="nx-alerta-qty">{r.semTelefone}</span>
                </div>
                <div className="nx-alerta is-aviso">
                  <div>
                    <div className="nx-alerta-titulo">Sem documento</div>
                    <div className="nx-alerta-texto">Clientes sem CPF/CNPJ informado.</div>
                  </div>
                  <span className="nx-alerta-qty">{r.semDocumento}</span>
                </div>
              </div>
            </div>

            <div className="toolbar">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadReport()} disabled={reportLoading}>
                Atualizar
              </button>
            </div>
          </div>
        ))}
      </TabPanel>

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
  // Avisa antes de descartar edicoes nao gravadas.
  const dirty = useDirty(form);

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
    <Modal
      title={modalTitle("client", isNew)}
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
    </Modal>
  );
}
