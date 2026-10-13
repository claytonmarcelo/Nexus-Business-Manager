import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { formatCurrency, formatDate, formatDateTime } from "../lib/format";
import { valorNumerico } from "../lib/money";

// F3.2 Parte 1 — Ordens de Serviço na tela.
//
// A tela é o balcão: a pessoa abre, vê quantas ordens existem em cada estado
// (números que o servidor contou, nunca contagem de linha desta página), procura
// pelo protocolo ou pelo cliente, e move a ordem pelo caminho que a regra de
// negócio permite. Nada aqui decide regra de negócio — quem baixa estoque, quem
// pode cancelar e o que o atendente alcança é do serviço
// (apps/api/src/modules/service-orders/service-orders.service.ts); os botões
// escondidos são a mesma regra traduzida para a interface, e o servidor continua
// sendo a autoridade quando alguém insistir pelo console.
//
// Três coisas que a tela faz questão de não inventar:
//  - o dinheiro: a prévia do formulário é conta de cabeça, e o que aparece na
//    tabela e no documento é o total que o servidor somou em centavo;
//  - o estoque: o aviso de "baixa agora" só aparece quando há peça na ordem;
//  - o estado: se a rota não respondeu, a tela mostra o erro dela, não um
//    "operacional" genérico.

type Status = "OPEN" | "IN_PROGRESS" | "WAITING" | "COMPLETED" | "CANCELLED";
type Prioridade = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type TipoLinha = "SERVICE" | "PART";

interface ItemDaOrdem {
  id: string;
  kind: TipoLinha;
  productId: string | null;
  productName: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Ordem {
  id: string;
  number: number;
  status: Status;
  priority: Prioridade;
  title: string;
  description: string | null;
  diagnosis: string | null;
  notes: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  discount: number;
  total: number;
  clientId: string;
  clientName: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  items: ItemDaOrdem[];
}

interface EventoDoHistorico {
  id: string;
  fromStatus: Status | null;
  toStatus: Status;
  note: string | null;
  userName: string | null;
  createdAt: string;
}

type OrdemDetalhada = Ordem & { history: EventoDoHistorico[] };

interface Sumario {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  completed: number;
  cancelled: number;
  urgent: number;
  completedThisMonth: number;
  completedValueThisMonth: number;
}

interface ClienteOpt { id: string; name: string }
interface ProdutoOpt { id: string; name: string; unit: string; salePrice: number; stockQuantity: number; trackStock: boolean; active: boolean }
interface MembroOpt { id: string; name: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

// ---- Vocabulário da tela (uma vez só, para tabela, detalhe e papel) ----

const STATUS_ROTULO: Record<Status, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em andamento",
  WAITING: "Aguardando peça",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSE: Record<Status, string> = {
  OPEN: "is-os-open",
  IN_PROGRESS: "is-os-progress",
  WAITING: "is-os-waiting",
  COMPLETED: "is-os-done",
  CANCELLED: "is-os-cancelled",
};

const PRIORIDADE_ROTULO: Record<Prioridade, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

/**
 * Os caminhos possíveis, espelho de CAMINHOS no serviço. A tela não mostra porta
 * que não existe: numa ordem concluída não há botão "iniciar", e numa cancelada
 * não há botão nenhum.
 */
const CAMINHOS: Record<Status, Status[]> = {
  OPEN: ["IN_PROGRESS", "WAITING", "CANCELLED"],
  IN_PROGRESS: ["WAITING", "COMPLETED", "CANCELLED"],
  WAITING: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["CANCELLED"],
  CANCELLED: [],
};

const ROTULO_ACENTO: Record<Status, string> = {
  OPEN: "Reabrir",
  IN_PROGRESS: "Iniciar",
  WAITING: "Aguardar peça",
  COMPLETED: "Concluir",
  CANCELLED: "Cancelar",
};

const ABAS_BASE: TabItem[] = [
  { id: "ordens", label: "Ordens de serviço", hint: "Lista, filtros, indicadores e ações" },
];

// ---- A página ----

export function OrdensDeServico() {
  const { can, user } = useAuth();
  const escrita = can("service_order:write");
  // Estornar uma concluída é decisão de administrador ou proprietário (mesma
  // regra do serviço). Na tela isso aparece como botão, não como 403 surpresa.
  const podeEstornar = user?.role === "OWNER" || user?.role === "ADMIN";
  const podeVerEquipe = can("user:read");

  const abas = escrita ? [...ABAS_BASE, { id: "nova", label: "Nova ordem", hint: "Abrir uma ordem de serviço" }] : ABAS_BASE;
  const { active, onSelect } = useTabState(abas, "ordens");

  const [rows, setRows] = useState<Paged<Ordem> | null>(null);
  const [sumario, setSumario] = useState<Sumario | null>(null);
  const [membros, setMembros] = useState<MembroOpt[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [ordemPor, setOrdemPor] = useState("createdAt");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  const [detalhe, setDetalhe] = useState<OrdemDetalhada | null>(null);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<OrdemDetalhada | null>(null);
  const [anotando, setAnotando] = useState<OrdemDetalhada | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Paged<Ordem>>("/service-orders", {
        params: {
          page,
          pageSize,
          search: busca || undefined,
          status: status || undefined,
          priority: prioridade || undefined,
          assignedUserId: responsavel || undefined,
          from: de || undefined,
          to: ate || undefined,
          sort: ordemPor,
        },
      });
      setRows(data);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setCarregando(false);
    }
  }, [page, pageSize, busca, status, prioridade, responsavel, de, ate, ordemPor, recarga]);

  useEffect(() => {
    if (active !== "ordens") return;
    void carregar();
  }, [active, carregar]);

  // Os indicadores são uma contagem do ACERVO, feita pelo servidor. Uma janela
  // de filtro na lista não muda os cartões, e é por isso que a busca do resumo
  // não leva nenhum parâmetro.
  useEffect(() => {
    let vivo = true;
    api.get<Sumario>("/service-orders/summary")
      .then(({ data }) => { if (vivo) setSumario(data); })
      .catch(() => { if (vivo) setSumario(null); });
    return () => { vivo = false; };
  }, [recarga]);

  useEffect(() => {
    if (!podeVerEquipe) return;
    let vivo = true;
    api.get<Paged<MembroOpt>>("/users", { params: { page: 1, pageSize: 100 } })
      .then(({ data }) => { if (vivo) setMembros(data.data.map((m) => ({ id: m.id, name: m.name }))); })
      .catch(() => { if (vivo) setMembros([]); });
    return () => { vivo = false; };
  }, [podeVerEquipe]);

  function reabrir() {
    setRecarga((n) => n + 1);
  }

  async function abrirDetalhe(id: string) {
    setDetalheErro(null);
    try {
      const { data } = await api.get<OrdemDetalhada>("/service-orders/" + id);
      setDetalhe(data);
    } catch (err) {
      setDetalheErro(extractErrorMessage(err));
    }
  }

  function acoesDe(o: Ordem): Status[] {
    return CAMINHOS[o.status].filter((alvo) => podeMover(o, alvo, escrita, podeEstornar, user?.id));
  }

  async function mover(o: Ordem, alvo: Status) {
    const temPeca = o.items.some((i) => i.kind === "PART");
    const nome = "#" + o.number + " " + o.title;
    const perguntas = perguntaDeMovimento(o, alvo, temPeca, nome);
    await confirmAction({
      ...perguntas,
      action: async () => {
        try {
          await api.post("/service-orders/" + o.id + "/status", { status: alvo });
          notify.success(MENSAGEM_SUCESSO[alvo]);
          reabrir();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        }
      },
    });
  }

  const totalDaLista = rows?.meta.total ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ordens de Serviço</h1>
          <p className="page-sub">Atendimentos da empresa ativa, do balcão ao estoque</p>
        </div>
        {escrita ? (
          <button type="button" className="btn btn-brand" onClick={() => onSelect("nova")}>Nova ordem</button>
        ) : null}
      </div>

      <Tabs tabs={abas} active={active} onSelect={(id) => { setPage(1); onSelect(id); }} ariaLabel="Seções das ordens de serviço" />

      <TabPanel id="ordens" active={active}>
        {sumario ? (
          <div className="kpi-grid">
            <CartaoKpi rotulo="Abertas" valor={String(sumario.open)} dica="aguardando execução" />
            <CartaoKpi rotulo="Em andamento" valor={String(sumario.inProgress)} dica="na mão do técnico" />
            <CartaoKpi rotulo="Aguardando peça" valor={String(sumario.waiting)} dica="paradas por material" />
            <CartaoKpi rotulo="Concluídas" valor={String(sumario.completed)} dica="no acervo todo" />
            <CartaoKpi rotulo="Canceladas" valor={String(sumario.cancelled)} dica="ordens desfeitas" />
            <CartaoKpi rotulo="Urgentes" valor={String(sumario.urgent)} dica="prioridade urgente aberta ou não" />
            <CartaoKpi rotulo="Concluídas no mês" valor={String(sumario.completedThisMonth)} dica="no calendário da empresa" />
            <CartaoKpi rotulo="Valor concluído no mês" valor={formatCurrency(sumario.completedValueThisMonth)} dica="soma dos totais concluídos" />
          </div>
        ) : null}

        <div className="toolbar">
          <input
            className="input"
            type="search"
            placeholder="Buscar por número, cliente ou título"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
            aria-label="Buscar ordens de serviço"
          />
          <select className="select" style={{ maxWidth: 190 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_ROTULO) as Status[]).map((s) => <option key={s} value={s}>{STATUS_ROTULO[s]}</option>)}
          </select>
          <select className="select" style={{ maxWidth: 170 }} value={prioridade} onChange={(e) => { setPrioridade(e.target.value); setPage(1); }} aria-label="Filtrar por prioridade">
            <option value="">Toda prioridade</option>
            {(Object.keys(PRIORIDADE_ROTULO) as Prioridade[]).map((p) => <option key={p} value={p}>{PRIORIDADE_ROTULO[p]}</option>)}
          </select>
          <select className="select" style={{ maxWidth: 190 }} value={responsavel} onChange={(e) => { setResponsavel(e.target.value); setPage(1); }} aria-label="Filtrar por responsável">
            <option value="">Qualquer responsável</option>
            {user ? <option value={user.id}>Só as minhas</option> : null}
            {membros.filter((m) => m.id !== user?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input className="input" type="date" style={{ maxWidth: 158 }} value={de} onChange={(e) => { setDe(e.target.value); setPage(1); }} aria-label="Do dia" />
          <input className="input" type="date" style={{ maxWidth: 158 }} value={ate} onChange={(e) => { setAte(e.target.value); setPage(1); }} aria-label="Até o dia" />
          <select className="select" style={{ maxWidth: 170 }} value={ordemPor} onChange={(e) => setOrdemPor(e.target.value)} aria-label="Ordenar por">
            <option value="createdAt">Mais recentes</option>
            <option value="number">Pelo número</option>
            <option value="priority">Pela prioridade</option>
            <option value="total">Pelo valor</option>
          </select>
          <span className="toolbar-note">
            {carregando ? "Atualizando lista…" : rows ? totalDaLista + (totalDaLista === 1 ? " ordem" : " ordens") : "—"}
          </span>
        </div>

        {carregando ? (
          <LoadingInline label="Carregando ordens de serviço…" />
        ) : erro ? (
          <ErrorState message={erro} onRetry={carregar} />
        ) : rows && rows.data.length > 0 ? (
          <div className="card-surface table-wrap">
            <div className="nx-os-scroll">
              <table className="table nx-os-tabela">
                <thead>
                  <tr>
                    <th scope="col">Número</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Ordem</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Prioridade</th>
                    <th scope="col">Responsável</th>
                    <th scope="col">Total</th>
                    <th scope="col">Abertura</th>
                    <th scope="col" className="col-acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.data.map((o) => (
                    <tr key={o.id}>
                      <td data-rotulo="Número" className="mono">#{o.number}</td>
                      <td data-rotulo="Cliente">{o.clientName ?? "—"}</td>
                      <td data-rotulo="Ordem">
                        <button type="button" className="btn btn-ghost btn-sm nx-os-abrir" aria-label={"Ver ordem " + o.number} onClick={() => void abrirDetalhe(o.id)}>
                          {o.title}
                        </button>
                      </td>
                      <td data-rotulo="Situação"><span className={"status-pill " + STATUS_CLASSE[o.status]}>{STATUS_ROTULO[o.status]}</span></td>
                      <td data-rotulo="Prioridade">{PRIORIDADE_ROTULO[o.priority]}</td>
                      <td data-rotulo="Responsável">{o.assignedUserName ?? "—"}</td>
                      <td data-rotulo="Total" className="mono">{formatCurrency(o.total)}</td>
                      <td data-rotulo="Abertura" className="mono">{formatDate(o.createdAt)}</td>
                      <td data-rotulo="Ações" className="col-acoes">
                        <div className="row-actions">
                          {acoesDe(o).map((alvo) => (
                            <button
                              key={alvo}
                              type="button"
                              className={"btn btn-ghost btn-sm" + (alvo === "CANCELLED" ? " nx-os-perigo" : "")}
                              onClick={() => void mover(o, alvo)}
                            >
                              {ROTULO_ACENTO[alvo]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows ? (
              <Pagination
                page={rows.meta.page}
                pageSize={rows.meta.pageSize}
                total={rows.meta.total}
                totalPages={rows.meta.totalPages}
                onChange={setPage}
                onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
                itemLabel="ordens"
                itemLabelSingular="ordem"
              />
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma ordem de serviço"
            description={escrita ? "Abra a primeira ordem para registrar o atendimento do cliente." : "Ajuste os filtros acima para outro recorte."}
            action={escrita ? <button type="button" className="btn btn-brand" onClick={() => onSelect("nova")}>Nova ordem</button> : undefined}
          />
        )}
      </TabPanel>

      <TabPanel id="nova" active={active}>
        {escrita ? (
          <FormularioOrdem
            membros={membros}
            podeVerEquipe={podeVerEquipe}
            onSalvo={() => { reabrir(); onSelect("ordens"); }}
          />
        ) : (
          <EmptyState title="Sem permissão" description="Abrir ordem de serviço é ação de quem tem escrita no módulo." />
        )}
      </TabPanel>

      {detalhe ? (
        <DetalheDaOrdem
          ordem={detalhe}
          companyName={user?.companyName ?? ""}
          podeEditarEstrutura={escrita && detalhe.status !== "CANCELLED" && detalhe.status !== "COMPLETED"}
          podeAnotar={(escrita || detalhe.assignedUserId === user?.id) && detalhe.status !== "CANCELLED"}
          onEditar={() => setEditando(detalhe)}
          onAnotar={() => setAnotando(detalhe)}
          onClose={() => setDetalhe(null)}
        />
      ) : null}

      {detalheErro ? <ErrorState message={detalheErro} /> : null}

      {editando ? (
        <Modal
          title="Editar ordem de serviço"
          label={"Edição da ordem " + editando.number}
          subtitle={"#" + editando.number + " · " + (editando.clientName ?? "—")}
          onClose={() => setEditando(null)}
          size="lg"
        >
          <FormularioOrdem
            ordem={editando}
            membros={membros}
            podeVerEquipe={podeVerEquipe}
            onSalvo={() => { setEditando(null); setDetalhe(null); reabrir(); }}
            aoCancelar={() => setEditando(null)}
          />
        </Modal>
      ) : null}

      {anotando ? (
        <AnotacaoExecucao
          ordem={anotando}
          onClose={() => setAnotando(null)}
          onSalvo={() => { setAnotando(null); setDetalhe(null); reabrir(); }}
        />
      ) : null}
    </div>
  );
}

function CartaoKpi({ rotulo, valor, dica }: { rotulo: string; valor: string; dica: string }) {
  return (
    <div className="kpi card-surface">
      <p className="kpi-label">{rotulo}</p>
      <p className="kpi-value mono">{valor}</p>
      <p className="kpi-hint">{dica}</p>
    </div>
  );
}

// ---- Quem pode mover o quê (espelho da regra do serviço) ----

/**
 * Cancelar é o único movimento que o atendente nunca faz, e estornar uma
 * concluída é só do administrador e do proprietário. Todo o resto, ele faz na
 * ordem atribuída a ele — é o que a porta dele aceita, e a tela esconde o resto
 * em vez de deixar a pessoa esbarrar num 403.
 */
function podeMover(
  o: Ordem,
  alvo: Status,
  escrita: boolean,
  podeEstornar: boolean,
  meuId: string | undefined,
): boolean {
  if (alvo === "CANCELLED") {
    if (!escrita) return false;
    if (o.status === "COMPLETED" && !podeEstornar) return false;
    return true;
  }
  return escrita || (!!meuId && o.assignedUserId === meuId);
}

const MENSAGEM_SUCESSO: Record<Status, string> = {
  OPEN: "Ordem reaberta.",
  IN_PROGRESS: "Ordem em andamento.",
  WAITING: "Ordem aguardando peça.",
  COMPLETED: "Ordem concluída.",
  CANCELLED: "Ordem cancelada.",
};

function perguntaDeMovimento(o: Ordem, alvo: Status, temPeca: boolean, nome: string) {
  if (alvo === "COMPLETED") {
    return {
      title: "Concluir ordem de serviço",
      text: "Deseja realmente concluir a ordem de serviço {nome}?",
      nome,
      detalhe: temPeca
        ? "As peças desta ordem saem do estoque agora; o serviço fica registrado como entregue."
        : "A ordem fecha como entregue, e o histórico registra quem concluiu.",
      confirmLabel: "Concluir ordem",
      danger: false,
    };
  }
  if (alvo === "CANCELLED") {
    const eraConcluida = o.status === "COMPLETED";
    return {
      title: "Cancelar ordem de serviço",
      text: "Deseja realmente cancelar a ordem de serviço {nome}?",
      nome,
      detalhe: eraConcluida
        ? "Esta ordem já foi concluída: as peças voltam ao estoque como estorno, e a decisão fica no histórico."
        : "Nada é baixado do estoque, e a ordem deixa de contar no que está em aberto.",
      confirmLabel: "Cancelar ordem",
      danger: true,
    };
  }
  if (alvo === "WAITING") {
    return {
      title: "Colocar a ordem em espera",
      text: "Deseja realmente colocar a ordem de serviço {nome} em espera?",
      nome,
      detalhe: "Ela sai da fila de execução e volta quando a peça ou o cliente aparecer.",
      confirmLabel: "Aguardar peça",
      danger: false,
    };
  }
  return {
    title: "Iniciar ordem de serviço",
    text: "Deseja realmente iniciar a ordem de serviço {nome}?",
    nome,
    detalhe: "O andamento começa agora, e a data de início fica marcada no histórico.",
    confirmLabel: "Iniciar ordem",
    danger: false,
  };
}

// ---- O formulário (aba "nova" e modal de edição são o mesmo formulário) ----

interface LinhaRascunho {
  kind: TipoLinha;
  productId: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

const LINHA_INICIAL: LinhaRascunho = { kind: "SERVICE", productId: "", description: "", quantity: "1", unitPrice: "" };

function linhaParaRascunho(i: ItemDaOrdem): LinhaRascunho {
  return {
    kind: i.kind,
    productId: i.productId ?? "",
    description: i.description ?? "",
    quantity: String(i.quantity),
    unitPrice: String(i.unitPrice),
  };
}

/** AAAA-MM-DD do calendário local, lidos do instante (sem virar dia pelo UTC). */
function diaParaInput(iso: string): string {
  const d = new Date(iso);
  return [String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

interface FormularioProps {
  ordem?: OrdemDetalhada;
  membros: MembroOpt[];
  podeVerEquipe: boolean;
  onSalvo: () => void;
  aoCancelar?: () => void;
}

function FormularioOrdem({ ordem, membros, podeVerEquipe, onSalvo, aoCancelar }: FormularioProps) {
  const editar = !!ordem;
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [produtos, setProdutos] = useState<ProdutoOpt[]>([]);
  const [cargaErro, setCargaErro] = useState<string | null>(null);

  const [clientId, setClientId] = useState(ordem?.clientId ?? "");
  const [titulo, setTitulo] = useState(ordem?.title ?? "");
  const [descricao, setDescricao] = useState(ordem?.description ?? "");
  const [diagnostico, setDiagnostico] = useState(ordem?.diagnosis ?? "");
  const [anotacoes, setAnotacoes] = useState(ordem?.notes ?? "");
  const [prioridade, setPrioridade] = useState<Prioridade>(ordem?.priority ?? "NORMAL");
  const [responsavel, setResponsavel] = useState(ordem?.assignedUserId ?? "");
  const [agendada, setAgendada] = useState(ordem?.scheduledAt ? diaParaInput(ordem.scheduledAt) : "");
  const [desconto, setDesconto] = useState(ordem ? String(ordem.discount) : "");

  const [linhas, setLinhas] = useState<LinhaRascunho[]>(
    ordem ? ordem.items.map(linhaParaRascunho) : [LINHA_INICIAL],
  );
  const [gravando, setGravando] = useState(false);

  const sujo = useDirty({ clientId, titulo, descricao, diagnostico, anotacoes, prioridade, responsavel, agendada, desconto, linhas });

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api.get<Paged<ClienteOpt>>("/clients", { params: { page: 1, pageSize: 100 } }),
      api.get<Paged<ProdutoOpt>>("/products", { params: { page: 1, pageSize: 100 } }),
    ])
      .then(([c, p]) => {
        if (!vivo) return;
        setClientes(c.data.data);
        setProdutos(p.data.data.filter((x) => x.active));
      })
      .catch((e) => { if (vivo) setCargaErro(extractErrorMessage(e)); });
    return () => { vivo = false; };
  }, []);

  const produtoPorId = (id: string) => produtos.find((p) => p.id === id);

  function patchLinha(idx: number, patch: Partial<LinhaRascunho>) {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function escolherProduto(idx: number, id: string) {
    const p = produtoPorId(id);
    patchLinha(idx, { productId: id, unitPrice: p ? String(p.salePrice) : "" });
  }

  // Prévia de cabeça: o que entra no banco é a soma em centavo do servidor.
  const soma = linhas.reduce((acc, l) => acc + valorNumerico(l.quantity) * valorNumerico(l.unitPrice), 0);
  const previsao = soma - valorNumerico(desconto);

  function limpar() {
    setClientId("");
    setTitulo("");
    setDescricao("");
    setDiagnostico("");
    setAnotacoes("");
    setPrioridade("NORMAL");
    setResponsavel("");
    setAgendada("");
    setDesconto("");
    setLinhas([LINHA_INICIAL]);
  }

  const opcoesDeResponsavel = podeVerEquipe
    ? membros
    : membros.filter((m) => m.id === ordem?.assignedUserId);

  async function salvar() {
    if (!clientId) { notify.error("Escolha o cliente da ordem."); return; }
    if (!titulo.trim()) { notify.error("Dê um título à ordem."); return; }
    const validadas: (LinhaRascunho & { idx: number })[] = [];
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      if (!l) continue;
      if (l.kind === "PART" && !l.productId) { notify.error("A linha " + (i + 1) + " precisa de uma peça do cadastro."); return; }
      if (l.kind === "SERVICE" && !l.description.trim()) { notify.error("A linha " + (i + 1) + " precisa da descrição do serviço."); return; }
      if (l.kind === "SERVICE" && valorNumerico(l.unitPrice) <= 0) { notify.error("O serviço da linha " + (i + 1) + " precisa de preço."); return; }
      if (valorNumerico(l.quantity) <= 0) { notify.error("A quantidade da linha " + (i + 1) + " deve ser maior que zero."); return; }
      validadas.push({ ...l, idx: i });
    }
    if (validadas.length === 0) { notify.error("Inclua ao menos um item na ordem."); return; }
    if (valorNumerico(desconto) > soma) { notify.error("O desconto não pode passar da soma das linhas."); return; }

    const itens = validadas.map((l) => {
      const quantidade = valorNumerico(l.quantity);
      if (l.kind === "PART") {
        const corpo: Record<string, unknown> = { kind: "PART", productId: l.productId, quantity: quantidade };
        const preco = valorNumerico(l.unitPrice);
        if (l.unitPrice.trim() !== "") corpo.unitPrice = preco;
        if (l.description.trim()) corpo.description = l.description.trim();
        return corpo;
      }
      const corpo: Record<string, unknown> = {
        kind: "SERVICE",
        description: l.description.trim(),
        quantity: quantidade,
        unitPrice: valorNumerico(l.unitPrice),
      };
      return corpo;
    });

    const comum: Record<string, unknown> = {
      title: titulo.trim(),
      priority: prioridade,
      description: descricao.trim() || undefined,
      diagnosis: diagnostico.trim() || undefined,
      notes: anotacoes.trim() || undefined,
      assignedUserId: responsavel || null,
      // Meio-dia do calendário da tela, e não meia-noite UTC: o agendamento é um
      // dia de balcão, e mandado como `AAAA-MM-DD` ele viraria véspera no fuso.
      scheduledAt: agendada ? agendada + "T12:00:00" : null,
      discount: valorNumerico(desconto),
      items: itens,
    };

    setGravando(true);
    try {
      if (editar && ordem) {
        await api.patch("/service-orders/" + ordem.id, { clientId, ...comum });
        notify.success("Ordem atualizada.");
      } else {
        await api.post("/service-orders", { clientId, ...comum });
        notify.success("Ordem cadastrada.");
        limpar();
      }
      onSalvo();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className={"card-surface panel" + (editar ? " nx-os-form-modal" : "")}>
      <h2 className="nx-panel-title">{editar ? "Editar a ordem" : "Nova ordem de serviço"}</h2>
      <p className="nx-panel-sub">
        {editar
          ? "A ordem está aberta: itens, valores e responsável ainda podem mudar. O estoque só se move na conclusão."
          : "Some as peças e os serviços; a ordem abre em estado aberto e o estoque só se move quando ela for concluída."}
      </p>

      {cargaErro ? <ErrorState message={cargaErro} /> : null}

      <div className="nx-os-grade">
        <div className="field">
          <label className="field-label" htmlFor="os-cliente">Cliente</label>
          <select id="os-cliente" className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Selecione o cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="os-titulo">Título</label>
          <input id="os-titulo" className="input" maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que será feito" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="os-prioridade">Prioridade</label>
          <select id="os-prioridade" className="select" value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)}>
            {(Object.keys(PRIORIDADE_ROTULO) as Prioridade[]).map((p) => <option key={p} value={p}>{PRIORIDADE_ROTULO[p]}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="os-responsavel">Responsável</label>
          <select id="os-responsavel" className="select" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Sem responsável</option>
            {opcoesDeResponsavel.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {!podeVerEquipe ? <p className="form-note">Seu perfil não lista a equipe; o responsável atual continua marcado.</p> : null}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="os-agendada">Agendamento</label>
          <input id="os-agendada" className="input" type="date" value={agendada} onChange={(e) => setAgendada(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="os-desconto">Desconto</label>
          <input id="os-desconto" className="input" inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" />
        </div>
      </div>

      <div className="field">
        <span className="field-label">Linhas da ordem</span>
        {linhas.map((l, idx) => {
          const peca = l.kind === "PART" ? produtoPorId(l.productId) : undefined;
          return (
            <div key={idx} className="nx-os-linha-campo">
              <select className="select" aria-label={"Tipo da linha " + (idx + 1)} value={l.kind}
                onChange={(e) => patchLinha(idx, { kind: e.target.value as TipoLinha, productId: "", description: l.kind === e.target.value ? l.description : "" })}>
                <option value="SERVICE">Serviço</option>
                <option value="PART">Peça</option>
              </select>
              {l.kind === "PART" ? (
                <select className="select" aria-label={"Produto da linha " + (idx + 1)} value={l.productId} onChange={(e) => escolherProduto(idx, e.target.value)}>
                  <option value="">Selecione a peça</option>
                  {produtos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <input className="input" maxLength={200} value={l.description} placeholder="O que foi feito"
                  aria-label={"Descrição do serviço " + (idx + 1)} onChange={(e) => patchLinha(idx, { description: e.target.value })} />
              )}
              <input className="input" inputMode="decimal" value={l.quantity} aria-label={"Quantidade " + (idx + 1)} onChange={(e) => patchLinha(idx, { quantity: e.target.value })} />
              <input className="input" inputMode="decimal" value={l.unitPrice} placeholder="0,00" aria-label={"Preço unitário " + (idx + 1)} onChange={(e) => patchLinha(idx, { unitPrice: e.target.value })} />
              <span className="mono nx-os-linha-total">{formatCurrency(valorNumerico(l.quantity) * valorNumerico(l.unitPrice))}</span>
              {linhas.length > 1 ? (
                <button type="button" className="btn btn-ghost btn-sm" aria-label={"Remover linha " + (idx + 1)} onClick={() => setLinhas((prev) => prev.filter((_, i) => i !== idx))}>×</button>
              ) : <span />}
              {peca?.trackStock ? <p className="form-note nx-os-saldo">{peca.name}: {peca.stockQuantity} {peca.unit} em estoque</p> : null}
            </div>
          );
        })}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLinhas((prev) => [...prev, { ...LINHA_INICIAL }])}>+ Adicionar linha</button>
      </div>

      <div className="nx-os-grade">
        <div className="field">
          <label className="field-label" htmlFor="os-descricao">Descrição</label>
          <textarea id="os-descricao" className="input" rows={2} maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que o cliente relatou" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="os-diagnostico">Diagnóstico</label>
          <textarea id="os-diagnostico" className="input" rows={2} maxLength={2000} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="O que o técnico encontrou" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="os-anotacoes">Anotações internas</label>
          <textarea id="os-anotacoes" className="input" rows={2} maxLength={500} value={anotacoes} onChange={(e) => setAnotacoes(e.target.value)} placeholder="Não sai no impresso" />
        </div>
      </div>

      <div className="toolbar" style={{ marginTop: 0 }}>
        <button type="button" className="btn btn-brand" onClick={() => void salvar()} disabled={gravando}>
          {gravando ? "Salvando…" : editar ? "Salvar alterações" : "Registrar ordem"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={editar ? aoCancelar : limpar} disabled={gravando}>
          {editar ? "Voltar" : "Limpar formulário"}
        </button>
        <span className="toolbar-note">
          Soma <strong className="mono">{formatCurrency(soma)}</strong> · Total previsto <strong className="mono">{formatCurrency(previsao)}</strong>
        </span>
      </div>
      <p className="form-note">
        {sujo ? "As alterações ainda não foram gravadas." : "Nada foi alterado neste formulário."}
      </p>
    </div>
  );
}

// ---- Anotação de execução (o que o técnico escreve na ordem dele) ----

function AnotacaoExecucao({ ordem, onClose, onSalvo }: { ordem: OrdemDetalhada; onClose: () => void; onSalvo: () => void }) {
  const [diagnostico, setDiagnostico] = useState(ordem.diagnosis ?? "");
  const [anotacoes, setAnotacoes] = useState(ordem.notes ?? "");
  const [gravando, setGravando] = useState(false);
  const sujo = useDirty({ diagnostico, anotacoes });

  async function salvar() {
    setGravando(true);
    try {
      await api.patch("/service-orders/" + ordem.id, { diagnosis: diagnostico.trim(), notes: anotacoes.trim() });
      notify.success("Anotações gravadas.");
      onSalvo();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setGravando(false);
    }
  }

  return (
    <Modal
      title="Anotar a execução"
      label={"Anotações da ordem " + ordem.number}
      subtitle={"#" + ordem.number + " · " + ordem.title}
      onClose={onClose}
      onSubmit={() => void salvar()}
      submitLabel="Salvar"
      busy={gravando}
      dirty={sujo}
      hint="Diagnóstico e anotações podem ser escritos até depois de concluída a ordem."
    >
      <div className="field">
        <label className="field-label" htmlFor="an-diagnostico">Diagnóstico</label>
        <textarea id="an-diagnostico" className="input" rows={3} maxLength={2000} value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="an-anotacoes">Anotações internas</label>
        <textarea id="an-anotacoes" className="input" rows={3} maxLength={500} value={anotacoes} onChange={(e) => setAnotacoes(e.target.value)} />
      </div>
    </Modal>
  );
}

// ---- Detalhe com linha do tempo e documento ----

function DetalheDaOrdem({
  ordem, companyName, podeEditarEstrutura, podeAnotar, onEditar, onAnotar, onClose,
}: {
  ordem: OrdemDetalhada;
  companyName: string;
  podeEditarEstrutura: boolean;
  podeAnotar: boolean;
  onEditar: () => void;
  onAnotar: () => void;
  onClose: () => void;
}) {
  // A cobrança de uma ordem é a cara dela: o id viaja na URL e a tela do carnê
  // lê cliente, título e total direto na ordem.
  const navegar = useNavigate();
  const { can } = useAuth();
  const somaLinhas = ordem.items.reduce((acc, i) => acc + i.lineTotal, 0);

  function imprimir() {
    window.print();
  }

  return (
    <Modal
      title={<>Ordem <span className={"status-pill " + STATUS_CLASSE[ordem.status]}>{STATUS_ROTULO[ordem.status]}</span></>}
      label={"Detalhe da ordem " + ordem.number}
      subtitle={"#" + ordem.number + " · " + (ordem.clientName ?? "Cliente não informado") + " · " + formatDateTime(ordem.createdAt)}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <span className="nx-modal-hint">O impresso leva as linhas na ordem digitada.</span>
          <div className="nx-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
            <button type="button" className="btn btn-ghost" onClick={imprimir}>Imprimir</button>
            {can("charge:write") ? (
              <button type="button" className="btn btn-ghost" onClick={() => navegar("/app/cobrancas?os=" + ordem.id)}>Gerar cobrança</button>
            ) : null}
            {podeAnotar ? <button type="button" className="btn btn-ghost" onClick={onAnotar}>Anotar</button> : null}
            {podeEditarEstrutura ? <button type="button" className="btn btn-brand" onClick={onEditar}>Editar ordem</button> : null}
          </div>
        </>
      }
    >
      {/* O documento é o que vai para o papel: tudo fora dele some na impressão. */}
      <div className="nx-os-doc">
        <header className="nx-os-doc-cabeca">
          <div>
            <p className="nx-os-empresa">{companyName}</p>
            <h3 className="nx-os-numero">Ordem de serviço #{ordem.number}</h3>
          </div>
          <p className="nx-os-prioridade">{PRIORIDADE_ROTULO[ordem.priority]}</p>
        </header>

        <dl className="kv">
          <div><dt>Cliente</dt><dd>{ordem.clientName ?? "—"}</dd></div>
          <div><dt>Responsável</dt><dd>{ordem.assignedUserName ?? "—"}</dd></div>
          <div><dt>Abertura</dt><dd className="mono">{formatDateTime(ordem.createdAt)}</dd></div>
          {ordem.scheduledAt ? <div><dt>Agendamento</dt><dd className="mono">{formatDate(ordem.scheduledAt)}</dd></div> : null}
          {ordem.startedAt ? <div><dt>Início</dt><dd className="mono">{formatDateTime(ordem.startedAt)}</dd></div> : null}
          {ordem.completedAt ? <div><dt>Conclusão</dt><dd className="mono">{formatDateTime(ordem.completedAt)}</dd></div> : null}
          {ordem.description ? <div><dt>Relato</dt><dd>{ordem.description}</dd></div> : null}
          {ordem.diagnosis ? <div><dt>Diagnóstico</dt><dd>{ordem.diagnosis}</dd></div> : null}
        </dl>

        <h4 className="nx-os-titulo-secao">{ordem.title}</h4>
        <table className="table nx-os-itens">
          <thead>
            <tr><th scope="col">#</th><th scope="col">Item</th><th scope="col">Qtd.</th><th scope="col">Unitário</th><th scope="col">Total</th></tr>
          </thead>
          <tbody>
            {ordem.items.map((i, idx) => (
              <tr key={i.id} className={"nx-os-linha nx-os-linha-" + (idx + 1)}>
                <td className="mono">{idx + 1}</td>
                <td>{i.kind === "PART" ? (i.productName ?? "Peça removida do cadastro") : (i.description ?? "Serviço")}</td>
                <td className="mono">{i.quantity}</td>
                <td className="mono">{formatCurrency(i.unitPrice)}</td>
                <td className="mono">{formatCurrency(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nx-os-conta">
          Soma das linhas <strong className="mono">{formatCurrency(somaLinhas)}</strong>
          {ordem.discount > 0 ? <> · desconto <strong className="mono">{formatCurrency(ordem.discount)}</strong></> : null}
          {" · total "}
          <strong className="mono">{formatCurrency(ordem.total)}</strong>
        </p>
        <p className="nx-os-assinatura">Assinatura do responsável: ______________________________</p>
        <p className="nx-os-assinatura">Ciente do cliente: ______________________________</p>
      </div>

      <h4 className="nx-os-titulo-secao">Linha do tempo</h4>
      {ordem.history.length === 0 ? (
        <p className="form-note">A ordem ainda não mudou de estado.</p>
      ) : (
        <ul className="activity-list">
          {ordem.history.map((h) => (
            <li key={h.id} className="activity-item">
              <span className="activity-dot" />
              <span className="activity-entity">
                {h.fromStatus ? STATUS_ROTULO[h.fromStatus] + " → " : ""}
                {STATUS_ROTULO[h.toStatus]}
              </span>
              <span className="nx-os-quem">{h.userName ?? "—"}</span>
              <span className="mono nx-os-quando" title={formatDateTime(h.createdAt)}>{formatDate(h.createdAt)}</span>
              {h.note ? <p className="nx-os-motivo">{h.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
