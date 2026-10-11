import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { MODAL_COPY, modalTitle, notice } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { formatCurrency, formatDate, formatDateTime } from "../lib/format";
import { lerNumero } from "../lib/money";
import { descricaoDaAcao } from "../lib/auditLabels";

type LeadStatus = "NEW" | "CONTACTED" | "PROPOSAL" | "WON" | "LOST";

interface LeadRow {
  id: string; name: string; email: string | null; phone: string | null;
  source: string | null; status: LeadStatus; value: number; notes: string | null;
  clientName: string | null; userName: string | null; createdAt: string; updatedAt: string;
}
interface Stage { status: LeadStatus; count: number; value: number }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

// Campos exatos de crm() em apps/api/src/modules/reports/reports.service.ts.
interface OrigemItem { origem: string; quantidade: number; valor: number; participacao: number }
interface StatusItem { status: string; quantidade: number; valor: number; participacao: number }
interface CrmRelatorio { total: number; origem: OrigemItem[]; status: StatusItem[]; diasMediosFechamento: number | null }

// Trilha de auditoria dos leads (GET /audit?entity=lead).
interface AuditLead {
  id: string; action: string; entity: string; entityId: string | null;
  ip: string | null; createdAt: string; userName: string | null; userEmail: string | null;
  metadata?: {
    leadName?: string | null;
    de?: string;
    para?: string;
    alteracoes?: string[];
    valor?: { de: number; para: number } | null;
  } | null;
}

// Texto do historico: o codigo da auditoria vira frase de negocio, e os
// metadados do servidor dizem o que mudou (estagio, valor, contato).
function descricaoDoEvento(r: AuditLead): { titulo: string; detalhe: string | null; lead: string } {
  const meta = r.metadata ?? {};
  const partes: string[] = [];
  if (meta.de && meta.para) partes.push("de " + rotuloStatus(meta.de) + " para " + rotuloStatus(meta.para));
  if (meta.alteracoes && meta.alteracoes.length > 0) partes.push("ajustou " + meta.alteracoes.join(", "));
  if (meta.valor) partes.push("valor foi para " + formatCurrency(meta.valor.para));
  return {
    titulo: descricaoDaAcao(r.action, r.entity),
    detalhe: partes.length > 0 ? partes.join(" · ") : null,
    lead: meta.leadName ?? (r.entityId ? "lead " + r.entityId.slice(0, 8) : "—"),
  };
}

// Rotulos e cores do funil. O backend decide o estagio inicial (Novo) e converte
// em cliente quando o lead passa a Ganho.
const STAGES: { status: LeadStatus; label: string; hint: string; tone: string }[] = [
  { status: "NEW", label: "Novo", hint: "ainda não contatado", tone: "is-new" },
  { status: "CONTACTED", label: "Contatado", hint: "já está em conversa", tone: "is-contact" },
  { status: "PROPOSAL", label: "Proposta", hint: "aguardando decisão", tone: "is-proposal" },
  { status: "WON", label: "Ganho", hint: "virou cliente", tone: "is-won" },
  { status: "LOST", label: "Perdido", hint: "sem negócio agora", tone: "is-lost" },
];

const SOURCES = ["Indicação", "Site", "Instagram", "Facebook", "WhatsApp", "Google", "Evento", "Outros"];

const stageInfo = (status: LeadStatus) => STAGES.find((s) => s.status === status) ?? STAGES[0];
const rotuloStatus = (status: string) => STAGES.find((s) => s.status === status)?.label ?? status;

// Portugues correto: "1 lead aguardando", "3 leads aguardando".
const plural = (n: number, um: string, muitos: string) => n + " " + (n === 1 ? um : muitos);

const ABAS: TabItem[] = [
  { id: "funil", label: "Funil de Vendas", hint: "Pipeline por estágio e mudança de estágio" },
  { id: "leads", label: "Leads", hint: "Lista com busca, filtros e cadastro" },
  { id: "atividades", label: "Atividades", hint: "Análise de leads e histórico de auditoria" },
];

// Módulo CRM em três abas: funil (visualização por estágio), leads (operação da
// lista) e atividades (análise do relatório + trilha de auditoria dos leads).
export function CRM() {
  const { can } = useAuth();
  const { active, onSelect } = useTabState(ABAS, "funil");
  const podeAuditoria = can("audit:read");

  const [rows, setRows] = useState<Paged<LeadRow> | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeadRow | "new" | null>(null);
  const [detail, setDetail] = useState<LeadRow | null>(null);

  // Dados de análise (aba Atividades): buscados apenas com a aba ativa.
  const [relatorio, setRelatorio] = useState<CrmRelatorio | null>(null);
  const [relLoading, setRelLoading] = useState(true);
  const [relError, setRelError] = useState<string | null>(null);
  const [actPage, setActPage] = useState(1);
  const [actSize, setActSize] = useState(PAGE_SIZE_PADRAO);
  const [actRows, setActRows] = useState<Paged<AuditLead> | null>(null);
  const [actLoading, setActLoading] = useState(true);
  const [actError, setActError] = useState<string | null>(null);

  const loadPipeline = useCallback(async () => {
    try {
      const { data } = await api.get<Stage[]>("/leads/pipeline");
      setStages(data);
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Paged<LeadRow>>("/leads", {
        params: { page, pageSize, search: search || undefined, status: status || undefined },
      });
      setRows(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);

  const loadCrmRelatorio = useCallback(async () => {
    setRelLoading(true);
    setRelError(null);
    try {
      const { data } = await api.get<CrmRelatorio>("/reports/crm");
      setRelatorio(data);
    } catch (err) {
      setRelError(extractErrorMessage(err));
    } finally {
      setRelLoading(false);
    }
  }, [active]);

  const loadAudit = useCallback(async () => {
    setActLoading(true);
    setActError(null);
    try {
      const { data } = await api.get<Paged<AuditLead>>("/audit", {
        params: { page: actPage, pageSize: actSize, entity: "lead" },
      });
      setActRows(data);
    } catch (err) {
      setActError(extractErrorMessage(err));
    } finally {
      setActLoading(false);
    }
  }, [actPage, actSize, active]);

  useEffect(() => {
    if (active === "funil") void loadPipeline();
  }, [active, loadPipeline]);

  useEffect(() => {
    if (active === "leads") void loadLeads();
  }, [active, loadLeads]);

  useEffect(() => {
    if (active !== "atividades") return;
    void loadCrmRelatorio();
    if (podeAuditoria) void loadAudit();
  }, [active, podeAuditoria, loadCrmRelatorio, loadAudit]);

  async function moveStage(lead: LeadRow, next: LeadStatus) {
    if (lead.status === next) return;
    if (next === "WON") {
      const confirmado = await confirmAction({
        title: "Marcar como ganho",
        text: "{nome} vira cliente da empresa ativa. Confirma?",
        nome: lead.name,
        detalhe: "O lead sai do funil como ganho e entra na carteira de clientes; o valor estimado fecha o negócio no pipeline.",
        confirmLabel: "Ganhou o negócio",
      });
      if (!confirmado) return;
    }
    if (next === "LOST") {
      const confirmado = await confirmAction({
        title: "Marcar como perdido",
        text: "Deseja realmente marcar {nome} como perdido?",
        nome: lead.name,
        detalhe: "Ele sai do funil e do valor aberto. Você pode reabri-lo depois, sem perder o histórico.",
        confirmLabel: "Perdido",
        danger: true,
      });
      if (!confirmado) return;
    }
    try {
      const { data } = await api.patch<LeadRow>("/leads/" + lead.id + "/status", { status: next });
      notify.success("Lead movido para " + stageInfo(next).label.toLowerCase() + ".");
      setDetail((atual) => (atual && atual.id === data.id ? data : atual));
      void loadPipeline();
      void loadLeads();
      if (active === "atividades") void loadAudit();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    }
  }

  const abertos = stages.filter((s) => s.status !== "WON" && s.status !== "LOST");
  const valorAberto = abertos.reduce((t, s) => t + s.value, 0);
  const leadsAbertos = abertos.reduce((t, s) => t + s.count, 0);
  const ganhos = stages.find((s) => s.status === "WON")?.count ?? 0;
  const perdidos = stages.find((s) => s.status === "LOST")?.count ?? 0;
  const decididos = ganhos + perdidos;
  const conversao = decididos > 0 ? Math.round((ganhos / decididos) * 100) : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">CRM</h1>
          <p className="page-sub">Funil de leads da empresa ativa</p>
        </div>
        {can("crm:write") ? (
          <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo lead</button>
        ) : null}
      </div>

      <Tabs
        tabs={ABAS}
        active={active}
        onSelect={(id) => { setPage(1); setActPage(1); onSelect(id); }}
        ariaLabel="Seções do CRM"
      />

      {/* ---- Aba Funil de Vendas ---- */}
      <TabPanel id="funil" active={active}>
        <div className="kpi-grid">
          <div className="kpi card-surface">
            <span className="kpi-label">Em aberto</span>
            <div className="kpi-value mono">{formatCurrency(valorAberto)}</div>
            <span className="kpi-hint">{plural(leadsAbertos, "lead", "leads")} aguardando fechamento</span>
          </div>
          <div className="kpi card-surface">
            <span className="kpi-label">Ganhos</span>
            <div className="kpi-value">{ganhos}</div>
            <span className="kpi-hint">clientes vindos do funil</span>
          </div>
          <div className="kpi card-surface">
            <span className="kpi-label">Perdidos</span>
            <div className="kpi-value">{perdidos}</div>
            <span className="kpi-hint">fora do funil por enquanto</span>
          </div>
          <div className="kpi card-surface">
            <span className="kpi-label">Conversão</span>
            <div className="kpi-value">{conversao}%</div>
            <span className="kpi-hint">{decididos > 0 ? "de " + decididos + " leads decididos" : "nenhum lead decidido ainda"}</span>
          </div>
        </div>

        <div className="pipeline-grid" role="group" aria-label="Estágios do funil">
          {STAGES.map((stage) => {
            const dado = stages.find((s) => s.status === stage.status);
            const ativo = status === stage.status;
            return (
              <button
                key={stage.status}
                type="button"
                className={"pipeline-card " + stage.tone + (ativo ? " is-active" : "")}
                aria-pressed={ativo}
                title={ativo ? "Mostrar todos os estágios" : "Ver apenas " + stage.label}
                onClick={() => {
                  setStatus(ativo ? "" : stage.status);
                  setPage(1);
                }}
              >
                <span className="pipeline-top">
                  <span className="pipeline-label">{stage.label}</span>
                  <span className="pipeline-count">{dado?.count ?? 0}</span>
                </span>
                <span className="pipeline-value mono">{formatCurrency(dado?.value ?? 0)}</span>
                <span className="pipeline-hint">{stage.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="nx-panel-sub">Selecione um estágio para filtrar os leads na aba Leads.</p>
      </TabPanel>

      {/* ---- Aba Leads ---- */}
      <TabPanel id="leads" active={active}>
        <div className="toolbar">
          <input
            className="input"
            type="search"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Buscar leads"
          />
          <select
            className="select"
            style={{ maxWidth: 220 }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filtrar por estágio"
          >
            <option value="">Todos os estágios</option>
            {STAGES.map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
          </select>
          {status ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStatus(""); setPage(1); }}>
              Limpar filtro
            </button>
          ) : null}
        </div>

        {loading ? (
          <LoadingInline label="Carregando leads…" />
        ) : error ? (
          <ErrorState message={error} onRetry={loadLeads} />
        ) : rows && rows.data.length > 0 ? (
          <div className="card-surface table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Lead</th>
                  <th scope="col">Origem</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Estágio</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Criado</th>
                  {can("crm:write") ? <th scope="col" className="col-acoes">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.data.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <button type="button" className="lead-link" onClick={() => setDetail(lead)}>
                        {lead.name}
                      </button>
                      <span className="lead-contact">
                        {lead.email ?? lead.phone ?? "sem contato registrado"}
                      </span>
                    </td>
                    <td>{lead.source ?? "—"}</td>
                    <td className="mono">{formatCurrency(lead.value)}</td>
                    <td>
                      <span className={"status-pill " + stageInfo(lead.status).tone}>
                        {stageInfo(lead.status).label}
                      </span>
                    </td>
                    <td>{lead.userName ?? "—"}</td>
                    <td className="mono">{formatDate(lead.createdAt)}</td>
                    {can("crm:write") ? (
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(lead)}>Editar</button>
                          <select
                            className="select select-sm"
                            value={lead.status}
                            aria-label={"Mudar estágio de " + lead.name}
                            onChange={(e) => void moveStage(lead, e.target.value as LeadStatus)}
                          >
                            {STAGES.map((s) => <option key={s.status} value={s.status}>{s.label}</option>)}
                          </select>
                        </div>
                      </td>
                    ) : null}
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
              itemLabel="leads"
              itemLabelSingular="lead"
            />
          </div>
        ) : (
          <EmptyState
            title={status || search ? "Nenhum lead neste filtro" : "Nenhum lead no funil ainda"}
            description={can("crm:write") ? "Registre o primeiro contato e acompanhe até o fechamento." : "Ajuste a busca ou o estágio."}
            action={can("crm:write") && !status && !search ? (
              <button type="button" className="btn btn-brand" onClick={() => setEditing("new")}>Novo lead</button>
            ) : undefined}
          />
        )}
      </TabPanel>

      {/* ---- Aba Atividades ---- */}
      <TabPanel id="atividades" active={active}>
        <div className="nx-split">
          <div className="card-surface panel">
            <h2 className="nx-panel-title">Origem e status dos leads</h2>
            <p className="nx-panel-sub">Números calculados sobre todos os leads da empresa ativa.</p>
            {relLoading ? (
              <LoadingInline label="Carregando a análise…" />
            ) : relError ? (
              <ErrorState message={relError} onRetry={loadCrmRelatorio} />
            ) : relatorio ? (
              <>
                <div className="kpi-grid">
                  <div className="kpi card-surface">
                    <span className="kpi-label">Total de leads</span>
                    <div className="kpi-value">{relatorio.total}</div>
                    <span className="kpi-hint">em todas as origens</span>
                  </div>
                  <div className="kpi card-surface">
                    <span className="kpi-label">Tempo médio de fechamento</span>
                    <div className="kpi-value">{relatorio.diasMediosFechamento === null ? "—" : relatorio.diasMediosFechamento}</div>
                    <span className="kpi-hint">{relatorio.diasMediosFechamento === null ? "sem leads fechados ainda" : plural(relatorio.diasMediosFechamento, "dia", "dias")}</span>
                  </div>
                </div>

                <div className="nx-panel-title" style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>Por origem</div>
                {relatorio.origem.length === 0 ? (
                  <p className="nx-panel-sub" style={{ margin: "0.4rem 0 0" }}>Nenhuma origem informada.</p>
                ) : (
                  <ul className="nx-distrib">
                    {relatorio.origem.map((o) => (
                      <li key={o.origem} className="nx-distrib-row">
                        <span className="nx-distrib-label" title={o.origem}>{o.origem}</span>
                        <span className="nx-distrib-track">
                          <span className="nx-distrib-fill" style={{ width: Math.max(2, Math.min(100, o.participacao)) + "%" }} />
                        </span>
                        <span className="nx-distrib-value">{formatCurrency(o.valor)} · {plural(o.quantidade, "lead", "leads")}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="nx-panel-title" style={{ fontSize: "0.85rem", marginTop: "0.9rem" }}>Por estágio</div>
                {relatorio.status.length === 0 ? (
                  <p className="nx-panel-sub" style={{ margin: "0.4rem 0 0" }}>Nenhum lead cadastrado.</p>
                ) : (
                  <ul className="nx-distrib">
                    {relatorio.status.map((s) => (
                      <li key={s.status} className="nx-distrib-row">
                        <span className="nx-distrib-label" title={rotuloStatus(s.status)}>{rotuloStatus(s.status)}</span>
                        <span className="nx-distrib-track">
                          <span className="nx-distrib-fill" style={{ width: Math.max(2, Math.min(100, s.participacao)) + "%" }} />
                        </span>
                        <span className="nx-distrib-value">{formatCurrency(s.valor)} · {plural(s.quantidade, "lead", "leads")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <EmptyState title="Sem dados de análise" description="Cadastre leads para vê-los aqui." />
            )}
          </div>

          <div className="card-surface panel">
            <h2 className="nx-panel-title">Histórico de alterações</h2>
            <p className="nx-panel-sub">
              Trilha de auditoria dos leads: quem alterou, o que mudou e quando. Cada linha traduz a operação para a linguagem do negócio.
            </p>
            {!podeAuditoria ? (
              <EmptyState title="Sem permissão para o histórico" description="Seu perfil não tem acesso à trilha de auditoria." />
            ) : actLoading ? (
              <LoadingInline label="Carregando o histórico…" />
            ) : actError ? (
              <ErrorState message={actError} onRetry={loadAudit} />
            ) : actRows && actRows.data.length > 0 ? (
              <div className="table-wrap nx-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Quem</th>
                      <th scope="col" className="col-acao">O que fez</th>
                      <th scope="col">Lead</th>
                      <th scope="col" className="col-quando">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actRows.data.map((r) => {
                      const evento = descricaoDoEvento(r);
                      return (
                        <tr key={r.id}>
                          <td>
                            <span className="company-name">{r.userName ?? "Sistema"}</span>
                            <span className="company-meta">{r.userEmail ?? "—"}</span>
                          </td>
                          <td className="col-acao">
                            <span className="company-name">{evento.titulo}</span>
                            {evento.detalhe ? <span className="company-meta">{evento.detalhe}</span> : null}
                          </td>
                          <td>{evento.lead}</td>
                          <td className="mono col-quando">{formatDateTime(r.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Pagination
                  page={actRows.meta.page}
                  pageSize={actRows.meta.pageSize}
                  total={actRows.meta.total}
                  totalPages={actRows.meta.totalPages}
                  onChange={setActPage}
                  onPageSizeChange={(n) => { setActSize(n); setActPage(1); }}
                  itemLabel="eventos"
                  itemLabelSingular="evento"
                />
              </div>
            ) : (
              <EmptyState title="Nenhuma alteração registrada" description="As mudanças feitas nos leads aparecerão aqui." />
            )}
          </div>
        </div>
      </TabPanel>

      {editing ? (
        <LeadModal
          lead={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void loadPipeline(); void loadLeads(); }}
        />
      ) : null}
      {detail ? (
        <LeadDetail
          lead={detail}
          canWrite={can("crm:write")}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditing(detail); setDetail(null); }}
          onMove={(next) => void moveStage(detail, next)}
        />
      ) : null}
    </div>
  );
}

function LeadModal({ lead, onClose, onSaved }: { lead: LeadRow | "new"; onClose: () => void; onSaved: () => void }) {
  // Um so guarda: null = cadastro novo, objeto = edicao do lead recebido.
  const atual: LeadRow | null = lead === "new" ? null : lead;
  const isNew = atual === null;
  const [form, setForm] = useState({
    name: atual?.name ?? "",
    email: atual?.email ?? "",
    phone: atual?.phone ?? "",
    source: atual?.source ?? "",
    value: atual ? String(atual.value) : "",
    notes: atual?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const dirty = useDirty(form);
  const set = (campo: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [campo]: e.target.value });

  async function submit() {
    if (form.name.trim().length < 2) {
      notify.error("Informe o nome do lead (mínimo de 2 caracteres).");
      return;
    }
    setBusy(true);
    // Vazio nao é enviado: a API trata ausente e string vazia de formas diferentes.
    const payload: Record<string, unknown> = {};
    for (const [campo, valor] of Object.entries(form)) {
      const limpo = String(valor).trim();
      if (limpo !== "") payload[campo] = limpo;
    }
    // O valor do lead sai como número quando o texto é número — inclusive no
    // formato com ponto de milhar. Quando não é, fica o texto digitado e a porta
    // da API devolve a mensagem do próprio campo; trocar lixo por zero gravaria
    // um lead "sem valor" que ninguém pediu.
    if (typeof payload.value === "string") {
      const lido = lerNumero(payload.value);
      if (lido !== null) payload.value = lido;
    }
    try {
      if (atual === null) {
        await api.post("/leads", payload);
        notify.success(notice("lead", "created"));
      } else {
        await api.patch("/leads/" + atual.id, payload);
        notify.success(notice("lead", "updated"));
      }
      onSaved();
    } catch (err) {
      notify.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={modalTitle("lead", isNew)}
      subtitle={atual === null ? "Quem pode virar cliente da empresa ativa." : atual.name + " · " + stageInfo(atual.status).label}
      onClose={onClose}
      onSubmit={() => void submit()}
      busy={busy}
      dirty={dirty}
      hint={MODAL_COPY.requiredHint}
      submitLabel={isNew ? "Cadastrar" : "Salvar"}
    >
      <div className="field">
        <label className="field-label" htmlFor="lead-name">Nome *</label>
        <input id="lead-name" className="input" value={form.name} onChange={set("name")} data-autofocus placeholder="Quem é o contato?" />
      </div>
      <div className="field-grid">
        <div className="field">
          <label className="field-label" htmlFor="lead-email">E-mail</label>
          <input id="lead-email" className="input" type="email" value={form.email} onChange={set("email")} placeholder="nome@empresa.com" />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lead-phone">Telefone</label>
          <input id="lead-phone" className="input" value={form.phone} onChange={set("phone")} placeholder="(11) 90000-0000" />
        </div>
      </div>
      <div className="field-grid">
        <div className="field">
          <label className="field-label" htmlFor="lead-source">Origem</label>
          <select id="lead-source" className="select" value={form.source} onChange={set("source")}>
            <option value="">Não informada</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="lead-value">Valor estimado (R$)</label>
          <input id="lead-value" className="input mono" type="number" min="0" step="0.01" value={form.value} onChange={set("value")} placeholder="0,00" />
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="lead-notes">Observações</label>
        <textarea id="lead-notes" className="input" rows={3} value={form.notes} onChange={set("notes")} placeholder="O que foi combinado neste contato?" />
      </div>
      {isNew ? (
        <p className="form-note">O lead entra no funil como <strong>Novo</strong>. Mude o estágio pela tela do CRM.</p>
      ) : null}
    </Modal>
  );
}

function LeadDetail({ lead, canWrite, onClose, onEdit, onMove }: {
  lead: LeadRow;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onMove: (next: LeadStatus) => void;
}) {
  const info = stageInfo(lead.status);
  return (
    <Modal
      title={lead.name}
      label={"Detalhe do lead " + lead.name}
      subtitle={
        <>
          <span className={"status-pill " + info.tone}>{info.label}</span>{" "}
          <span className="mono">{formatCurrency(lead.value)}</span> · {info.hint}
        </>
      }
      size="md"
      onClose={onClose}
      hint={canWrite ? "Mudar de estágio registra o movimento na auditoria." : "Seu perfil visualiza o funil, sem alterar."}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Fechar</button>
          {canWrite ? (
            <button type="button" className="btn btn-ghost" onClick={onEdit}>Editar dados</button>
          ) : null}
          {canWrite ? (
            <button
              type="button"
              className="btn btn-brand"
              onClick={() => onMove("WON")}
              disabled={lead.status === "WON"}
            >
              Ganhou o negócio
            </button>
          ) : null}
        </>
      }
    >
      <dl className="kv">
        <div><dt>E-mail</dt><dd className="mono">{lead.email ?? "—"}</dd></div>
        <div><dt>Telefone</dt><dd className="mono">{lead.phone ?? "—"}</dd></div>
        <div><dt>Origem</dt><dd>{lead.source ?? "—"}</dd></div>
        <div><dt>Valor estimado</dt><dd className="mono">{formatCurrency(lead.value)}</dd></div>
        <div><dt>Responsável</dt><dd>{lead.userName ?? "—"}</dd></div>
        <div><dt>Criado em</dt><dd className="mono">{formatDate(lead.createdAt)}</dd></div>
        <div><dt>Atualizado em</dt><dd className="mono">{formatDate(lead.updatedAt)}</dd></div>
        {lead.clientName ? <div><dt>Cliente</dt><dd>{lead.clientName}</dd></div> : null}
      </dl>
      <div className="field">
        <span className="field-label">Observações</span>
        <p className="lead-notes">{lead.notes ?? "Nenhuma anotação neste lead."}</p>
      </div>
      {canWrite ? (
        <div className="pipeline-move">
          <span className="field-label">Mover para</span>
          <div className="stage-buttons">
            {STAGES.map((s) => (
              <button
                key={s.status}
                type="button"
                className={"btn btn-sm " + (s.status === lead.status ? "btn-brand" : "btn-ghost")}
                disabled={s.status === lead.status}
                onClick={() => onMove(s.status)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
