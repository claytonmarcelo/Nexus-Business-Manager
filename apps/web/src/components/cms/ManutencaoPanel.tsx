import { useEffect, useState } from "react";
import { extractErrorMessage } from "../../lib/api";
import { notify } from "../../lib/notify";
import { confirmAction } from "../../lib/confirm";
import { BotaoSalvar, Bloco, Campo, CampoArea, CampoLigado } from "../Fields";
import { gerarPulso, type ConfiguracaoEditor, type ManutencaoConfig, type MudancaConfig } from "../../lib/cmsApi";

// ===== Aba Manutenção =====
// Fechar a plataforma é a ação mais pesada que este editor faz: todo visitante
// cai na tela de manutenção, e a API de negócio devolve 503. Por isso o
// ligar pede confirmação, o desligar não (ninguém reclama de abrir), e o
// código de acesso aparece uma única vez — o servidor guarda só o valor.

const IPV4 = /^[0-9]{1,3}(\.[0-9]{1,3}){3}$/;

function paraLocal(iso: string | null): string {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const dois = (n: number) => String(n).padStart(2, "0");
  return data.getFullYear() + "-" + dois(data.getMonth() + 1) + "-" + dois(data.getDate()) +
    "T" + dois(data.getHours()) + ":" + dois(data.getMinutes());
}

function paraIso(local: string): string | null {
  if (!local) return null;
  const data = new Date(local);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

interface Props {
  config: ConfiguracaoEditor;
  podeEscrever: boolean;
  salvar: (mudanca: MudancaConfig) => Promise<void>;
}

export function ManutencaoPanel({ config, podeEscrever, salvar }: Props) {
  const [manutencao, setManutencao] = useState<ManutencaoConfig>(config.manutencao);
  const [ips, setIps] = useState(config.manutencao.ipsPermitidos.join(", "));
  const [pulsoNovo, setPulsoNovo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [gerando, setGerando] = useState(false);

  // O servidor é a fonte: depois de qualquer gravação o bloco volta dele.
  useEffect(() => {
    setManutencao(config.manutencao);
    setIps(config.manutencao.ipsPermitidos.join(", "));
  }, [config.manutencao]);

  const mudar = <K extends keyof ManutencaoConfig>(chave: K, valor: ManutencaoConfig[K]) =>
    setManutencao((atual) => ({ ...atual, [chave]: valor }));

  async function gravar(mudanca?: Partial<ManutencaoConfig>) {
    setOcupado(true);
    try {
      const listaIps = ips
        .split(/[\s,]+/)
        .map((v) => v.trim())
        .filter(Boolean);
      const invalido = listaIps.find((v) => !IPV4.test(v));
      if (invalido) {
        notify.error("Endereço de IP inválido: " + invalido + ". Use IPv4, como 203.0.113.10.");
        return;
      }
      await salvar({
        // O previsaoEm já chega ISO do campo de data (paraIso), então o bloco
        // vai como está: o servidor só precisa do merge com os outros blocos.
        manutencao: { ...manutencao, ...mudanca, ipsPermitidos: listaIps },
      });
      notify.success("Modo manutenção atualizado.");
    } catch (e) {
      notify.error(extractErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  }

  async function ligar() {
    const confirmado = await confirmAction({
      title: "Fechar o site para manutenção",
      text: "Fechar o Nexus Business Manager para quem visita o site?",
      detalhe:
        "A página pública mostra a tela de manutenção e a API de negócio responde 503. " +
        "Quem já está logado no painel continua trabalhando; só a vitrine e as rotas de negócio fecham.",
      confirmLabel: "Fechar o site",
      danger: true,
      action: async () => {
        await gravar({ ativa: true });
      },
    });
    return confirmado;
  }

  async function gerarCodigo() {
    setGerando(true);
    try {
      const token = await gerarPulso();
      setPulsoNovo(token);
      notify.success("Código gerado. Ele vale até o próximo clique.");
    } catch (e) {
      notify.error(extractErrorMessage(e));
    } finally {
      setGerando(false);
    }
  }

  const ativa = manutencao.ativa;
  // O rótulo do botão acompanha o rascunho, não o que já está salvo: quem
  // desmarca o interruptor para reabrir o site precisa ver "Abrir o site" e
  // clicar nisso — um botão que ainda se chamasse "Fechar o site" estaria
  // prometendo o contrário do que a pessoa acabou de escolher.
  const vaiFechar = ativa && !config.manutencao.ativa;
  const vaiAbrir = !ativa && config.manutencao.ativa;
  const rotuloAcao = vaiFechar ? "Fechar o site" : vaiAbrir ? "Abrir o site" : "Salvar";

  return (
    <div className="nx-painel">
      <section className={"cms-alerta-manutencao " + (ativa ? "is-ativa" : "is-aberta")}>
        <span className="cms-alerta-marca" aria-hidden="true">{ativa ? "⚠" : "✓"}</span>
        <div>
          <p className="cms-alerta-titulo">
            {ativa ? "O site está fechado para manutenção." : "O site está aberto para qualquer visitante."}
          </p>
          <p className="nx-bloco-sub">
            {ativa
              ? "Quem abre a página pública vê a tela de manutenção com a mensagem e a contagem regressiva abaixo."
              : "Nenhuma rota de negócio está bloqueada."}
          </p>
        </div>
      </section>

      <Bloco
        titulo="Fechar ou abrir a plataforma"
        sub="As rotas /api/health, /api/auth, /api/public e /api/cms continuam abertas: é por ali que se desliga o modo."
        acao={
          <BotaoSalvar
            desabilitado={!podeEscrever}
            ocupado={ocupado}
            aoSalvar={() => (vaiFechar ? void ligar() : void gravar())}
            rotulo={rotuloAcao}
          />
        }
      >
        <div className="nx-grade">
          <CampoLigado
            rotulo="Manutenção ativa"
            valor={ativa}
            desabilitado={!podeEscrever}
            dica="Desmarcar e salvar abre o site na hora."
            aoMudar={(v) => mudar("ativa", v)}
          />
          <CampoArea
            rotulo="Mensagem da tela"
            valor={manutencao.mensagem}
            rows={3}
            maxLength={400}
            desabilitado={!podeEscrever}
            dica="De 3 a 400 caracteres. É o que o visitante lê."
            aoMudar={(v) => mudar("mensagem", v)}
          />
          <Campo
            rotulo="Previsão escrita"
            valor={manutencao.previsao}
            maxLength={120}
            desabilitado={!podeEscrever}
            dica="Texto livre, como 'voltamos em 40 minutos'."
            aoMudar={(v) => mudar("previsao", v)}
          />
          <Campo
            rotulo="Previsão de volta (data e hora)"
            type="datetime-local"
            valor={paraLocal(manutencao.previsaoEm)}
            desabilitado={!podeEscrever}
            dica="Alimenta a contagem regressiva da tela. Vazio deixa só a mensagem."
            aoMudar={(v) => mudar("previsaoEm", paraIso(v))}
          />
          <div className="field field-full">
            <span className="field-label">IPs que entram mesmo fechado</span>
            <textarea
              className="input"
              rows={2}
              value={ips}
              disabled={!podeEscrever}
              aria-label="IPs permitidos durante a manutenção"
              placeholder="203.0.113.10, 198.51.100.7"
              onChange={(e) => setIps(e.target.value)}
            />
            <span className="field-hint">
              IPv4 separados por vírgula, até 20. Escritório e monitoração entram sem o código.
            </span>
          </div>
        </div>
      </Bloco>

      <Bloco
        titulo="Código de acesso"
        sub="Quem tem o código digita na tela de manutenção e o site abre naquela aba do navegador."
        acao={
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!podeEscrever || gerando}
            onClick={() => void gerarCodigo()}
          >
            {gerando ? "Gerando…" : "Gerar código"}
          </button>
        }
      >
        {pulsoNovo ? (
          <div className="cms-pulso is-novo">
            <p className="cms-pulso-aviso">
              Anote agora: este é o único momento em que o código aparece inteiro na tela.
            </p>
            <code className="cms-pulso-codigo">{pulsoNovo}</code>
          </div>
        ) : (
          <p className="nx-bloco-sub">
            {manutencao.tokenPulso
              ? "Existe um código válido hoje: " + manutencao.tokenPulso.slice(0, 4) + "…"
              : "Nenhum código gerado ainda. Sem código, só entra quem vem de um IP permitido."}
          </p>
        )}
      </Bloco>
    </div>
  );
}
