import { useCallback, useEffect, useState } from "react";
import { extractErrorMessage } from "../../lib/api";
import { notify } from "../../lib/notify";
import {
  ativarComCodigo,
  desativarComCodigo,
  prepararSegredo,
  statusDoSegundoFator,
  type StatusSegundoFator,
} from "../../lib/segundoFator";
import { Bloco, BotaoSalvar, Campo } from "../Fields";

// ===== Aba "Minha conta": segundo fator (decisão D3) =====
//
// A tela mostra o segredo uma única vez, na resposta que o gera, e não guarda
// cópia nenhuma: quem fechar o painel sem confirmar tem de gerar outro. Isso é
// decisão de segurança, não descuido — um segredo visível em duas telas ao mesmo
// tempo é um segredo que ninguém sabe se ainda é segredo.
//
// Desligar pede um código válido, nunca a senha. O ataque típico ao segundo fator
// não é chutar os seis dígitos: é ter a senha (vazada em outro site) e ir
// desligar o que falta. Se a senha bastasse, o segundo fator protegeria só até a
// primeira senha vazada.

type Passo = "inicial" | "configurando" | "codigos";

export function SegundoFatorPanel() {
  const [status, setStatus] = useState<StatusSegundoFator | null>(null);
  const [passo, setPasso] = useState<Passo>("inicial");
  const [segredo, setSegredo] = useState<{ segredoBase32: string; uri: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  const [codigoDesligar, setCodigoDesligar] = useState("");
  const [codigos, setCodigos] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setStatus(await statusDoSegundoFator());
    } catch (e) {
      setErro(extractErrorMessage(e, "Não foi possível ler o estado do segundo fator."));
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gerar() {
    setOcupado(true);
    setErro(null);
    try {
      const preparado = await prepararSegredo();
      setSegredo({ segredoBase32: preparado.segredoBase32, uri: preparado.uri });
      setPasso("configurando");
    } catch (e) {
      setErro(extractErrorMessage(e, "O segundo fator não está disponível neste ambiente."));
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    setOcupado(true);
    setErro(null);
    try {
      const ativado = await ativarComCodigo(codigo.trim());
      setCodigos(ativado.codigosDeRecuperacao);
      setCodigo("");
      setSegredo(null);
      setPasso("codigos");
      await carregar();
      notify.success("Segundo fator ativado. Guarde os códigos de recuperação.");
    } catch (e) {
      setErro(extractErrorMessage(e, "Código inválido. Confira o horário do aparelho."));
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    setErro(null);
    try {
      await desativarComCodigo(codigoDesligar.trim());
      setCodigoDesligar("");
      await carregar();
      notify.success("Segundo fator desligado. As sessões abertas continuam valendo.");
    } catch (e) {
      setErro(extractErrorMessage(e, "Não foi possível desligar."));
    } finally {
      setOcupado(false);
    }
  }

  function voltar() {
    setPasso("inicial");
    setSegredo(null);
    setCodigo("");
    setErro(null);
  }

  const titulo = !status
    ? "Segundo fator"
    : status.ligado
      ? "Segundo fator ligado"
      : status.pendente
        ? "Segundo fator aguardando confirmação"
        : "Segundo fator desligado";

  const sub = !status
    ? "Lendo o estado da sua conta…"
    : status.ligado
      ? "A senha sozinha não entra mais. Restam " +
        status.codigosRestantes +
        (status.codigosRestantes === 1 ? " código de recuperação." : " códigos de recuperação.")
      : "Um aplicativo autenticador no celular é a segunda chave da conta. " +
        (status.obrigatorio
          ? "Para o seu papel, neste ambiente, ela é obrigatória."
          : "Aqui é escolha sua — ligar é o que fecha a porta da senha vazada.");

  return (
    <Bloco
      titulo={titulo}
      sub={sub}
      acao={
        passo === "inicial" && status && !status.ligado ? (
          <BotaoSalvar
            aoSalvar={gerar}
            ocupado={ocupado}
            rotulo={status.pendente ? "GERAR NOVO SEGREDO" : "ATIVAR SEGUNDO FATOR"}
            neutra
          />
        ) : null
      }
    >
      {erro ? <p className="field-error" role="alert">{erro}</p> : null}

      {passo === "configurando" && segredo ? (
        <div className="nx-2fa">
          <p className="nx-bloco-sub">
            Abra o aplicativo autenticador, escolha "adicionar conta" e digite a chave abaixo.
            Ela aparece uma única vez — depois de confirmar o código, não há como vê-la de novo.
          </p>
          <p className="nx-2fa-segredo">{segredo.segredoBase32}</p>
          <details className="nx-2fa-uri">
            <summary>Endereço de configuração (para copiar em outro aparelho)</summary>
            <p>{segredo.uri}</p>
          </details>
          <div className="nx-grade">
            <Campo
              rotulo="Código do aplicativo"
              valor={codigo}
              aoMudar={setCodigo}
              placeholder="123456"
              maxLength={12}
              dica="Seis dígitos, ou um código de recuperação no formato abcde-fghij."
            />
          </div>
          <div className="nx-2fa-acoes">
            <BotaoSalvar aoSalvar={confirmar} ocupado={ocupado} rotulo="CONFIRMAR E LIGAR" desabilitado={codigo.trim().length === 0} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={voltar} disabled={ocupado}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {passo === "codigos" ? (
        <div className="nx-2fa">
          <p className="nx-bloco-sub">
            Guarde estes dez códigos fora do navegador. Cada um abre a porta uma única vez, se o
            aplicativo não estiver à mão — depois de usados, não aparecem mais aqui.
          </p>
          <ol className="nx-2fa-codigos">
            {codigos.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
          <button type="button" className="btn btn-brand btn-sm" onClick={() => setPasso("inicial")}>
            ANOTEI, PODE FECHAR
          </button>
        </div>
      ) : null}

      {passo === "inicial" && status?.ligado ? (
        status.obrigatorio ? (
          <p className="nx-bloco-sub">
            Neste ambiente o segundo fator é obrigatório para o seu papel e não pode ser desligado
            pela tela. A decisão está registrada em docs/decisoes (D3).
          </p>
        ) : (
          <div className="nx-grade">
            <Campo
              rotulo="Código para desligar"
              valor={codigoDesligar}
              aoMudar={setCodigoDesligar}
              placeholder="123456"
              maxLength={12}
              dica="Desligar exige o código do aplicativo, não a senha."
            />
            <div className="nx-2fa-acoes">
              <BotaoSalvar
                aoSalvar={desligar}
                ocupado={ocupado}
                rotulo="DESLIGAR O SEGUNDO FATOR"
                desabilitado={codigoDesligar.trim().length === 0}
                neutra
              />
            </div>
          </div>
        )
      ) : null}
    </Bloco>
  );
}
