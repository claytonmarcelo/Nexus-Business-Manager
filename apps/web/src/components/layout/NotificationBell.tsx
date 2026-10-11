import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../../lib/api";
import { notify } from "../../lib/notify";
import { tempoRelativo } from "../../lib/format";
import {
  anunciarMudancaNosAvisos, contarNotificacoes, listarNotificacoes, marcarLida,
  marcarTodasLidas, EVENTO_AVISOS, rotuloTipo,
  type Notificacao, type Resumo,
} from "../../lib/notificationsApi";

// ===== Sino de avisos no cabeçalho do painel =====
// O sino pergunta só contagens (GET /notifications/count): a lista inteira a
// cada 45 segundos seria tráfego à toa na rota mais frequentada do painel. Os
// avisos em si chegam quando a pessoa abre o painel — leitura sob demanda.
//
// Batida em aba escondida não acontece: document.hidden corta o polling, e o
// retorno da aba puxa a contagem na hora. Ninguém paga requisição por uma aba
// que está aberta desde ontem num segundo monitor.

const INTERVALO_MS = 45_000;
const RECENTES = 6;

/** Sino em traço, da família dos ícones do cabeçalho (sem biblioteca nova). */
function SinoIcone() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M18 15.5V10a6 6 0 1 0-12 0v5.5L4.5 18h15z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

function classePrioridade(prioridade: string): string {
  return "is-" + prioridade.toLowerCase();
}

export function NotificationBell() {
  const navigate = useNavigate();
  const local = useLocation();
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [aberto, setAberto] = useState(false);
  const [recentes, setRecentes] = useState<Notificacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const atualizarContagem = useCallback(async () => {
    try {
      setResumo(await contarNotificacoes());
    } catch {
      // Polling não grita: se a chamada falhou, a próxima batida tenta de novo.
      // Um sino com número velho é melhor que um toast de erro a cada 45s.
    }
  }, []);

  const carregarPainel = useCallback(async () => {
    setErro(null);
    try {
      const pagina = await listarNotificacoes({ page: 1, pageSize: RECENTES, status: "todas" });
      setRecentes(pagina.data);
    } catch (e) {
      setErro(extractErrorMessage(e, "Não foi possível ler seus avisos."));
    }
  }, []);

  useEffect(() => {
    void atualizarContagem();
    const bater = () => {
      if (document.hidden) return;
      void atualizarContagem();
    };
    const aoMudar = () => {
      void atualizarContagem();
      setRecentes(null);
    };
    const timer = window.setInterval(bater, INTERVALO_MS);
    window.addEventListener("focus", bater);
    document.addEventListener("visibilitychange", bater);
    window.addEventListener(EVENTO_AVISOS, aoMudar);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", bater);
      document.removeEventListener("visibilitychange", bater);
      window.removeEventListener(EVENTO_AVISOS, aoMudar);
    };
  }, [atualizarContagem]);

  // Aberto o painel, os avisos vêm junto com a contagem nova.
  useEffect(() => {
    if (aberto && recentes === null && !erro) void carregarPainel();
  }, [aberto, recentes, erro, carregarPainel]);

  // Trocar de rota fecha o painel: sino aberto pendurado sobre outra tela é
  // a mesma distração de um menu que não sai do caminho.
  useEffect(() => setAberto(false), [local.pathname]);

  useEffect(() => {
    if (!aberto) return undefined;
    const noMouse = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const noTeclado = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberto(false);
      botao.current?.focus();
    };
    document.addEventListener("mousedown", noMouse);
    document.addEventListener("keydown", noTeclado);
    return () => {
      document.removeEventListener("mousedown", noMouse);
      document.removeEventListener("keydown", noTeclado);
    };
  }, [aberto]);

  async function aoClicarAviso(aviso: Notificacao) {
    if (!aviso.lida) {
      try {
        const atualizada = await marcarLida(aviso.id);
        setRecentes((lista) => (lista ?? []).map((a) => (a.id === atualizada.id ? atualizada : a)));
      } catch (e) {
        setErro(extractErrorMessage(e, "Não foi possível marcar o aviso."));
      }
    }
    anunciarMudancaNosAvisos();
    if (aviso.link) {
      setAberto(false);
      navigate(aviso.link);
    }
  }

  async function marcarTodos() {
    try {
      const marcadas = await marcarTodasLidas();
      setRecentes(null);
      anunciarMudancaNosAvisos();
      notify.success(
        marcadas === 0 ? "Nada para marcar: seus avisos já estavam lidos."
          : marcadas === 1 ? "1 aviso marcado como lido."
            : marcadas + " avisos marcados como lidos.",
        "Avisos",
      );
    } catch (e) {
      notify.error(extractErrorMessage(e), "Não foi possível marcar os avisos");
    }
  }

  const naoLidas = resumo?.naoLidas ?? 0;
  const urgentes = resumo?.urgentes ?? 0;
  const rotuloBotao = resumo === null
    ? "Avisos"
    : naoLidas === 0
      ? "Avisos: nada pendente"
      : naoLidas === 1
        ? "Avisos: 1 não lido" + (urgentes ? ", sendo 1 urgente" : "")
        : "Avisos: " + naoLidas + " não lidos" + (urgentes ? ", " + urgentes + " urgentes" : "");

  return (
    <div className="nx-sino" ref={caixa}>
      <button
        type="button"
        ref={botao}
        className={"nx-sino-botao" + (aberto ? " is-on" : "")}
        aria-expanded={aberto}
        aria-controls="nx-sino-painel"
        aria-label={rotuloBotao}
        title={rotuloBotao}
        onClick={() => setAberto((v) => !v)}
      >
        <SinoIcone />
        {naoLidas > 0 ? (
          <span className={"nx-sino-contagem" + (urgentes > 0 ? " is-urgente" : "")} aria-hidden="true">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        ) : null}
      </button>

      {aberto ? (
        <div className="nx-sino-painel" id="nx-sino-painel" role="region" aria-label="Avisos recentes">
          <div className="nx-sino-topo">
            <span className="nx-sino-titulo">Avisos</span>
            <span className="nx-sino-resumo">
              {resumo === null
                ? "lendo…"
                : naoLidas === 0
                  ? "nada pendente"
                  : naoLidas + (naoLidas === 1 ? " não lido" : " não lidos") +
                    (urgentes ? " · " + urgentes + (urgentes === 1 ? " urgente" : " urgentes") : "")}
            </span>
          </div>

          {erro ? (
            <p className="nx-sino-erro" role="alert">{erro}</p>
          ) : recentes === null ? (
            <p className="nx-sino-vazio">Buscando seus avisos…</p>
          ) : recentes.length === 0 ? (
            <p className="nx-sino-vazio">Nenhum aviso ainda. Eles nascem das ações da equipe na sua empresa.</p>
          ) : (
            <ul className="nx-sino-lista">
              {recentes.map((aviso) => (
                <li key={aviso.id} className={"nx-sino-item" + (aviso.lida ? "" : " is-novo")}>
                  <button
                    type="button"
                    className="nx-sino-item-botao"
                    onClick={() => void aoClicarAviso(aviso)}
                    title={aviso.link ? "Abrir " + aviso.link : undefined}
                  >
                    <span className={"nx-aviso-prioridade " + classePrioridade(aviso.priority)} aria-hidden="true" />
                    <span className="nx-sino-item-corpo">
                      <span className="nx-sino-item-titulo">{aviso.title}</span>
                      {aviso.body ? <span className="nx-sino-item-texto">{aviso.body}</span> : null}
                      <span className="nx-sino-item-meta">
                        {rotuloTipo(aviso.kind)} · {tempoRelativo(aviso.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="nx-sino-rodape">
            {naoLidas > 0 ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => void marcarTodos()}>
                Marcar todos
              </button>
            ) : null}
            <Link className="btn btn-brand btn-sm" to="/app/notificacoes" onClick={() => setAberto(false)}>
              Ver todos os avisos
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
