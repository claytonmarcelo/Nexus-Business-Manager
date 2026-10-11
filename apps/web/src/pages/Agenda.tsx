import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { api, extractErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { Modal, useDirty } from "../components/Modal";
import { MODAL_COPY, modalTitle, notice } from "../lib/uiCopy";
import { ErrorState } from "../components/StateView";
import { formatDate, formatDateTime } from "../lib/format";

type EventoTipo = "MEETING" | "DELIVERY" | "FOLLOW_UP" | "OTHER";
type EventoEstado = "SCHEDULED" | "DONE" | "CANCELLED";
type Recorrencia = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

interface Evento {
  id: string; masterId: string; title: string; description: string | null; location: string | null;
  type: EventoTipo; status: EventoEstado; startAt: string; endAt: string | null; allDay: boolean;
  recorrencia: Recorrencia; recorrenciaAte: string | null;
  clientId: string | null; leadId: string | null;
  clientName: string | null; leadName: string | null; userName: string | null;
  recorrente: boolean; ocorrencia: number; meu: boolean;
}
interface Resumo { total: number; scheduled: number; done: number; cancelled: number }
interface Opcao { id: string; name: string }
interface Paged<T> { data: T[] }

const TIPOS: { value: EventoTipo; label: string; tone: string }[] = [
  { value: "MEETING", label: "Reunião", tone: "is-meeting" },
  { value: "DELIVERY", label: "Entrega", tone: "is-delivery" },
  { value: "FOLLOW_UP", label: "Acompanhamento", tone: "is-follow" },
  { value: "OTHER", label: "Outro", tone: "is-other" },
];

const ESTADOS: { value: EventoEstado; label: string; tone: string }[] = [
  { value: "SCHEDULED", label: "Agendado", tone: "is-scheduled" },
  { value: "DONE", label: "Concluído", tone: "is-done" },
  { value: "CANCELLED", label: "Cancelado", tone: "is-cancelled" },
];

const RECORRENCIAS: { value: Recorrencia; label: string; resumo: string }[] = [
  { value: "NONE", label: "Não repete", resumo: "só neste dia" },
  { value: "DAILY", label: "Diariamente", resumo: "todo dia" },
  { value: "WEEKLY", label: "Semanalmente", resumo: "toda semana no mesmo dia" },
  { value: "MONTHLY", label: "Mensalmente", resumo: "todo mês no mesmo dia" },
];

const tipoInfo = (v: EventoTipo) => TIPOS.find((t) => t.value === v) ?? TIPOS[0];
const estadoInfo = (v: EventoEstado) => ESTADOS.find((e) => e.value === v) ?? ESTADOS[0];
const recorrenciaInfo = (v: Recorrencia) => RECORRENCIAS.find((r) => r.value === v) ?? RECORRENCIAS[0];

const dois = (n: number) => String(n).padStart(2, "0");
// datetime-local e date trabalham no horario local do usuario.
const paraInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()) + "T" + dois(d.getHours()) + ":" + dois(d.getMinutes());
};
const paraDia = (iso: string | null) => (iso ? paraInput(iso).slice(0, 10) : "");
const aPartirDoInput = (valor: string, fimDoDia = false) =>
  valor ? new Date(valor.length === 10 ? valor + (fimDoDia ? "T23:59:00" : "T00:00:00") : valor).toISOString() : undefined;

const plural = (n: number, um: string, muitos: string) => n + " " + (n === 1 ? um : muitos);

// Modulo Agenda: calendario (FullCalendar 6) com visoes mes/semana/lista,
// compromisso por tipo e estado, vinculo com cliente/lead e recorrencia
// diaria, semanal ou mensal. A serie recorrente e expandida pelo backend.
export function Agenda() {
  const { can } = useAuth();
  const podeEscrever = can("agenda:write");
  const calendario = useRef<FullCalendar>(null);

  const [janela, setJanela] = useState<{ de: string; ate: string; rotulo: string } | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<{ evento: Evento | null; inicio: string | null } | null>(null);
  const [detalhe, setDetalhe] = useState<Evento | null>(null);
  const [clientes, setClientes] = useState<Opcao[]>([]);
  const [leads, setLeads] = useState<Opcao[]>([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const params = {
        from: janela?.de,
        to: janela?.ate,
        type: tipo || undefined,
        status: estado || undefined,
        search: busca.trim() || undefined,
      };
      const [lista, res] = await Promise.all([
        api.get<Evento[]>("/agenda/events", { params }),
        api.get<Resumo>("/agenda/summary", { params: { from: janela?.de, to: janela?.ate } }),
      ]);
      setEventos(lista.data);
      setResumo(res.data);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setCarregando(false);
    }
  }, [janela?.de, janela?.ate, tipo, estado, busca]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Clientes e leads apenas alimentam os seletores do formulario.
  useEffect(() => {
    if (!podeEscrever) return;
    void (async () => {
      try {
        const [c, l] = await Promise.all([
          api.get<Paged<Opcao>>("/clients", { params: { pageSize: 100 } }),
          api.get<Paged<Opcao>>("/leads", { params: { pageSize: 100, status: "NEW" } }),
        ]);
        setClientes(c.data.data);
        setLeads(l.data.data);
      } catch {
        setClientes([]);
        setLeads([]);
      }
    })();
  }, [podeEscrever]);

  function aoTrocarPeriodo(arg: DatesSetArg) {
    const de = arg.view.activeStart.toISOString();
    const ate = arg.view.activeEnd.toISOString();
    setJanela((atual) => (atual && atual.de === de && atual.ate === ate ? atual : { de, ate, rotulo: arg.view.title }));
  }

  function aoClicarNoDia(arg: DateClickArg) {
    if (!podeEscrever) return;
    setForm({ evento: null, inicio: arg.dateStr });
  }

  function aoClicarEvento(arg: EventClickArg) {
    const evento = eventos.find((e) => String(e.id) === String(arg.event.id));
    if (evento) setDetalhe(evento);
  }

  // Arrastar remarca o compromisso. Em serie recorrente o arrasto nao muda
  // apenas um dia (a serie inteira vive em um registro), entao devolvemos o evento.
  async function aoArrastar(arg: EventDropArg) {
    // O pacote de interacao tipa o evento como implementacao interna; o que
    // usamos aqui e a API publica (id, inicio, fim e revert).
    const ev = arg.event as unknown as { id: string; start: Date | null; end: Date | null; revert: () => void };
    const mestre = eventos.find((e) => String(e.id) === String(ev.id));
    if (!mestre) {
      ev.revert();
      return;
    }
    if (mestre.recorrente) {
      ev.revert();
      notify.info("Compromisso recorrente é remarcado na série inteira. Abra-o para ajustar.");
      return;
    }
    try {
      await api.patch("/agenda/events/" + mestre.masterId, {
        startAt: ev.start ? ev.start.toISOString() : mestre.startAt,
        ...(ev.end ? { endAt: ev.end.toISOString() } : {}),
      });
      notify.success("Compromisso remarcado.");
      void carregar();
    } catch (err) {
      ev.revert();
      notify.error(extractErrorMessage(err));
    }
  }

  async function mudarEstado(evento: Evento, proximo: EventoEstado) {
    const acao = proximo === "DONE" ? "concluído" : proximo === "CANCELLED" ? "cancelado" : "reaberto";
    await confirmAction({
      title: proximo === "DONE" ? "Concluir compromisso" : proximo === "CANCELLED" ? "Cancelar compromisso" : "Reabrir compromisso",
      text:
        (proximo === "DONE" ? "Marcar {nome}" : proximo === "CANCELLED" ? "Cancelar {nome}" : "Reabrir {nome}") +
        (evento.recorrente ? " na série inteira?" : "?"),
      nome: "“" + evento.title + "”",
      detalhe:
        formatDateTime(evento.startAt) +
        (evento.recorrente ? " · a mudança vale para toda a série, não só para este dia." : " · a mudança vale só para este compromisso."),
      confirmLabel: estadoInfo(proximo).label,
      danger: proximo === "CANCELLED",
      action: async () => {
        try {
          await api.patch("/agenda/events/" + evento.masterId + "/status", { status: proximo });
          notify.success("Compromisso " + acao + ".");
          setDetalhe(null);
          void carregar();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        }
      },
    });
  }

  async function excluir(evento: Evento) {
    await confirmAction({
      title: "Excluir compromisso",
      text: evento.recorrente
        ? "Deseja realmente excluir {nome}? Isso apaga a série inteira."
        : "Deseja realmente excluir {nome}?",
      nome: "“" + evento.title + "”",
      detalhe:
        formatDateTime(evento.startAt) +
        (evento.recorrente ? " · saem da agenda todos os dias repetidos desta série." : "") +
        " · não dá para desfazer.",
      confirmLabel: "Excluir",
      danger: true,
      action: async () => {
        try {
          await api.delete("/agenda/events/" + evento.masterId);
          notify.success(notice("event", "deleted"));
          setDetalhe(null);
          void carregar();
        } catch (err) {
          notify.error(extractErrorMessage(err));
        }
      },
    });
  }

  const linhas = useMemo<EventInput[]>(
    () =>
      eventos.map((e) => ({
        id: e.id,
        title: (e.recorrencia !== "NONE" ? "↻ " : "") + e.title,
        start: e.startAt,
        ...(e.endAt ? { end: e.endAt } : {}),
        allDay: e.allDay,
        editable: podeEscrever && !e.recorrente,
        classNames: ["nx-ev", tipoInfo(e.type).tone, estadoInfo(e.status).tone, e.recorrente ? "is-serie" : ""],
        extendedProps: { masterId: e.masterId, status: e.status, ocorrencia: e.ocorrencia },
      })),
    [eventos, podeEscrever],
  );

  // Uma serie recorrente aparece como varias datas no mes: contar as datas
  // chamaria uma serie de "4 series". Conta o cadastro unico (masterId).
  const series = new Set(eventos.filter((e) => e.recorrente).map((e) => e.masterId)).size;
  const inicioDoMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const proximos = eventos.filter((e) => e.startAt.slice(0, 10) >= inicioDoMes).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-sub">Compromissos da empresa ativa{ janela ? " · " + janela.rotulo : ""}</p>
        </div>
        {podeEscrever ? (
          <button type="button" className="btn btn-brand" onClick={() => setForm({ evento: null, inicio: null })}>
            Novo compromisso
          </button>
        ) : null}
      </div>

      <div className="kpi-grid">
        <div className="kpi card-surface">
          <span className="kpi-label">No período</span>
          <div className="kpi-value">{resumo ? String(resumo.total) : "—"}</div>
          <span className="kpi-hint">{plural(series, "série recorrente", "séries recorrentes")} no calendário</span>
        </div>
        <div className="kpi card-surface">
          <span className="kpi-label">Agendados</span>
          <div className="kpi-value">{resumo ? String(resumo.scheduled) : "—"}</div>
          <span className="kpi-hint">{plural(proximos, "compromisso", "compromissos")} a partir de hoje</span>
        </div>
        <div className="kpi card-surface">
          <span className="kpi-label">Concluídos</span>
          <div className="kpi-value">{resumo ? String(resumo.done) : "—"}</div>
          <span className="kpi-hint">no período mostrado</span>
        </div>
        <div className="kpi card-surface">
          <span className="kpi-label">Cancelados</span>
          <div className="kpi-value">{resumo ? String(resumo.cancelled) : "—"}</div>
          <span className="kpi-hint">tudo fica na trilha de auditoria</span>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="input"
          type="search"
          placeholder="Buscar por título, local ou descrição"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar compromisso"
        />
        <select className="select" style={{ maxWidth: 170 }} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select className="select" style={{ maxWidth: 170 }} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos os estados</option>
          {ESTADOS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {busca || tipo || estado ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setBusca("");
              setTipo("");
              setEstado("");
            }}
          >
            Limpar filtros
          </button>
        ) : null}
        <span className="toolbar-note">
          {carregando ? "Atualizando calendário…" : plural(eventos.length, "compromisso", "compromissos") + " no calendário"}
        </span>
      </div>

      <div className="card-surface agenda-surface">
        {erro ? <ErrorState message={erro} onRetry={() => void carregar()} /> : (
          <FullCalendar
            ref={calendario}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={ptBrLocale}
            headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listWeek" }}
            buttonText={{ today: "Hoje", month: "Mês", week: "Semana", list: "Lista" }}
            height="auto"
            firstDay={1}
            nowIndicator
            dayMaxEventRows={4}
            expandRows
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            events={linhas}
            editable={podeEscrever}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: "short" }}
            datesSet={aoTrocarPeriodo}
            eventClick={aoClicarEvento}
            dateClick={podeEscrever ? aoClicarNoDia : undefined}
            eventDrop={podeEscrever ? aoArrastar : undefined}
            noEventsText="Nenhum compromisso neste período."
          />
        )}
      </div>

      <p className="form-note">
        Compromissos marcados com ↻ se repetem (diária, semanal ou mensal). Abrir um deles edita a série
        inteira, e excluí-lo remove todas as datas.
      </p>

      {detalhe ? (
        <EventoDetalhe
          evento={detalhe}
          podeEscrever={podeEscrever}
          onClose={() => setDetalhe(null)}
          // Fecha o detalhe antes de abrir o formulario: dois modais empilhados
          // deixariam duas mascaras e o Esc fecharia a janela errada.
          onEdit={() => { const alvo = detalhe; setDetalhe(null); setForm({ evento: alvo, inicio: null }); }}
          onStatus={(proximo) => void mudarEstado(detalhe, proximo)}
          onDelete={() => void excluir(detalhe)}
        />
      ) : null}

      {form ? (
        <EventoForm
          evento={form.evento}
          inicioSugerido={form.inicio}
          clientes={clientes}
          leads={leads}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            void carregar();
          }}
        />
      ) : null}
    </div>
  );
}

// Cadastro/edicao de compromisso. Em serie recorrente o formulario edita o
// cadastro original: o que muda aqui vale para todas as datas.
function EventoForm(props: {
  evento: Evento | null;
  inicioSugerido: string | null;
  clientes: Opcao[];
  leads: Opcao[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { evento, inicioSugerido, clientes, leads, onClose, onSaved } = props;
  const isNew = evento === null;

  const inicioPadrao = () => {
    if (inicioSugerido) return inicioSugerido.length === 10 ? inicioSugerido + "T09:00" : paraInput(inicioSugerido);
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return paraInput(d.toISOString());
  };

  const [form, setForm] = useState({
    title: evento?.title ?? "",
    type: (evento?.type ?? "MEETING") as EventoTipo,
    startAt: isNew ? inicioPadrao() : paraInput(evento.startAt),
    endAt: evento?.endAt ? paraInput(evento.endAt) : "",
    allDay: evento?.allDay ?? false,
    location: evento?.location ?? "",
    description: evento?.description ?? "",
    recorrencia: (evento?.recorrencia ?? "NONE") as Recorrencia,
    recorrenciaAte: evento?.recorrenciaAte ? paraDia(evento.recorrenciaAte) : "",
    clientId: evento?.clientId ?? "",
    leadId: evento?.leadId ?? "",
  });
  const [busy, setBusy] = useState(false);
  const dirty = useDirty(form);

  const set = (campo: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const valor = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((atual) => ({ ...atual, [campo]: valor }) as typeof atual);
    };

  const serie = form.recorrencia !== "NONE";

  async function submit() {
    if (form.title.trim().length < 3) {
      notify.error("Informe um título com pelo menos 3 caracteres.");
      return;
    }
    if (!form.startAt) {
      notify.error("Informe a data e a hora do compromisso.");
      return;
    }
    const inicio = aPartirDoInput(form.startAt);
    const fim = form.endAt ? aPartirDoInput(form.endAt, form.allDay) : undefined;
    if (fim && inicio && new Date(fim).getTime() <= new Date(inicio).getTime()) {
      notify.error("O término precisa ser depois do início.");
      return;
    }
    const ate = serie && form.recorrenciaAte ? aPartirDoInput(form.recorrenciaAte, true) : undefined;
    if (ate && inicio && new Date(ate).getTime() < new Date(inicio).getTime()) {
      notify.error("A recorrência precisa terminar depois do início do compromisso.");
      return;
    }

    // Campo vazio nao vai no corpo: a API trata ausente e texto vazio de formas diferentes.
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      type: form.type,
      startAt: inicio,
      allDay: form.allDay,
      recorrencia: form.recorrencia,
    };
    if (fim) payload.endAt = fim;
    if (ate) payload.recorrenciaAte = ate;
    if (form.location.trim()) payload.location = form.location.trim();
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.clientId) payload.clientId = form.clientId;
    if (form.leadId) payload.leadId = form.leadId;

    setBusy(true);
    try {
      if (isNew) {
        await api.post("/agenda/events", payload);
        notify.success(notice("event", "created") + (serie ? " A série já aparece no calendário." : ""));
      } else {
        await api.patch("/agenda/events/" + evento.masterId, payload);
        notify.success(notice("event", "updated"));
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
      title={modalTitle("event", isNew)}
      subtitle={isNew ? "Reuniões, entregas e acompanhamentos da empresa ativa." : "Editando a série inteira · " + (evento?.title ?? "")}
      label={modalTitle("event", isNew)}
      onClose={onClose}
      onSubmit={() => void submit()}
      busy={busy}
      dirty={dirty}
      size="lg"
      hint={MODAL_COPY.requiredHint}
      submitLabel={isNew ? "Cadastrar" : "Salvar"}
    >
      <div className="field">
        <label className="field-label" htmlFor="evento-title">Título *</label>
        <input id="evento-title" className="input" value={form.title} onChange={set("title")} data-autofocus placeholder="Ex.: Entrega do bolo de casamento" />
      </div>

      <div className="field-grid">
        <div className="field">
          <label className="field-label" htmlFor="evento-type">Tipo</label>
          <select id="evento-type" className="select" value={form.type} onChange={set("type")}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="evento-recorrencia">Repetir</label>
          <select id="evento-recorrencia" className="select" value={form.recorrencia} onChange={set("recorrencia")}>
            {RECORRENCIAS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="evento-start">Começa em *</label>
          <input
            id="evento-start"
            className="input"
            type={form.allDay ? "date" : "datetime-local"}
            value={form.allDay ? form.startAt.slice(0, 10) : form.startAt}
            onChange={set("startAt")}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="evento-end">Termina em</label>
          <input
            id="evento-end"
            className="input"
            type={form.allDay ? "date" : "datetime-local"}
            value={form.allDay ? form.endAt.slice(0, 10) : form.endAt}
            onChange={set("endAt")}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="evento-ate">Repetir até</label>
          <input
            id="evento-ate"
            className="input"
            type="date"
            value={form.recorrenciaAte}
            disabled={!serie}
            onChange={set("recorrenciaAte")}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="evento-allday">Dia inteiro</label>
          <label className="check-line" htmlFor="evento-allday">
            <input id="evento-allday" type="checkbox" checked={form.allDay} onChange={set("allDay")} />
            <span>Compromisso sem horário definido</span>
          </label>
        </div>
      </div>

      <p className="form-note">
        {serie
          ? "Repete " + recorrenciaInfo(form.recorrencia).resumo + (form.recorrenciaAte ? " até " + formatDate(new Date(form.recorrenciaAte + "T12:00:00")) : " por tempo indeterminado") + ". As ações valem para a série inteira."
          : "Sem recorrência: aparece apenas na data escolhida."}
      </p>

      <div className="field">
        <label className="field-label" htmlFor="evento-local">Local</label>
        <input id="evento-local" className="input" value={form.location} onChange={set("location")} placeholder="Endereço, sala ou link da chamada" />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="evento-desc">Anotações</label>
        <textarea id="evento-desc" className="input" rows={3} value={form.description} onChange={set("description")} placeholder="O que precisa estar pronto neste dia?" />
      </div>

      <div className="field-grid">
        <div className="field">
          <label className="field-label" htmlFor="evento-cliente">Cliente</label>
          <select id="evento-cliente" className="select" value={form.clientId} onChange={set("clientId")}>
            <option value="">Sem cliente vinculado</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="evento-lead">Lead</label>
          <select id="evento-lead" className="select" value={form.leadId} onChange={set("leadId")}>
            <option value="">Sem lead vinculado</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// Leitura rapida do compromisso: o que, quando, onde, com quem e o que fazer agora.
function EventoDetalhe(props: {
  evento: Evento;
  podeEscrever: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatus: (proximo: EventoEstado) => void;
  onDelete: () => void;
}) {
  const { evento, podeEscrever, onClose, onEdit, onStatus, onDelete } = props;
  const t = tipoInfo(evento.type);
  const s = estadoInfo(evento.status);
  const r = recorrenciaInfo(evento.recorrencia);
  const duracao = evento.endAt
    ? Math.max(0, Math.round((new Date(evento.endAt).getTime() - new Date(evento.startAt).getTime()) / 60000))
    : 0;

  return (
    <Modal
      label={"Detalhe do compromisso " + evento.title}
      title={evento.title}
      subtitle={
        <span>
          <span className={"status-pill " + s.tone}>{s.label}</span>{" "}
          <span className={"status-pill " + t.tone}>{t.label}</span>
          {evento.recorrente ? <span className="status-pill is-serie"> ↻ {r.label.toLowerCase()}</span> : null}
        </span>
      }
      onClose={onClose}
      size="md"
      hint={podeEscrever ? "Toda alteração fica na trilha de auditoria da empresa." : "Seu perfil visualiza a agenda, mas não altera compromissos."}
      footer={
        podeEscrever ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>Editar dados</button>
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Excluir</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
        )
      }
    >
      <dl className="kv">
        <div>
          <dt>Quando</dt>
          <dd>
            {formatDateTime(evento.startAt)}
            {evento.endAt ? " → " + formatDateTime(evento.endAt) : ""}
            {duracao > 0 ? " · " + plural(duracao, "minuto", "minutos") : ""}
            {evento.allDay ? " · dia inteiro" : ""}
          </dd>
        </div>
        {evento.recorrente ? (
          <div>
            <dt>Recorrência</dt>
            <dd>
              {r.label.toLowerCase()} {evento.recorrenciaAte ? "até " + formatDate(evento.recorrenciaAte) : "por tempo indeterminado"}
              {" · "}data {evento.ocorrencia + 1} da série
            </dd>
          </div>
        ) : null}
        {evento.location ? (
          <div>
            <dt>Local</dt>
            <dd>{evento.location}</dd>
          </div>
        ) : null}
        <div>
          <dt>Cliente</dt>
          <dd>{evento.clientName ?? (evento.leadName ? "Lead " + evento.leadName : "Nenhum vínculo")}</dd>
        </div>
        <div>
          <dt>Responsável</dt>
          <dd>{evento.userName ?? "—"}</dd>
        </div>
        {evento.description ? (
          <div>
            <dt>Anotações</dt>
            <dd className="lead-notes">{evento.description}</dd>
          </div>
        ) : null}
      </dl>

      {podeEscrever ? (
        <div className="agenda-acoes">
          <span className="agenda-acoes-label">Mudar estado</span>
          <div className="pipeline-move">
            {ESTADOS.filter((e) => e.value !== evento.status).map((e) => (
              <button key={e.value} type="button" className="btn btn-ghost btn-sm" onClick={() => onStatus(e.value)}>
                {e.value === "DONE" ? "Concluir" : e.value === "CANCELLED" ? "Cancelar" : "Reabrir"}
              </button>
            ))}
          </div>
          {evento.recorrente ? (
            <p className="form-note">
              Alterar o estado vale para todas as datas desta série — o compromisso recorrente é um só cadastro.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
