import { useCallback, useEffect, useRef, useState } from "react";
import { extractErrorMessage } from "../../lib/api";
import { notify } from "../../lib/notify";
import { ROTULOS_LEGAIS } from "../../lib/brand";
import { formatDateTime } from "../../lib/format";
import { Bloco } from "../Fields";
import { PageLoader } from "../PageLoader";
import { ErrorState } from "../StateView";
import { baixarMeusDados, lerMeusDados, type DadosDoTitular } from "../../lib/lgpdApi";

// ===== Aba "Seus dados (LGPD)" — T6.3 =====
//
// O direito de acesso (LGPD art. 18, II) tem duas pontas, e a tela é a segunda: a
// API devolve o JSON (`GET /api/lgpd/meus-dados`) e a pessoa precisa de um lugar
// para ver que aquilo existe e levar a cópia embora. Antes da F7 a resposta para
// "o que vocês guardam sobre mim" era um e-mail para quem opera a instalação.
//
// Aqui não há edição nenhuma: é a foto do que a casa guarda, lida na empresa ativa
// do token. Por isso o painel não pergunta permissão — o dado é da pessoa que está
// logada, e todo papel, do STAFF ao OWNER, tem direito a ele.
//
// Duas coisas que a tela faz questão de dizer em voz alta:
//  - o recorte é desta empresa; noutra casa em que a pessoa trabalha, o pedido é lá;
//  - o que NÃO sai junto, com o motivo de cada ausência (senha, segundo fator,
//    hash de sessão, texto das ações). Uma lista de dados sem essa linha deixa a
//    pessoa achar que a casa não guarda nada, quando guarda — só não entrega.

export function PrivacidadePanel() {
  const [dados, setDados] = useState<DadosDoTitular | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(true);

  // A releitura pode correr com a leitura anterior (retries rápidos, troca de aba):
  // só o pedido mais novo escreve na tela, do mesmo jeito que nas listas da F5.
  const ultimaLeitura = useRef(0);

  const carregar = useCallback(async () => {
    const minhaLeitura = ++ultimaLeitura.current;
    setOcupado(true);
    setErro(null);
    try {
      const corpo = await lerMeusDados();
      if (minhaLeitura !== ultimaLeitura.current) return;
      setDados(corpo);
    } catch (e) {
      if (minhaLeitura !== ultimaLeitura.current) return;
      setErro(extractErrorMessage(e, "Não foi possível ler os seus dados."));
    } finally {
      if (minhaLeitura === ultimaLeitura.current) setOcupado(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // O botão não mostra spinner: a leitura já está na tela, e o que acontece aqui é
  // local (blob + clique). Se um dia a cópia precisar de chamada nova, o estado volta.
  function baixar() {
    if (!dados) return;
    const arquivo = baixarMeusDados(dados);
    notify.success("Cópia gerada: " + arquivo + ". Ela contém exatamente o que está nesta tela, e mais os campos de cada registro.");
  }

  if (ocupado && !dados) {
    return <PageLoader label="Lendo o que a casa guarda sobre você…" />;
  }
  if (erro && !dados) {
    return <ErrorState message={erro} onRetry={carregar} />;
  }
  if (!dados) {
    return <ErrorState message="Nada foi devolvido. Tente de novo." onRetry={carregar} />;
  }

  const sessoesAbertas = dados.sessoes.filter((s) => !s.revogadaEm && !s.usadaEm).length;

  return (
    <div className="nx-painel">
      <Bloco
        titulo="Seus dados"
        sub={"Foto tirada em " + formatDateTime(dados.geradoEm) + " · " + (dados.empresaAtiva.nome ?? "empresa ativa")}
        acao={
          <button type="button" className="btn btn-brand" onClick={baixar}>
            Baixar cópia em JSON
          </button>
        }
      >
        <div className="nx-grade">
          <Linha rotulo="Nome" valor={dados.titular.nome} />
          <Linha rotulo="E-mail de acesso" valor={dados.titular.email} />
          <Linha rotulo="Telefone" valor={dados.titular.telefone ?? "não informado"} />
          <Linha
            rotulo="E-mail verificado em"
            valor={dados.titular.emailVerificadoEm ? formatDateTime(dados.titular.emailVerificadoEm) : "nunca"}
          />
          <Linha
            rotulo="Segundo fator"
            valor={dados.titular.segundoFatorDesde ? "ligado desde " + formatDateTime(dados.titular.segundoFatorDesde) : "desligado"}
          />
          <Linha rotulo="Papel na empresa ativa" valor={dados.empresaAtiva.papel ?? "—"} />
          <Linha
            rotulo="Conta criada em"
            valor={dados.titular.criadoEm ? formatDateTime(dados.titular.criadoEm) : "—"}
          />
          <Linha
            rotulo="Sessões abertas"
            valor={String(sessoesAbertas) + " de " + String(dados.sessoes.length)}
          />
          <Linha rotulo="Avisos recebidos aqui" valor={String(dados.notificacoes.length)} />
          <Linha
            rotulo="Ações na trilha"
            valor={
              dados.trilhaDeAuditoria.total +
              (dados.trilhaDeAuditoria.mostrado < dados.trilhaDeAuditoria.total
                ? " (os " + dados.trilhaDeAuditoria.mostrado + " mais recentes estão no arquivo)"
                : "")
            }
          />
        </div>
        <p className="nx-bloco-sub">{dados.aviso}</p>
      </Bloco>

      <Bloco
        titulo="O que você aceitou"
        sub="Cada linha é uma caixa marcada, com a versão do texto que estava em vigor naquele dia."
      >
        {dados.aceites.length === 0 ? (
          <p className="nx-bloco-sub">
            Nenhuma caixa marcada registrada. O aceite é do cadastro feito por você; uma conta
            aberta pela equipe da empresa não tem aceite porque ninguém marcou por ela.
          </p>
        ) : (
          <ul className="nx-lista-dados">
            {dados.aceites.map((a) => (
              <li key={a.tipo + "-" + a.versao}>
                <strong>{ROTULOS_LEGAIS[a.tipo.toUpperCase()] ?? a.tipo}</strong> — versão {a.versao} aceita em{" "}
                {a.aceitoEm ? formatDateTime(a.aceitoEm) : "data não registrada"}
                {a.ip ? " · a partir do endereço " + a.ip : ""}
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <Bloco
        titulo="Onde mais você está"
        sub="As empresas da sua conta e o seu papel em cada uma. Os dados das outras casas só saem num pedido feito logado nelas."
      >
        <ul className="nx-lista-dados">
          {dados.vinculos.map((v) => (
            <li key={v.empresa + "-" + v.papel}>
              <strong>{v.empresa}</strong> — {v.papel}
              {v.desde ? ", desde " + formatDateTime(v.desde) : ""}
            </li>
          ))}
        </ul>
      </Bloco>

      <Bloco
        titulo="O que a casa guarda e não entrega"
        sub="Estas ausências são de propósito, e o motivo de cada uma está escrito abaixo."
      >
        <ul className="nx-lista-dados">
          {dados.naoIncluidos.map((n) => (
            <li key={n.campo}>
              <strong>{n.campo}</strong> — {n.motivo}
            </li>
          ))}
        </ul>
      </Bloco>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="field">
      <span className="field-label">{rotulo}</span>
      <span>{valor}</span>
    </div>
  );
}
