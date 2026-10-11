import { useCallback, useEffect, useState } from "react";
import { extractErrorMessage } from "../lib/api";
import { notify } from "../lib/notify";
import { confirmAction } from "../lib/confirm";
import { formatDateTime, tempoRelativo } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { EmptyState, ErrorState, LoadingInline } from "../components/StateView";
import { alternarRotina, executarRotina, listarRotinas, type Rotina } from "../lib/cronApi";

// ===== Tela de rotinas agendadas (/app/rotinas) =====
// As varreduras que nascem sozinhas: contas vencidas, estoque abaixo do mínimo
// e o relatório diário. O agendador bate no processo da API e grava na própria
// tabela o estado da última corrida — esta tela é o painel desse estado, e o
// botão "Executar agora" chama exatamente o mesmo executor do relógio (nada de
// versão de demonstração). Rota e menu só aparecem para quem configura
// (settings:write): rotina é coisa da plataforma, não do atendimento.

function duracao(ms: number | null): string {
  if (ms === null) return "";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

function PillUltima({ job }: { job: Rotina }) {
  if (!job.ultimaExecucao) return <span className="company-meta">nunca executou</span>;
  const ok = job.ultimoStatus === "ok";
  return (
    <div className="rotina-ultima">
      <span className={"status-pill " + (ok ? "is-on" : "is-off")}>
        {ok ? "Ok" : "Erro"} · {tempoRelativo(job.ultimaExecucao)}
      </span>
      {job.ultimaMensagem ? <p className="company-meta">{job.ultimaMensagem}</p> : null}
      {job.duracaoMs !== null ? <p className="company-meta">{duracao(job.duracaoMs)}</p> : null}
    </div>
  );
}

export function Rotinas() {
  const { can } = useAuth();
  const podeGerir = can("settings:write");
  const [rotinas, setRotinas] = useState<Rotina[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setRotinas(await listarRotinas());
    } catch (e) {
      setErro(extractErrorMessage(e, "Não foi possível ler as rotinas agendadas."));
    }
  }, []);

  useEffect(() => {
    if (podeGerir) void carregar();
  }, [podeGerir, carregar]);

  if (!podeGerir) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Rotinas agendadas</h1>
            <p className="page-sub">Varreduras periódicas do sistema.</p>
          </div>
        </div>
        <EmptyState
          title="Sem permissão por aqui"
          description="Rotinas agendadas só aparecem para quem configura a empresa (proprietário ou administrador)."
        />
      </div>
    );
  }

  async function rodar(job: Rotina) {
    setOcupada(job.slug);
    try {
      const r = await executarRotina(job.slug);
      setRotinas((atual) => (atual ? atual.map((x) => (x.slug === job.slug ? r.job : x)) : atual));
      if (r.status === "ok") notify.success(`${job.nome}: ${r.mensagem}`);
      else notify.error(`${job.nome} terminou com erro: ${r.mensagem}`);
    } catch (e) {
      notify.error(extractErrorMessage(e, "A rotina não pode ser executada agora."));
    } finally {
      setOcupada(null);
    }
  }

  async function alternar(job: Rotina, paraHabilitada: boolean) {
    if (!paraHabilitada) {
      // Pausar silencia o relógio da rotina — pergunta antes, como pede a casa.
      const confirmado = await confirmAction({
        title: "Pausar rotina",
        text: "Tem certeza de que deseja pausar a rotina “{nome}”?",
        nome: job.nome,
        detalhe: "Ela deixa de rodar no horário marcado. O botão “Executar agora” continua disponível.",
        confirmLabel: "Pausar",
        danger: true,
        action: () => alternarRotina(job.slug, false),
      });
      if (!confirmado) return;
      setRotinas((atual) =>
        atual ? atual.map((x) => (x.slug === job.slug ? { ...x, habilitada: false } : x)) : atual,
      );
      notify.success(`${job.nome} pausada.`);
      void carregar();
      return;
    }
    setOcupada(job.slug);
    try {
      const atualizado = await alternarRotina(job.slug, true);
      setRotinas((atual) => (atual ? atual.map((x) => (x.slug === job.slug ? atualizado : x)) : atual));
      notify.success(`${job.nome} retomada — volta a rodar ${atualizado.agendaLegivel}.`);
    } catch (e) {
      notify.error(extractErrorMessage(e, "Não foi possível retomar a rotina."));
    } finally {
      setOcupada(null);
    }
  }

  const ativas = (rotinas ?? []).filter((j) => j.habilitada).length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Rotinas agendadas</h1>
          <p className="page-sub">
            O que o sistema varre sozinho, no horário marcado, sem depender de alguém abrir uma tela.
          </p>
        </div>
        {rotinas ? (
          <div className="nx-avisos-head-acoes">
            <span className="status-pill is-on">{ativas} {ativas === 1 ? "ativa" : "ativas"}</span>
            {rotinas.length - ativas > 0 ? (
              <span className="status-pill is-off">
                {rotinas.length - ativas} {rotinas.length - ativas === 1 ? "pausada" : "pausadas"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {erro ? (
        <ErrorState message={erro} onRetry={carregar} />
      ) : !rotinas ? (
        <LoadingInline />
      ) : rotinas.length === 0 ? (
        <EmptyState
          title="Nenhuma rotina cadastrada"
          description="Rode o seed do projeto para criar as rotinas-padrão do sistema."
        />
      ) : (
        <div className="card-surface table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Rotina</th>
                <th scope="col">Agenda</th>
                <th scope="col">Estado</th>
                <th scope="col">Última execução</th>
                <th scope="col" className="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rotinas.map((job) => (
                <tr key={job.slug}>
                  <td>
                    <strong>{job.nome}</strong>
                    {job.descricao ? <p className="company-meta">{job.descricao}</p> : null}
                  </td>
                  <td>
                    <span>{job.agendaLegivel}</span>
                    <p className="mono company-meta">{job.agenda}</p>
                    {job.habilitada && job.proximaExecucao ? (
                      <p className="company-meta">próxima: {formatDateTime(job.proximaExecucao)}</p>
                    ) : null}
                    {!job.agendaValida ? (
                      <p className="company-meta">expressão inválida — corrige no seed</p>
                    ) : null}
                  </td>
                  <td>
                    <span className={"status-pill " + (job.habilitada ? "is-on" : "is-off")}>
                      {job.habilitada ? "Ativa" : "Pausada"}
                    </span>
                    {!job.executorConhecido ? (
                      <p className="company-meta">sem executor neste código</p>
                    ) : null}
                  </td>
                  <td><PillUltima job={job} /></td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={ocupada !== null || !job.executorConhecido}
                        onClick={() => void rodar(job)}
                      >
                        {ocupada === job.slug ? "Executando…" : "Executar agora"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={ocupada !== null}
                        onClick={() => void alternar(job, !job.habilitada)}
                      >
                        {job.habilitada ? "Pausar" : "Retomar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="page-sub">
        O relógio das rotinas roda junto da API; se o servidor estiver desligado na hora marcada,
        a corrida fica para a próxima janela da agenda. Os avisos gerados caem no sino de cada
        pessoa, respeitando as preferências da tela de Notificações.
      </p>
    </div>
  );
}
