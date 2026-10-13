import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { Modal, useDirty } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { formatCurrency, formatDate, formatDateTime } from "../lib/format";
import { valorNumerico } from "../lib/money";

// F3.2 Parte 2 — Cobranças na tela.
//
// A tela é o carnê: a pessoa abre, vê quanto está em aberto e o que já venceu
// (contagem do servidor, nunca soma das linhas desta página), procura pelo
// cliente, pelo número ou pelo título, marca o que entrou e cancela o que não
// existe mais — com o motivo escrito, porque sem motivo o cancelamento é apagar.
//
// Nada aqui decide regra de negócio. Quem gera o lançamento do caixa, quem pode
// marcar recebimento e qual chave PIX é válida é do serviço
// (apps/api/src/modules/charges/charges.service.ts); a tela esconde o botão que a
// regra não permite e o servidor continua sendo a autoridade para quem insistir
// pelo console.
//
// Quatro coisas que a tela faz questão de não inventar:
//  - o "vencida": é o servidor quem compara o dia com o calendário da empresa. A
//    tela pergunta `overdue=true` e mostra o selo que voltou;
//  - o dia do vencimento: sai de `dueDateLabel`, nunca do instante UTC formatado
//    pelo navegador de quem olha — isso adiantaria ou atrasaria um dia no papel;
//  - o recibo: o papel de "recebi" só existe quando o pagamento foi registrado,
//    com quem registrou e quando, lidos da resposta;
//  - a credencial de terceiro: a aba de gateway escreve chave PIX, beneficiário,
//    instruções e vencimento padrão. Não existe campo de chave de acesso, de
//    senha ou de segredo nesta tela, e os provedores que ainda não têm
//    integração explicam o motivo em vez de abrir um formulário que não seria
//    gravado.

type StatusCobranca = "PENDING" | "PAID" | "CANCELLED";
type Metodo = "PIX" | "BOLETO" | "TRANSFERENCIA" | "DINHEIRO" | "CARTAO" | "OUTRO";
type TipoChave = "CPF" | "CNPJ" | "EMAIL" | "TELEFONE" | "ALEATORIA";
type Vinculo = "CLIENTE" | "VENDA" | "OS";

interface Cobranca {
  id: string;
  number: number;
  status: StatusCobranca;
  title: string;
  amount: number;
  dueDate: string;
  dueDateLabel: string;
  overdue: boolean;
  method: Metodo;
  pixKeyType: TipoChave | null;
  pixKey: string | null;
  instructions: string | null;
  notes: string | null;
  clientId: string | null;
  clientName: string | null;
  saleId: string | null;
  saleReference: string | null;
  serviceOrderId: string | null;
  serviceOrderNumber: number | null;
  financeEntryId: string | null;
  paidAt: string | null;
  paidMethod: Metodo | null;
  paidByName: string | null;
  paymentNote: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelledByName: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Sumario {
  total: number;
  pendingCount: number;
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  paidCount: number;
  paidAmountThisMonth: number;
  cancelledCount: number;
}

interface GatewayLinha {
  provider: string;
  slug: string;
  rotulo: string;
  available: boolean;
  configured: boolean;
  motivoIndisponivel: string | null;
  environment: string | null;
  active: boolean;
  displayName: string | null;
  pixKeyType: TipoChave | null;
  pixKey: string | null;
  beneficiaryName: string | null;
  instructions: string | null;
  defaultDueDays: number | null;
  updatedAt: string | null;
}

interface ClienteOpt { id: string; name: string }
interface VendaOpt { id: string; total: number; status: string }
interface OrdemOpt { id: string; number: number; title: string }
interface DocumentoVinculado { cliente: string | null; total: number; referencia: string }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

// ---- Vocabulário da tela (uma vez só, para tabela, documento e formulário) ----

const STATUS_ROTULO: Record<StatusCobranca, string> = {
  PENDING: "Pendente",
  PAID: "Paga",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSE: Record<StatusCobranca, string> = {
  PENDING: "is-cb-pending",
  PAID: "is-cb-paid",
  CANCELLED: "is-cb-cancelled",
};

const METODO_ROTULO: Record<Metodo, string> = {
  PIX: "PIX",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

const TIPO_CHAVE_ROTULO: Record<TipoChave, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  TELEFONE: "Telefone",
  ALEATORIA: "Aleatória",
};

// ---- A página ----

export function Cobrancas() {
  const { can, user } = useAuth();
  const escrita = can("charge:write");
  // O cadastro de como a empresa recebe dinheiro é administração, não operação
  // de caixa: é o mesmo portão da tela de Configurações.
  const podeConfigurarRecebimento = can("settings:read");
  const [buscaParam] = useSearchParams();
  const vendaDaUrl = buscaParam.get("venda");
  const ordemDaUrl = buscaParam.get("os");
  // Quem chega por "Gerar cobrança" numa venda ou numa OS já cai no formulário —
  // o caminho contrário (abrir a aba à mão) custaria dois cliques e uma memória.
  const abaInicial = escrita && (vendaDaUrl || ordemDaUrl) ? "nova" : "cobrancas";

  const abas: TabItem[] = [
    { id: "cobrancas", label: "Cobranças", hint: "Lista, filtros, indicadores e ações" },
    ...(escrita ? [{ id: "nova", label: "Nova cobrança", hint: "Abrir uma cobrança avulsa ou de documento" }] : []),
    ...(podeConfigurarRecebimento ? [{ id: "gateways", label: "Gateways", hint: "Como a empresa recebe" }] : []),
  ];
  const { active, onSelect } = useTabState(abas, abaInicial);

  const [rows, setRows] = useState<Paged<Cobranca> | null>(null);
  const [sumario, setSumario] = useState<Sumario | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const [metodo, setMetodo] = useState("");
  const [vencida, setVencida] = useState("");
  const [ordemPor, setOrdemPor] = useState("createdAt");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  const [detalhe, setDetalhe] = useState<Cobranca | null>(null);
  const [detalheErro, setDetalheErro] = useState<string | null>(null);
  const [pagando, setPagando] = useState<Cobranca | null>(null);
  const [cancelando, setCancelando] = useState<Cobranca | null>(null);
  // A lista que vale é a do último filtro, não a do último pacote. Cada recarga
  // recebe um número e só escreve na tela se ainda for o mais novo: limpar o
  // vencimento e escolher a situação no mesmo segundo dispara dois pedidos, a rede
  // responde na ordem que quiser, e sem esta guarda o da lista cheia chega por
  // último e pinta contas que o filtro escolhido não pediu.
  const ultimaLista = useRef(0);

  const carregar = useCallback(async () => {
    const minhaBusca = ++ultimaLista.current;
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Paged<Cobranca>>("/charges", {
        params: {
          page,
          pageSize,
          search: busca || undefined,
          status: status || undefined,
          method: metodo || undefined,
          overdue: vencida || undefined,
          sort: ordemPor,
        },
      });
      if (minhaBusca !== ultimaLista.current) return;
      setRows(data);
    } catch (err) {
      if (minhaBusca !== ultimaLista.current) return;
      setErro(extractErrorMessage(err));
    } finally {
      // O spin continua sendo do pedido mais novo; o perdedor fica mudo, inclusive
      // quanto ao erro — uma resposta velha não pode abrir aviso na tela.
      if (minhaBusca === ultimaLista.current) setCarregando(false);
    }
  }, [page, pageSize, busca, status, metodo, vencida, ordemPor, recarga]);

  useEffect(() => {
    if (active !== "cobrancas") return;
    void carregar();
  }, [active, carregar]);

  // Os indicadores são contagem do ACERVO, feita pelo servidor: a janela de
  // filtro da lista não muda os cartões, e é por isso que esta chamada não leva
  // nenhum parâmetro de busca.
  useEffect(() => {
    let vivo = true;
    api.get<Sumario>("/charges/summary")
      .then(({ data }) => { if (vivo) setSumario(data); })
      .catch(() => { if (vivo) setSumario(null); });
    return () => { vivo = false; };
  }, [recarga]);

  function reabrir() {
    setRecarga((n) => n + 1);
  }

  async function abrirDetalhe(id: string) {
    setDetalheErro(null);
    try {
      const { data } = await api.get<Cobranca>("/charges/" + id);
      setDetalhe(data);
    } catch (err) {
      setDetalheErro(extractErrorMessage(err));
    }
  }

  const totalDaLista = rows?.meta.total ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Cobranças</h1>
          <p className="page-sub">Quem deve, quanto e até quando, na empresa ativa</p>
        </div>
        {escrita ? (
          <button type="button" className="btn btn-brand" onClick={() => onSelect("nova")}>Nova cobrança</button>
        ) : null}
      </div>

      <Tabs tabs={abas} active={active} onSelect={(id) => { setPage(1); onSelect(id); }} ariaLabel="Seções das cobranças" />

      <TabPanel id="cobrancas" active={active}>
        {sumario ? (
          <div className="kpi-grid">
            <CartaoKpi rotulo="Pendentes" valor={String(sumario.pendingCount)} dica="aguardando recebimento" />
            <CartaoKpi rotulo="Em aberto" valor={formatCurrency(sumario.pendingAmount)} dica="soma do que ainda não entrou" />
            <CartaoKpi rotulo="Vencidas" valor={String(sumario.overdueCount)} dica="no calendário da empresa" />
            <CartaoKpi rotulo="Vencido em aberto" valor={formatCurrency(sumario.overdueAmount)} dica="dinheiro que já devia ter entrado" />
            <CartaoKpi rotulo="Pagas" valor={String(sumario.paidCount)} dica="no acervo todo" />
            <CartaoKpi rotulo="Recebido no mês" valor={formatCurrency(sumario.paidAmountThisMonth)} dica="registrado no mês da empresa" />
            <CartaoKpi rotulo="Canceladas" valor={String(sumario.cancelledCount)} dica="com motivo escrito" />
            <CartaoKpi rotulo="Cobranças no total" valor={String(sumario.total)} dica="pendentes, pagas e canceladas" />
          </div>
        ) : null}

        <div className="toolbar">
          <input
            className="input"
            type="search"
            placeholder="Buscar por número, cliente ou título"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
            aria-label="Buscar cobranças"
          />
          <select className="select" style={{ maxWidth: 170 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filtrar por situação">
            <option value="">Todas as situações</option>
            {(Object.keys(STATUS_ROTULO) as StatusCobranca[]).map((s) => <option key={s} value={s}>{STATUS_ROTULO[s]}</option>)}
          </select>
          <select className="select" style={{ maxWidth: 175 }} value={metodo} onChange={(e) => { setMetodo(e.target.value); setPage(1); }} aria-label="Filtrar por método">
            <option value="">Todos os métodos</option>
            {(Object.keys(METODO_ROTULO) as Metodo[]).map((m) => <option key={m} value={m}>{METODO_ROTULO[m]}</option>)}
          </select>
          <select className="select" style={{ maxWidth: 185 }} value={vencida} onChange={(e) => { setVencida(e.target.value); setPage(1); }} aria-label="Filtrar por vencimento">
            <option value="">Todos os vencimentos</option>
            <option value="true">Só vencidas</option>
            <option value="false">Ainda no prazo</option>
          </select>
          <select className="select" style={{ maxWidth: 170 }} value={ordemPor} onChange={(e) => setOrdemPor(e.target.value)} aria-label="Ordenar por">
            <option value="createdAt">Mais recentes</option>
            <option value="number">Pelo número</option>
            <option value="dueDate">Pelo vencimento</option>
            <option value="amount">Pelo valor</option>
          </select>
          <span className="toolbar-note">
            {carregando ? "Atualizando lista…" : rows ? totalDaLista + (totalDaLista === 1 ? " cobrança" : " cobranças") : "—"}
          </span>
        </div>

        {carregando ? (
          <LoadingInline label="Carregando cobranças…" />
        ) : erro ? (
          <ErrorState message={erro} onRetry={carregar} />
        ) : rows && rows.data.length > 0 ? (
          <div className="card-surface table-wrap">
            <div className="nx-cb-scroll">
              <table className="table nx-cb-tabela">
                <thead>
                  <tr>
                    <th scope="col">Número</th>
                    <th scope="col">Cliente</th>
                    <th scope="col">Cobrança</th>
                    <th scope="col">Documento</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Vencimento</th>
                    <th scope="col">Recebimento</th>
                    <th scope="col">Situação</th>
                    <th scope="col" className="col-acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.data.map((c) => (
                    <tr key={c.id}>
                      <td data-rotulo="Número" className="mono">#{c.number}</td>
                      <td data-rotulo="Cliente">{c.clientName ?? "—"}</td>
                      <td data-rotulo="Cobrança">
                        <button type="button" className="btn btn-ghost btn-sm nx-cb-abrir" aria-label={"Ver cobrança " + c.number} onClick={() => void abrirDetalhe(c.id)}>
                          {c.title}
                        </button>
                      </td>
                      <td data-rotulo="Documento">{referenciaDoDocumento(c)}</td>
                      <td data-rotulo="Valor" className="mono">{formatCurrency(c.amount)}</td>
                      <td data-rotulo="Vencimento" className="mono">{diaLegivel(c.dueDateLabel)}</td>
                      <td data-rotulo="Recebimento">{rotuloDoRecebimento(c)}</td>
                      <td data-rotulo="Situação">
                        <span className={"status-pill " + STATUS_CLASSE[c.status]}>{STATUS_ROTULO[c.status]}</span>
                        {c.overdue ? <span className="status-pill is-cb-overdue">Vencida</span> : null}
                      </td>
                      <td data-rotulo="Ações" className="col-acoes">
                        <div className="row-actions">
                          {escrita && c.status === "PENDING" ? (
                            <>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPagando(c)}>Pagar</button>
                              <button type="button" className="btn btn-ghost btn-sm nx-cb-perigo" onClick={() => setCancelando(c)}>Cancelar</button>
                            </>
                          ) : null}
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
                itemLabel="cobranças"
                itemLabelSingular="cobrança"
              />
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma cobrança cadastrada"
            description={escrita ? "Abra a primeira cobrança, ou gere uma a partir de uma venda ou ordem de serviço." : "Ajuste os filtros acima para outro recorte."}
            action={escrita ? <button type="button" className="btn btn-brand" onClick={() => onSelect("nova")}>Nova cobrança</button> : undefined}
          />
        )}
      </TabPanel>

      <TabPanel id="nova" active={active}>
        {escrita ? (
          <FormularioCobranca
            vendaInicial={vendaDaUrl ?? undefined}
            ordemInicial={ordemDaUrl ?? undefined}
            podeVerRecebimento={podeConfigurarRecebimento}
            onSalvo={() => { reabrir(); onSelect("cobrancas"); }}
          />
        ) : (
          <EmptyState title="Sem permissão" description="Abrir cobrança é ação de quem tem escrita no módulo." />
        )}
      </TabPanel>

      <TabPanel id="gateways" active={active}>
        {podeConfigurarRecebimento ? <PainelGateways /> : null}
      </TabPanel>

      {detalhe ? (
        <DetalheDaCobranca cobranca={detalhe} companyName={user?.companyName ?? ""} onClose={() => setDetalhe(null)} />
      ) : null}

      {detalheErro ? <ErrorState message={detalheErro} /> : null}

      {pagando ? (
        <RegistroDePagamento
          cobranca={pagando}
          onClose={() => setPagando(null)}
          onSalvo={() => { setPagando(null); reabrir(); }}
        />
      ) : null}

      {cancelando ? (
        <CancelamentoDeCobranca
          cobranca={cancelando}
          onClose={() => setCancelando(null)}
          onSalvo={() => { setCancelando(null); setDetalhe(null); reabrir(); }}
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

/**
 * O dia do vencimento como ele se lê no balcão: "2026-10-20" vira "20/10/2026".
 *
 * É recorte de string, e não `new Date()`: a API devolve o dia do calendário DA
 * EMPRESA justamente para não haver fuso no meio, e `new Date("2026-10-20")` é
 * meia-noite UTC — formatado em America/Sao_Paulo ele sai como 19/10, o dia de
 * ontem escrito no papel do cliente. Sem objeto Date, não há fuso que empurre.
 */
function diaLegivel(rotulo: string): string {
  const [ano, mes, dia] = rotulo.split("-");
  if (!ano || !mes || !dia) return rotulo;
  return dia + "/" + mes + "/" + ano;
}

/**
 * O dia de calendário da empresa, no fuso cadastrado — o mesmo rótulo AAAA-MM-DD
 * que o servidor calcula (`apps/api/src/lib/time.ts`) e o `<input type="date">`
 * espera. Existe porque o campo de data do recebimento nasce preenchido, e a régua
 * não pode ser o relógio do navegador de quem digita: numa janela em fuso adiantado
 * ele já estaria no dia de amanhã, e o servidor recusaria o registro por dia que
 * ainda não chegou. Fuso inválido no cadastro cai em UTC, que é o que o serviço faz
 * — as duas pontas precisam discordar do mesmo jeito.
 */
function diaDaEmpresa(timeZone: string, base = new Date()): string {
  let fuso = "UTC";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone }).format(base);
    fuso = timeZone;
  } catch {
    fuso = "UTC";
  }
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);
  const campo = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "01";
  return `${campo("year")}-${campo("month")}-${campo("day")}`;
}

/**
 * A coluna "Recebimento" diz o que entrou, não o que foi pedido: cobrança aberta
 * no PIX e recebida em dinheiro é o balcão todos os dias, e a tabela que repete o
 * método da cobrança estaria mentindo depois do pagamento. Enquanto não entra, o
 * que se mostra é o método com que a cobrança foi aberta.
 */
function rotuloDoRecebimento(c: Cobranca): string {
  return METODO_ROTULO[c.paidAt ? c.paidMethod ?? c.method : c.method];
}

/**
 * O documento que originou a cobrança, dito do jeito do balcão: a ordem de
 * serviço tem número sequencial, a venda é conhecida pelos oito primeiros
 * caracteres do id (a mesma assinatura do lançamento gerado), e a cobrança
 * avulsa não tem documento nenhum — tem o cliente.
 */
function referenciaDoDocumento(c: Cobranca): string {
  if (c.serviceOrderNumber !== null) return "OS " + c.serviceOrderNumber;
  if (c.saleReference) return "Venda " + c.saleReference;
  return "Avulsa";
}

// ---- O formulário ----

interface FormularioProps {
  vendaInicial?: string;
  ordemInicial?: string;
  podeVerRecebimento: boolean;
  onSalvo: () => void;
}

function FormularioCobranca({ vendaInicial, ordemInicial, podeVerRecebimento, onSalvo }: FormularioProps) {
  const [vinculo, setVinculo] = useState<Vinculo>(vendaInicial ? "VENDA" : ordemInicial ? "OS" : "CLIENTE");
  const [clientId, setClientId] = useState("");
  const [saleId, setSaleId] = useState(vendaInicial ?? "");
  const [serviceOrderId, setServiceOrderId] = useState(ordemInicial ?? "");

  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("PIX");
  const [tipoChave, setTipoChave] = useState<TipoChave>("CNPJ");
  const [chave, setChave] = useState("");
  const [instrucoes, setInstrucoes] = useState("");
  const [anotacoes, setAnotacoes] = useState("");
  // O vencimento padrão vem do cadastro de recebimento; nulo é "a empresa não
  // definiu", e aí a pessoa digita a data.
  const [diasPadrao, setDiasPadrao] = useState<number | null>(null);

  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [vendas, setVendas] = useState<VendaOpt[]>([]);
  const [ordens, setOrdens] = useState<OrdemOpt[]>([]);
  const [documento, setDocumento] = useState<DocumentoVinculado | null>(null);
  const [cargaErro, setCargaErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  const sujo = useDirty({ vinculo, clientId, saleId, serviceOrderId, titulo, valor, vencimento, metodo, tipoChave, chave, instrucoes, anotacoes });

  // As três listas de escolha só são pedidas por quem pode abrir cobrança, e só
  // quando o formulário está montado: quem lê cobranças na tela não bate nessas
  // portas, e o servidor não liberaria nenhuma delas sem permissão de leitura.
  useEffect(() => {
    let vivo = true;
    Promise.all([
      api.get<Paged<ClienteOpt>>("/clients", { params: { page: 1, pageSize: 100 } }),
      api.get<Paged<VendaOpt>>("/sales", { params: { page: 1, pageSize: 100, status: "CONFIRMED" } }),
      api.get<Paged<OrdemOpt>>("/service-orders", { params: { page: 1, pageSize: 100 } }),
    ])
      .then(([c, v, o]) => {
        if (!vivo) return;
        setClientes(c.data.data);
        setVendas(v.data.data);
        setOrdens(o.data.data);
      })
      .catch((e) => { if (vivo) setCargaErro(extractErrorMessage(e)); });
    return () => { vivo = false; };
  }, []);

  // O vencimento padrão do recebimento (dias corridos desde hoje) é uma ajuda, não
  // uma regra: quem não tem settings:read simplesmente digita a data. A chave só
  // entra onde ainda não foi digitada — a resposta pode chegar depois de alguém
  // já ter escolhido outra chave, e a última palavra é de quem está no balcão.
  useEffect(() => {
    if (!podeVerRecebimento) return;
    let vivo = true;
    api.get<{ data: GatewayLinha[] }>("/gateways")
      .then(({ data }) => {
        if (!vivo) return;
        const manual = data.data.find((g) => g.provider === "MANUAL");
        const dias = manual?.defaultDueDays;
        if (dias && dias > 0) setDiasPadrao(dias);
        if (manual?.pixKeyType && manual.pixKey) {
          setChave((atual) => {
            if (atual.trim() !== "") return atual;
            setTipoChave(manual.pixKeyType as TipoChave);
            return manual.pixKey as string;
          });
        }
      })
      .catch(() => { /* sem recebimento configurado o formulário segue em branco */ });
    return () => { vivo = false; };
  }, [podeVerRecebimento]);

  // A data de vencimento é campo de calendário: o input devolve AAAA-MM-DD e o
  // serviço decide a borda do dia no fuso da empresa. Aqui não se soma hora.
  function sugerirVencimento() {
    if (diasPadrao === null) return "";
    const ainda = new Date();
    ainda.setDate(ainda.getDate() + diasPadrao);
    return [
      String(ainda.getFullYear()),
      String(ainda.getMonth() + 1).padStart(2, "0"),
      String(ainda.getDate()).padStart(2, "0"),
    ].join("-");
  }

  // O vínculo manda no cliente e no valor: a cobrança de uma venda ou de uma OS
  // é a cara daquele documento. Lido na fonte, porque a tela não tem o direito
  // de lembrar um total de cabeça.
  const idVinculado = vinculo === "VENDA" ? saleId : vinculo === "OS" ? serviceOrderId : "";
  useEffect(() => {
    if (!idVinculado) {
      setDocumento(null);
      return;
    }
    let vivo = true;
    const porta = vinculo === "VENDA" ? "/sales/" : "/service-orders/";
    api.get<{ clientName?: string | null; total?: number; number?: number; id?: string }>(porta + idVinculado)
      .then(({ data }) => {
        if (!vivo) return;
        const total = Number(data.total ?? 0);
        setDocumento({
          cliente: data.clientName ?? null,
          total,
          referencia: vinculo === "VENDA" ? "Venda " + idVinculado.slice(0, 8).toUpperCase() : "OS " + (data.number ?? ""),
        });
        // O valor sugerido é o do documento, e só entra se ninguém digitou antes.
        setValor((atual) => (atual.trim() === "" && total > 0 ? String(total) : atual));
      })
      .catch((e) => { if (vivo) setCargaErro(extractErrorMessage(e)); });
    return () => { vivo = false; };
  }, [idVinculado, vinculo]);

  function limpar() {
    setVinculo("CLIENTE");
    setClientId("");
    setSaleId("");
    setServiceOrderId("");
    setTitulo("");
    setValor("");
    setVencimento("");
    setInstrucoes("");
    setAnotacoes("");
    setDocumento(null);
  }

  async function salvar() {
    if (vinculo === "CLIENTE" && !clientId) { notify.error("Escolha o cliente da cobrança."); return; }
    if (vinculo === "VENDA" && !saleId) { notify.error("Escolha a venda que a cobrança representa."); return; }
    if (vinculo === "OS" && !serviceOrderId) { notify.error("Escolha a ordem de serviço que a cobrança representa."); return; }
    if (!titulo.trim()) { notify.error("Dê um título à cobrança."); return; }
    if (valorNumerico(valor) <= 0) { notify.error("O valor da cobrança deve ser maior que zero."); return; }
    const dia = vencimento || sugerirVencimento();
    if (!dia) { notify.error("Informe o dia do vencimento."); return; }
    if (metodo === "PIX" && !chave.trim()) { notify.error("A cobrança pelo PIX precisa da chave."); return; }

    const corpo: Record<string, unknown> = {
      title: titulo.trim(),
      amount: valorNumerico(valor),
      dueDate: dia,
      method: metodo,
      clientId: vinculo === "CLIENTE" ? clientId : undefined,
      saleId: vinculo === "VENDA" ? saleId : undefined,
      serviceOrderId: vinculo === "OS" ? serviceOrderId : undefined,
      pixKeyType: metodo === "PIX" ? tipoChave : undefined,
      pixKey: metodo === "PIX" ? chave.trim() : undefined,
      instructions: instrucoes.trim() || undefined,
      notes: anotacoes.trim() || undefined,
    };

    setGravando(true);
    try {
      await api.post("/charges", corpo);
      notify.success("Cobrança registrada.");
      limpar();
      onSalvo();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className="card-surface panel">
      <h2 className="nx-panel-title">Nova cobrança</h2>
      <p className="nx-panel-sub">
        A cobrança nasce pendente e não mexe no caixa. O lançamento de receita só existe quando o recebimento for
        registrado, uma única vez.
      </p>

      {cargaErro ? <ErrorState message={cargaErro} /> : null}

      <div className="nx-cb-grade">
        <div className="field">
          <label className="field-label" htmlFor="cb-vinculo">Vínculo da cobrança</label>
          <select
            id="cb-vinculo"
            className="select"
            value={vinculo}
            onChange={(e) => {
              setVinculo(e.target.value as Vinculo);
              setDocumento(null);
            }}
          >
            <option value="CLIENTE">Cliente avulso</option>
            <option value="VENDA">De uma venda</option>
            <option value="OS">De uma ordem de serviço</option>
          </select>
          <p className="form-note">O cliente da cobrança vem do documento escolhido.</p>
        </div>

        {vinculo === "CLIENTE" ? (
          <div className="field">
            <label className="field-label" htmlFor="cb-cliente">Cliente</label>
            <select id="cb-cliente" className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecione o cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        ) : null}

        {vinculo === "VENDA" ? (
          <div className="field">
            <label className="field-label" htmlFor="cb-venda">Venda</label>
            <select id="cb-venda" className="select" value={saleId} onChange={(e) => setSaleId(e.target.value)}>
              <option value="">Selecione a venda</option>
              {vendas.map((v) => (
                <option key={v.id} value={v.id}>
                  {assinaturaDe(v.id)} · {formatCurrency(v.total)}
                </option>
              ))}
            </select>
            <p className="form-note">A linha seguinte mostra o cliente e o total da venda escolhida.</p>
          </div>
        ) : null}

        {vinculo === "OS" ? (
          <div className="field">
            <label className="field-label" htmlFor="cb-os">Ordem de serviço</label>
            <select id="cb-os" className="select" value={serviceOrderId} onChange={(e) => setServiceOrderId(e.target.value)}>
              <option value="">Selecione a ordem</option>
              {ordens.map((o) => (
                <option key={o.id} value={o.id}>
                  OS {o.number} — {o.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="field">
          <label className="field-label" htmlFor="cb-titulo">Título</label>
          <input id="cb-titulo" className="input" maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="O que está sendo cobrado" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="cb-valor">Valor</label>
          <input id="cb-valor" className="input" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="cb-vencimento">Vencimento</label>
          <input id="cb-vencimento" className="input" type="date" value={vencimento || sugerirVencimento()} onChange={(e) => setVencimento(e.target.value)} />
          {diasPadrao !== null ? <p className="form-note">Sem data digitada, vale o padrão do recebimento: {diasPadrao} dias.</p> : null}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="cb-metodo">Método</label>
          <select id="cb-metodo" className="select" value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
            {(Object.keys(METODO_ROTULO) as Metodo[]).map((m) => <option key={m} value={m}>{METODO_ROTULO[m]}</option>)}
          </select>
        </div>

        {metodo === "PIX" ? (
          <>
            <div className="field">
              <label className="field-label" htmlFor="cb-tipochave">Tipo da chave PIX</label>
              <select id="cb-tipochave" className="select" value={tipoChave} onChange={(e) => setTipoChave(e.target.value as TipoChave)}>
                {(Object.keys(TIPO_CHAVE_ROTULO) as TipoChave[]).map((t) => <option key={t} value={t}>{TIPO_CHAVE_ROTULO[t]}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="cb-chave">Chave PIX</label>
              <input id="cb-chave" className="input" maxLength={255} value={chave} onChange={(e) => setChave(e.target.value)} placeholder={exemploDeChave(tipoChave)} />
              <p className="form-note">A chave é conferida pelo tipo: dígito trocado mandaria o pagamento para outra conta.</p>
            </div>
          </>
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="cb-instrucoes">Instruções de pagamento</label>
            <textarea id="cb-instrucoes" className="input" rows={2} maxLength={500} value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} placeholder="Onde pagar, até quando, como identificar" />
          </div>
        )}
      </div>

      {documento ? (
        <p className="nx-cb-vinculo-nota">
          {documento.referencia}
          {documento.cliente ? <> · <strong>{documento.cliente}</strong></> : null}
          {documento.total > 0 ? <> · total do documento <strong className="mono">{formatCurrency(documento.total)}</strong></> : null}
        </p>
      ) : null}

      <div className="field">
        <label className="field-label" htmlFor="cb-anotacoes">Anotações internas</label>
        <textarea id="cb-anotacoes" className="input" rows={2} maxLength={500} value={anotacoes} onChange={(e) => setAnotacoes(e.target.value)} placeholder="Não sai no impresso" />
      </div>

      <div className="toolbar" style={{ marginTop: 0 }}>
        <button type="button" className="btn btn-brand" onClick={() => void salvar()} disabled={gravando}>
          {gravando ? "Registrando…" : "Registrar cobrança"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={limpar} disabled={gravando}>Limpar formulário</button>
        <span className="toolbar-note">Total <strong className="mono">{formatCurrency(valorNumerico(valor))}</strong></span>
      </div>
      <p className="form-note">{sujo ? "As alterações ainda não foram gravadas." : "Nada foi alterado neste formulário."}</p>
    </div>
  );
}

/** Os oito primeiros caracteres do id: a mesma assinatura do lançamento. */
function assinaturaDe(id: string): string {
  return "Venda " + id.slice(0, 8).toUpperCase();
}

/** O exemplo que diz o formato, sem ensinar o dígito verificador de ninguém. */
function exemploDeChave(tipo: TipoChave): string {
  if (tipo === "CPF") return "123.456.789-09";
  if (tipo === "CNPJ") return "11.222.333/0001-81";
  if (tipo === "EMAIL") return "pagamentos@empresa.com.br";
  if (tipo === "TELEFONE") return "+55 11 98765-4321";
  return "chave gerada pelo banco";
}

// ---- Registrar recebimento ----

function RegistroDePagamento({ cobranca, onClose, onSalvo }: { cobranca: Cobranca; onClose: () => void; onSalvo: () => void }) {
  const { user } = useAuth();
  const hojeDaEmpresa = diaDaEmpresa(user?.timezone ?? "America/Sao_Paulo");
  const [data, setData] = useState(hojeDaEmpresa);
  const [forma, setForma] = useState<Metodo>(cobranca.method);
  const [anotacao, setAnotacao] = useState("");
  const [gravando, setGravando] = useState(false);
  const sujo = useDirty({ data, forma, anotacao });

  async function salvar() {
    setGravando(true);
    const corpo: Record<string, unknown> = { paidMethod: forma };
    // Caixa de data limpa é "não dito", e aí o instante passa a ser do servidor.
    // Dia escrito é dia da empresa: quem recebe e anota depois conhece o dia do
    // dinheiro melhor que o relógio da máquina, e é ele que vai para o lançamento,
    // para o recibo e para a conta do mês.
    if (data) corpo.paidAt = data;
    if (anotacao.trim()) corpo.paymentNote = anotacao.trim();
    try {
      await api.post("/charges/" + cobranca.id + "/pay", corpo);
      notify.success("Recebimento registrado.");
      onSalvo();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setGravando(false);
    }
  }

  return (
    <Modal
      title="Registrar pagamento"
      subtitle={"#" + cobranca.number + " · " + cobranca.title}
      onClose={onClose}
      onSubmit={() => void salvar()}
      submitLabel="Confirmar recebimento"
      busyLabel="Registrando…"
      busy={gravando}
      dirty={sujo}
      hint="O lançamento de receita entra uma única vez no caixa da empresa, no dia registrado aqui."
    >
      <p className="nx-cb-aviso-valor">
        Valor a receber <strong className="mono">{formatCurrency(cobranca.amount)}</strong> · vencimento <span className="mono">{diaLegivel(cobranca.dueDateLabel)}</span>
      </p>
      <div className="field">
        <label className="field-label" htmlFor="pg-data">Data do recebimento</label>
        <input id="pg-data" className="input" type="date" value={data} max={hojeDaEmpresa} onChange={(e) => setData(e.target.value)} />
        <p className="form-note">
          {data === hojeDaEmpresa
            ? "O dinheiro entrou hoje, no dia da empresa."
            : "Recebimento retroagido para " + diaLegivel(data) + ": o dia digitado é o que entra no caixa e no recibo."}
        </p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="pg-forma">Forma de recebimento</label>
        <select id="pg-forma" className="select" value={forma} onChange={(e) => setForma(e.target.value as Metodo)}>
          {(Object.keys(METODO_ROTULO) as Metodo[]).map((m) => <option key={m} value={m}>{METODO_ROTULO[m]}</option>)}
        </select>
        <p className="form-note">
          {forma !== cobranca.method
            ? "A cobrança foi aberta por " + METODO_ROTULO[cobranca.method].toLowerCase() + ", e o recebimento está sendo anotado por " + METODO_ROTULO[forma].toLowerCase() + "."
            : "O recebimento entra pela mesma forma da cobrança."}
        </p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="pg-anotacao">Anotação do recebimento</label>
        <textarea id="pg-anotacao" className="input" rows={2} maxLength={500} value={anotacao} onChange={(e) => setAnotacao(e.target.value)} placeholder="Banco, terminal, quem recebeu" />
      </div>
    </Modal>
  );
}

// ---- Cancelar, com motivo ----

function CancelamentoDeCobranca({ cobranca, onClose, onSalvo }: { cobranca: Cobranca; onClose: () => void; onSalvo: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [gravando, setGravando] = useState(false);
  const sujo = useDirty({ motivo });
  const campo = useRef<HTMLTextAreaElement>(null);

  async function salvar() {
    if (!motivo.trim()) {
      notify.error("Diga o motivo do cancelamento.");
      campo.current?.focus();
      return;
    }
    setGravando(true);
    try {
      await api.post("/charges/" + cobranca.id + "/cancel", { reason: motivo.trim() });
      notify.success("Cobrança cancelada.");
      onSalvo();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setGravando(false);
    }
  }

  return (
    <Modal
      title="Cancelar cobrança"
      subtitle={"#" + cobranca.number + " · " + (cobranca.clientName ?? "—") + " · " + formatCurrency(cobranca.amount)}
      onClose={onClose}
      onSubmit={() => void salvar()}
      submitLabel="Cancelar cobrança"
      busyLabel="Cancelando…"
      busy={gravando}
      dirty={sujo}
      tone="danger"
      hint="O que já entrou no caixa não é desfeito aqui: pagamento registrado se estorna de propósito, no Financeiro."
    >
      <div className="field">
        <label className="field-label" htmlFor="cx-motivo">Motivo do cancelamento</label>
        <textarea
          id="cx-motivo"
          ref={campo}
          className="input"
          rows={3}
          maxLength={500}
          data-autofocus
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Cliente desistiu, venda estornada, cobrança lançada em duplicidade"
        />
        <p className="form-note">Sem motivo a cobrança não sai do carnê: o cancelamento é uma decisão registrada, não um apagar.</p>
      </div>
    </Modal>
  );
}

// ---- Detalhe: o documento que vai ao papel ----

function DetalheDaCobranca({ cobranca, companyName, onClose }: { cobranca: Cobranca; companyName: string; onClose: () => void }) {
  function imprimir() {
    window.print();
  }

  const recebimento = cobranca.paidMethod ?? cobranca.method;

  return (
    <Modal
      title={<>Cobrança <span className={"status-pill " + STATUS_CLASSE[cobranca.status]}>{STATUS_ROTULO[cobranca.status]}</span></>}
      label={"Detalhe da cobrança " + cobranca.number}
      subtitle={"#" + cobranca.number + " · " + (cobranca.clientName ?? "Cliente não informado") + " · " + formatDateTime(cobranca.createdAt)}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <span className="nx-modal-hint">O impresso leva a forma de receber escolhida na cobrança.</span>
          <div className="nx-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
            <button type="button" className="btn btn-ghost" onClick={imprimir}>Imprimir</button>
          </div>
        </>
      }
    >
      {/* O documento é o que vai para o papel: tudo fora dele some na impressão. */}
      <div className="nx-cb-doc">
        <header className="nx-cb-doc-cabeca">
          <div>
            <p className="nx-cb-empresa">{companyName}</p>
            <h3 className="nx-cb-numero">Cobrança #{cobranca.number}</h3>
            <p className="nx-cb-titulo">{cobranca.title}</p>
          </div>
          <p className="nx-cb-situacao">
            <span className={"status-pill " + STATUS_CLASSE[cobranca.status]}>{STATUS_ROTULO[cobranca.status]}</span>
            {cobranca.overdue ? <span className="status-pill is-cb-overdue">Vencida</span> : null}
          </p>
        </header>

        <dl className="kv">
          <div><dt>Cliente</dt><dd>{cobranca.clientName ?? "—"}</dd></div>
          <div><dt>Documento</dt><dd>{referenciaDoDocumento(cobranca)}</dd></div>
          <div><dt>Emissão</dt><dd className="mono">{formatDate(cobranca.createdAt)}</dd></div>
          <div><dt>Vencimento</dt><dd className="mono">{diaLegivel(cobranca.dueDateLabel)}</dd></div>
          <div><dt>Valor</dt><dd className="mono">{formatCurrency(cobranca.amount)}</dd></div>
          <div><dt>Cobrança aberta por</dt><dd>{cobranca.createdByName ?? "—"}</dd></div>
        </dl>

        {cobranca.method === "PIX" && cobranca.pixKey ? (
          <div className="nx-cb-receber">
            <h4 className="nx-cb-titulo-secao">Como pagar</h4>
            <p className="nx-cb-linha"><span>Receber pelo PIX</span><strong className="mono">{cobranca.pixKey}</strong></p>
            {cobranca.pixKeyType ? <p className="nx-cb-linha"><span>Tipo da chave</span><strong>{TIPO_CHAVE_ROTULO[cobranca.pixKeyType]}</strong></p> : null}
          </div>
        ) : (
          <div className="nx-cb-receber">
            <h4 className="nx-cb-titulo-secao">Como pagar</h4>
            <p className="nx-cb-linha"><span>Forma combinada</span><strong>{METODO_ROTULO[cobranca.method]}</strong></p>
            {cobranca.instructions ? <p className="nx-cb-instrucoes">{cobranca.instructions}</p> : null}
          </div>
        )}

        {cobranca.status === "PAID" ? (
          <div className="nx-cb-recibo">
            <h4 className="nx-cb-titulo-secao">Recibo de pagamento</h4>
            {/* O recibo de balcão fala do dia em que o dinheiro entrou, não da hora
                em que alguém abriu o sistema: um recebimento escrito na segunda sobre
                o sexta tem meia-noite no instante, e "00:00" num papel entregue ao
                cliente seria lido como erro de relógio. A hora exata do registro fica
                na auditoria. */}
            <p className="nx-cb-linha"><span>Recebido em</span><strong className="mono">{cobranca.paidAt ? formatDate(cobranca.paidAt) : "—"}</strong></p>
            <p className="nx-cb-linha"><span>Forma</span><strong>{METODO_ROTULO[recebimento]}</strong></p>
            <p className="nx-cb-linha"><span>Registrado por</span><strong>{cobranca.paidByName ?? "—"}</strong></p>
            <p className="nx-cb-linha"><span>Valor recebido</span><strong className="mono">{formatCurrency(cobranca.amount)}</strong></p>
            {cobranca.paymentNote ? <p className="nx-cb-motivo">{cobranca.paymentNote}</p> : null}
          </div>
        ) : null}

        {cobranca.status === "CANCELLED" ? (
          <div className="nx-cb-recibo">
            <h4 className="nx-cb-titulo-secao">Cancelada</h4>
            <p className="nx-cb-linha"><span>Cancelada em</span><strong className="mono">{cobranca.cancelledAt ? formatDateTime(cobranca.cancelledAt) : "—"}</strong></p>
            <p className="nx-cb-linha"><span>Por</span><strong>{cobranca.cancelledByName ?? "—"}</strong></p>
            {cobranca.cancelReason ? <p className="nx-cb-motivo">{cobranca.cancelReason}</p> : null}
          </div>
        ) : null}

        <p className="nx-cb-assinatura">Recebido do cliente: ______________________________</p>
      </div>
    </Modal>
  );
}

// ---- Gateways: o catálogo e a escrita do MANUAL ----

function PainelGateways() {
  const { can } = useAuth();
  const podeEscrever = can("settings:write");
  const [linhas, setLinhas] = useState<GatewayLinha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    setErro(null);
    api.get<{ data: GatewayLinha[] }>("/gateways", { params: { _: recarga } })
      .then(({ data }) => { if (vivo) setLinhas(data.data); })
      .catch((e) => { if (vivo) setErro(extractErrorMessage(e)); });
    return () => { vivo = false; };
  }, [recarga]);

  return (
    <div className="card-surface panel">
      <h2 className="nx-panel-title">Como a empresa recebe dinheiro</h2>
      <p className="nx-panel-sub">
        O catálogo é fixo: o que está disponível pode ser configurado hoje, e o que ainda não tem integração diz por
        que está fora. Nenhum lugar desta tela guarda chave de acesso de terceiros.
      </p>

      {erro ? <ErrorState message={erro} onRetry={() => setRecarga((n) => n + 1)} /> : null}
      {!linhas && !erro ? <LoadingInline label="Carregando provedores…" /> : null}

      {linhas ? (
        <div className="nx-gw-lista">
          {linhas.map((g) => (
            <CartaoGateway key={g.provider} gateway={g} podeEscrever={podeEscrever} onSalvo={() => setRecarga((n) => n + 1)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CartaoGateway({ gateway, podeEscrever, onSalvo }: { gateway: GatewayLinha; podeEscrever: boolean; onSalvo: () => void }) {
  const [apelido, setApelido] = useState(gateway.displayName ?? "");
  const [tipoChave, setTipoChave] = useState<TipoChave>(gateway.pixKeyType ?? "CNPJ");
  const [chave, setChave] = useState(gateway.pixKey ?? "");
  const [beneficiario, setBeneficiario] = useState(gateway.beneficiaryName ?? "");
  const [instrucoes, setInstrucoes] = useState(gateway.instructions ?? "");
  const [dias, setDias] = useState(gateway.defaultDueDays === null ? "" : String(gateway.defaultDueDays));
  const [ligado, setLigado] = useState(gateway.active);
  const [gravando, setGravando] = useState(false);
  const sujo = useDirty({ apelido, tipoChave, chave, beneficiario, instrucoes, dias, ligado });

  // A linha vem do servidor na ordem do catálogo; o que não tem integração não
  // ganha formulário — ganha explicação.
  if (!gateway.available) {
    return (
      <div className="nx-gw-card nx-gw-card--off">
        <h3 className="nx-gw-titulo">{gateway.rotulo}</h3>
        <p className="nx-gw-situacao">Fora do ar</p>
        <p className="nx-gw-motivo">{gateway.motivoIndisponivel ?? "Sem integração neste produto."}</p>
      </div>
    );
  }

  async function salvar() {
    if (chave.trim() !== "" && !tipoChave) { notify.error("Escolha o tipo da chave PIX."); return; }
    const corpo: Record<string, unknown> = {
      environment: "PRODUCTION",
      displayName: apelido.trim() || undefined,
      active: ligado,
      pixKeyType: chave.trim() ? tipoChave : undefined,
      pixKey: chave.trim() || undefined,
      beneficiaryName: beneficiario.trim() || undefined,
      instructions: instrucoes.trim() || undefined,
      defaultDueDays: dias.trim() === "" ? undefined : Math.trunc(valorNumerico(dias)),
    };
    setGravando(true);
    try {
      await api.put("/gateways/" + gateway.slug, corpo);
      notify.success("Configuração de recebimento salva.");
      onSalvo();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setGravando(false);
    }
  }

  return (
    <div className="nx-gw-card">
      <h3 className="nx-gw-titulo">{gateway.rotulo}</h3>
      <p className="nx-gw-situacao">{gateway.configured ? "Configurado" : "Disponível, ainda sem configuração"}</p>

      <div className="nx-cb-grade">
        <div className="field">
          <label className="field-label" htmlFor="gw-apelido">Apelido do recebimento</label>
          <input id="gw-apelido" className="input" maxLength={80} value={apelido} onChange={(e) => setApelido(e.target.value)} placeholder="PIX da loja" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="gw-tipo">Tipo da chave PIX</label>
          <select id="gw-tipo" className="select" value={tipoChave} onChange={(e) => setTipoChave(e.target.value as TipoChave)}>
            {(Object.keys(TIPO_CHAVE_ROTULO) as TipoChave[]).map((t) => <option key={t} value={t}>{TIPO_CHAVE_ROTULO[t]}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="gw-chave">Chave PIX</label>
          <input id="gw-chave" className="input" maxLength={255} value={chave} onChange={(e) => setChave(e.target.value)} placeholder={exemploDeChave(tipoChave)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="gw-benef">Nome do beneficiário</label>
          <input id="gw-benef" className="input" maxLength={120} value={beneficiario} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Como aparece na conta" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="gw-dias">Vencimento padrão (dias)</label>
          <input id="gw-dias" className="input" inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} placeholder="ex.: 7" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="gw-ligado">Recebimento ligado</label>
          <input id="gw-ligado" className="input" type="checkbox" style={{ maxWidth: 40 }} checked={ligado} onChange={(e) => setLigado(e.target.checked)} />
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="gw-instrucoes">Instruções de pagamento</label>
        <textarea id="gw-instrucoes" className="input" rows={2} maxLength={500} value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} placeholder="O texto que sai no impresso de toda cobrança pelo PIX" />
      </div>

      <div className="toolbar" style={{ marginTop: "0.6rem" }}>
        <button type="button" className="btn btn-brand" onClick={() => void salvar()} disabled={!podeEscrever || gravando}>
          {gravando ? "Salvando…" : "Salvar configuração"}
        </button>
        {!podeEscrever ? <span className="toolbar-note">Só o administrador muda a forma de receber.</span> : null}
        {podeEscrever ? <span className="toolbar-note">{sujo ? "As alterações ainda não foram gravadas." : "Nada foi alterado."}</span> : null}
      </div>
      <p className="form-note">
        A chave PIX é o endereço de recebimento da empresa: ela aparece no impresso da cobrança, e o valor fica fora
        da trilha de auditoria — quem lê a trilha vê o tipo que mudou, não a chave.
      </p>
    </div>
  );
}
