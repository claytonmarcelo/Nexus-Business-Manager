import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { MODAL_COPY, modalTitle, notice } from "../lib/uiCopy";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { formatCurrency, formatDate } from "../lib/format";

type LeadStatus = "NEW" | "CONTACTED" | "PROPOSAL" | "WON" | "LOST";

interface LeadRow {
  id: string; name: string; email: string | null; phone: string | null;
  source: string | null; status: LeadStatus; value: number; notes: string | null;
  clientName: string | null; userName: string | null; createdAt: string; updatedAt: string;
}
interface Stage { status: LeadStatus; count: number; value: number }
interface Paged<T> { data: T[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }

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

// Portugues correto: "1 lead aguardando", "3 leads aguardando".
const plural = (n: number, um: string, muitos: string) => n + " " + (n === 1 ? um : muitos);

// Modulo CRM: funil com valor por estagio, filtro por etapa e mudanca de
// estagio com confirmacao SweetAlert2 (nunca alert nativo).
export function CRM() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Paged<LeadRow> | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeadRow | "new" | null>(null);
  const [detail, setDetail] = useState<LeadRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, pipe] = await Promise.all([
        api.get<Paged<LeadRow>>("/leads", {
          params: { page, pageSize: 10, search: search || undefined, status: status || undefined },
        }),
        api.get<Stage[]>("/leads/pipeline"),
      ]);
      setRows(list.data);
      setStages(pipe.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveStage(lead: LeadRow, next: LeadStatus) {
    if (lead.status === next) return;
    if (next === "WON") {
      const confirmado = await confirmAction({
        title: "Marcar como ganho",
        text: lead.name + " vira cliente da empresa ativa. Confirma?",
        confirmLabel: "Ganhou o negócio",
      });
      if (!confirmado) return;
    }
    if (next === "LOST") {
      const confirmado = await confirmAction({
        title: "Marcar como perdido",
        text: "O lead " + lead.name + " sai do funil. Você pode reabri-lo depois.",
        confirmLabel: "Perdido",
        danger: true,
      });
      if (!confirmado) return;
    }
    try {
      const { data } = await api.patch<LeadRow>("/leads/" + lead.id + "/status", { status: next });
      notify.success("Lead movido para " + stageInfo(next).label.toLowerCase() + ".");
      setDetail((atual) => (atual && atual.id === data.id ? data : atual));
      void load();
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

      <div className="kpi-grid">
        <div className="card-surface kpi">
          <span className="kpi-label">Em aberto</span>
          <div className="kpi-value mono">{formatCurrency(valorAberto)}</div>
          <span className="kpi-hint">{plural(leadsAbertos, "lead", "leads")} aguardando fechamento</span>
        </div>
        <div className="card-surface kpi">
          <span className="kpi-label">Ganhos</span>
          <div className="kpi-value">{ganhos}</div>
          <span className="kpi-hint">clientes vindos do funil</span>
        </div>
        <div className="card-surface kpi">
          <span className="kpi-label">Perdidos</span>
          <div className="kpi-value">{perdidos}</div>
          <span className="kpi-hint">fora do funil por enquanto</span>
        </div>
        <div className="card-surface kpi">
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
        <LoadingInline />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
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
                {can("crm:write") ? <th scope="col">Ações</th> : null}
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

      {editing ? (
        <LeadModal
          lead={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
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
    if (typeof payload.value === "string") payload.value = Number(payload.value.replace(",", "."));
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
          <div className="row-actions">
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
