import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../lib/api";
import { notify } from "../lib/notify";
import { formatDateTime, tempoRelativo } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { Tabs, TabPanel, useTabState, type TabItem } from "../components/Tabs";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { Pagination, PAGE_SIZE_PADRAO } from "../components/Pagination";
import {
  anunciarMudancaNosAvisos, contarNotificacoes, lerPreferencias, listarNotificacoes,
  marcarLida, marcarTodasLidas, salvarPreferencias, varrerContasVencidas,
  EVENTO_AVISOS, ROTULOS_PRIORIDADE, TIPOS, rotuloTipo,
  type FiltroStatus, type Notificacao, type Preferencias, type Resumo,
  type TipoNotificacao,
} from "../lib/notificationsApi";

// ===== Tela de avisos (/app/notificacoes) =====
// O sino do cabeçalho mostra o número e os últimos seis; esta é a conta
// completa, com filtro por tipo, paginação feita no servidor e a preferência
// de cada tipo. Empresa e dono vêm do token — não há seletor de empresa aqui
// porque cada pessoa vê só os próprios avisos, na empresa ativa.

const ABAS: TabItem[] = [
  { id: "todos", label: "Todos os avisos", hint: "A conta completa, do mais recente para o mais antigo" },
  { id: "naolidos", label: "Não lidos", hint: "Só o que ainda está pendente para você" },
  { id: "preferencias", label: "Preferências", hint: "Quais tipos de aviso chegam até você" },
];

function classePrioridade(prioridade: string): string {
  return "is-" + prioridade.toLowerCase();
}

function rotuloPrioridade(prioridade: Notificacao["priority"]): string {
  return ROTULOS_PRIORIDADE[prioridade] ?? prioridade;
}

export function Notifications() {
  const { active, onSelect } = useTabState(ABAS, "todos");
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useEffect(() => {
    const atualizar = () => {
      contarNotificacoes().then(setResumo).catch(() => {
        /* a lista mostra o próprio erro; o badge é só o número do sino */
      });
    };
    atualizar();
    window.addEventListener(EVENTO_AVISOS, atualizar);
    return () => window.removeEventListener(EVENTO_AVISOS, atualizar);
  }, []);

  const abas = ABAS.map((aba) =>
    aba.id === "naolidos" && (resumo?.naoLidas ?? 0) > 0
      ? { ...aba, badge: resumo!.naoLidas }
      : aba,
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Notificações</h1>
          <p className="page-sub">
            O que a equipe fez na empresa ativa, e quais avisos você quer receber no sino.
          </p>
        </div>
        {resumo ? (
          <div className="nx-avisos-head-acoes">
            <span className="status-pill is-on">
              {resumo.naoLidas} {resumo.naoLidas === 1 ? "não lido" : "não lidos"}
            </span>
            {resumo.urgentes > 0 ? (
              <span className="status-pill is-off">
                {resumo.urgentes} {resumo.urgentes === 1 ? "urgente" : "urgentes"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <Tabs tabs={abas} active={active} onSelect={onSelect} ariaLabel="Notificações" />

      <TabPanel id="todos" active={active}>
        <PainelAvisos status="todas" porTipo={resumo?.porTipo} aoMudarEstado={anunciarMudancaNosAvisos} />
      </TabPanel>
      <TabPanel id="naolidos" active={active}>
        <PainelAvisos status="naolidas" porTipo={resumo?.porTipo} aoMudarEstado={anunciarMudancaNosAvisos} />
      </TabPanel>
      <TabPanel id="preferencias" active={active}>
        <PainelPreferencias aoMudarEstado={anunciarMudancaNosAvisos} />
      </TabPanel>
    </div>
  );
}

// ---- Lista de avisos ----

interface PainelAvisosProps {
  status: FiltroStatus;
  porTipo?: Resumo["porTipo"];
  aoMudarEstado: () => void;
}

function PainelAvisos({ status, porTipo, aoMudarEstado }: PainelAvisosProps) {
  const navigate = useNavigate();
  const [kind, setKind] = useState<TipoNotificacao | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_PADRAO);
  const [pagina, setPagina] = useState<Awaited<ReturnType<typeof listarNotificacoes>> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setPagina(await listarNotificacoes({ page, pageSize, status, kind: kind || undefined }));
    } catch (e) {
      setErro(extractErrorMessage(e, "Não foi possível ler seus avisos."));
    }
  }, [page, pageSize, status, kind]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function marcarUm(aviso: Notificacao) {
    if (aviso.lida) return;
    try {
      const atualizada = await marcarLida(aviso.id);
      setPagina((p) => (p ? { ...p, data: p.data.map((a) => (a.id === atualizada.id ? atualizada : a)) } : p));
      aoMudarEstado();
    } catch (e) {
      notify.error(extractErrorMessage(e), "Não foi possível marcar o aviso");
    }
  }

  async function marcarTodos() {
    setOcupado(true);
    try {
      const marcadas = await marcarTodasLidas();
      aoMudarEstado();
      await carregar();
      notify.success(
        marcadas === 0 ? "Nada para marcar: seus avisos já estavam lidos."
          : marcadas === 1 ? "1 aviso marcado como lido."
            : marcadas + " avisos marcados como lidos.",
        "Avisos",
      );
    } catch (e) {
      notify.error(extractErrorMessage(e), "Não foi possível marcar os avisos");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="card-surface panel">
      <div className="toolbar nx-avisos-filtros">
        <div className="toolbar" role="group" aria-label="Tipo de aviso">
          <button
            type="button"
            className={"btn btn-sm " + (kind === "" ? "btn-brand" : "btn-ghost")}
            aria-pressed={kind === ""}
            onClick={() => { setKind(""); setPage(1); }}
          >
            Todos os tipos
          </button>
          {TIPOS.map((t) => {
            const pendentes = porTipo?.[t.kind] ?? 0;
            return (
              <button
                key={t.kind}
                type="button"
                className={"btn btn-sm " + (kind === t.kind ? "btn-brand" : "btn-ghost")}
                aria-pressed={kind === t.kind}
                title={t.dica}
                onClick={() => { setKind(t.kind); setPage(1); }}
              >
                {t.rotulo}
                {/* O número é o que o sino contou, não uma contagem da página:
                    ele vale para a lista inteira, inclusive fora da tela. */}
                {pendentes > 0 ? <span className="nx-avisos-chip-num">{pendentes}</span> : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm nx-avisos-marcar"
          onClick={() => void marcarTodos()}
          disabled={ocupado}
        >
          {ocupado ? "Marcando…" : "Marcar todos como lidos"}
        </button>
      </div>

      {erro ? (
        <ErrorState message={erro} onRetry={carregar} />
      ) : !pagina ? (
        <LoadingInline label="Lendo seus avisos…" />
      ) : pagina.data.length === 0 ? (
        <EmptyState
          title={status === "naolidas" ? "Nenhum aviso pendente" : "Nenhum aviso por aqui"}
          description={
            kind
              ? "Ninguém gerou um aviso desse tipo na empresa ativa ainda. Assim que a equipe agir, ele aparece aqui e no sino."
              : "Os avisos nascem das ações da equipe — venda confirmada, estoque no mínimo, lead novo, conta vencida. Com a empresa vazia, esta tela fica vazia mesmo."
          }
        />
      ) : (
        <>
          <ul className="nx-avisos">
            {pagina.data.map((aviso) => (
              <li key={aviso.id} className={"nx-aviso" + (aviso.lida ? "" : " is-novo")}>
                <span
                  className={"nx-aviso-prioridade " + classePrioridade(aviso.priority)}
                  title={"Prioridade " + rotuloPrioridade(aviso.priority)}
                  aria-hidden="true"
                />
                <div className="nx-aviso-corpo">
                  <p className="nx-aviso-titulo">{aviso.title}</p>
                  {aviso.body ? <p className="nx-aviso-texto">{aviso.body}</p> : null}
                  <p className="nx-aviso-meta">
                    <span className="nx-aviso-tipo">{rotuloTipo(aviso.kind)}</span>
                    <span title={formatDateTime(aviso.createdAt)}>{tempoRelativo(aviso.createdAt)}</span>
                    <span>{rotuloPrioridade(aviso.priority)}</span>
                    <span>{aviso.lida ? "lido" : "não lido"}</span>
                  </p>
                </div>
                <div className="row-actions">
                  {aviso.link ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(aviso.link as string)}
                    >
                      Abrir
                    </button>
                  ) : null}
                  {!aviso.lida ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => void marcarUm(aviso)}>
                      Marcar lida
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={pagina.meta.page}
            pageSize={pagina.meta.pageSize}
            total={pagina.meta.total}
            totalPages={pagina.meta.totalPages}
            onChange={setPage}
            onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
            itemLabel="avisos"
            itemLabelSingular="aviso"
          />
        </>
      )}
    </section>
  );
}

// ---- Preferências ----

function PainelPreferencias({ aoMudarEstado }: { aoMudarEstado: () => void }) {
  const { can } = useAuth();
  const podeVarrer = can("settings:write");
  const [preferencias, setPreferencias] = useState<Preferencias | null>(null);
  const [rascunho, setRascunho] = useState<Preferencias | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [varrendo, setVarrendo] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const p = await lerPreferencias();
      setPreferencias(p);
      setRascunho(p);
    } catch (e) {
      setErro(extractErrorMessage(e, "Não foi possível ler suas preferências."));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gravar() {
    if (!rascunho) return;
    setOcupado(true);
    try {
      const salvas = await salvarPreferencias(rascunho);
      setPreferencias(salvas);
      setRascunho(salvas);
      notify.success("Suas preferências de aviso foram salvas.", "Preferências");
    } catch (e) {
      notify.error(extractErrorMessage(e), "Não foi possível salvar as preferências");
    } finally {
      setOcupado(false);
    }
  }

  async function varrer() {
    setVarrendo(true);
    try {
      const criadas = await varrerContasVencidas();
      aoMudarEstado();
      notify.success(
        criadas === 0 ? "Nenhuma conta vencida nova neste mês."
          : criadas === 1 ? "1 aviso de conta vencida criado."
            : criadas + " avisos de conta vencida criados.",
        "Varredura",
      );
    } catch (e) {
      notify.error(extractErrorMessage(e), "A varredura não pôde rodar");
    } finally {
      setVarrendo(false);
    }
  }

  if (erro) return <ErrorState message={erro} onRetry={carregar} />;
  if (!rascunho || !preferencias) return <LoadingInline label="Lendo suas preferências…" />;

  // Comparar o rascunho com o que está salvo é o que liga e desliga o botão:
  // sem mudança não há por que chamar a API.
  const suja = TIPOS.some((t) => rascunho[t.preferencia] !== preferencias[t.preferencia])
    || rascunho.inAppChannel !== preferencias.inAppChannel
    || rascunho.emailChannel !== preferencias.emailChannel;

  return (
    <>
      <section className="card-surface panel">
        <h2 className="nx-panel-title">O que chega até você</h2>
        <p className="nx-panel-sub">
          Cada tipo é uma chave sua, na empresa ativa. Desligar Estoque não silencia Vendas, e quem provoca o
          evento nunca recebe o próprio aviso.
        </p>
        <div className="nx-avisos-tipos">
          {TIPOS.map((t) => (
            <label className="check-line" key={t.kind}>
              <input
                type="checkbox"
                checked={rascunho[t.preferencia]}
                onChange={(e) => setRascunho({ ...rascunho, [t.preferencia]: e.target.checked })}
              />
              <span className="nx-avisos-preferencia">
                <strong>{t.rotulo}</strong>
                <span className="nx-avisos-dica">{t.dica}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-brand btn-sm"
            onClick={() => void gravar()}
            disabled={ocupado || !suja}
          >
            {ocupado ? "Salvando…" : "Salvar preferências"}
          </button>
          {suja ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRascunho(preferencias)}>
              Descartar mudanças
            </button>
          ) : null}
        </div>
      </section>

      <section className="card-surface panel">
        <h2 className="nx-panel-title">Canais</h2>
        <p className="nx-panel-sub">Por onde o aviso entra.</p>
        <div className="nx-avisos-tipos">
          <label className="check-line">
            <input
              type="checkbox"
              checked={rascunho.inAppChannel}
              onChange={(e) => setRascunho({ ...rascunho, inAppChannel: e.target.checked })}
            />
            <span className="nx-avisos-preferencia">
              <strong>Sino do painel</strong>
              <span className="nx-avisos-dica">
                Desligado, o aviso deixa de ser gravado para você: não entra no sino nem nesta tela.
              </span>
            </span>
          </label>
          <label className="check-line">
            <input type="checkbox" checked={rascunho.emailChannel} disabled onChange={() => undefined} />
            <span className="nx-avisos-preferencia">
              <strong>E-mail</strong>
              <span className="nx-avisos-dica">
                Indisponível: não há servidor de e-mail (SMTP) configurado nesta instalação, então nenhuma
                mensagem sairia. A preferência existe no banco e este quadro entra em ação quando o envio for
                real — mostramos o que não funciona em vez de acender um botão que mente.
              </span>
            </span>
          </label>
        </div>
      </section>

      {podeVarrer ? (
        <section className="card-surface panel">
          <h2 className="nx-panel-title">Varredura de contas vencidas</h2>
          <p className="nx-panel-sub">
            Rota administrativa: percorre os lançamentos pendentes vencidos e grava o aviso para quem ainda
            não recebeu um neste mês. É o mesmo passo que a rotina agendada vai chamar quando o executor
            existir — hoje ele só roda daqui ou pela API.
          </p>
          <div className="row-actions">
            <button type="button" className="btn btn-brand btn-sm" onClick={() => void varrer()} disabled={varrendo}>
              {varrendo ? "Varrendo…" : "Rodar varredura agora"}
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
