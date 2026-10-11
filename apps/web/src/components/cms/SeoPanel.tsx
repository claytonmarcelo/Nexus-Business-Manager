import { useCallback, useEffect, useState } from "react";
import { extractErrorMessage } from "../../lib/api";
import { notify } from "../../lib/notify";
import { LoadingInline } from "../StateView";
import { BotaoSalvar, Bloco, Campo, CampoArea } from "../Fields";
import { lerNotaSeo, type ConfiguracaoEditor, type MudancaConfig, type NotaSeo } from "../../lib/cmsApi";

// ===== Aba SEO =====
// A nota não é enfeite: ela vem do GET /cms/seo/score, que percorre doze
// checagens sobre o payload que está de fato publicado. Salvar um campo e não
// recalcular a nota deixaria a tela mentindo sobre o próprio resultado.

interface Props {
  config: ConfiguracaoEditor;
  podeEscrever: boolean;
  salvar: (mudanca: MudancaConfig) => Promise<void>;
}

const CAMPOS: { chave: keyof ConfiguracaoEditor["seo"]; rotulo: string; dica: string; area?: boolean }[] = [
  { chave: "titulo", rotulo: "Título (title)", dica: "30 a 60 caracteres. É o que aparece no Google." },
  { chave: "descricao", rotulo: "Meta description", dica: "70 a 160 caracteres.", area: true },
  { chave: "palavrasChave", rotulo: "Palavras-chave", dica: "De 3 a 12 termos separados por vírgula." },
  { chave: "ogTitulo", rotulo: "og:title", dica: "Título ao compartilhar no WhatsApp e nas redes." },
  { chave: "ogDescricao", rotulo: "og:description", dica: "Descrição de compartilhamento.", area: true },
  { chave: "ogImagem", rotulo: "og:image", dica: "URL absoluta https de uma imagem 1200x630." },
  { chave: "twitterCard", rotulo: "twitter:card", dica: "summary_large_image para aparecer com imagem." },
  { chave: "canonica", rotulo: "URL canônica", dica: "O endereço definitivo da página, com https." },
  { chave: "robots", rotulo: "robots", dica: "index, follow para a página ser encontrada." },
];

// A API devolve o nível em português legível ("atenção", "crítico"). O nome da
// classe não leva acento, senão o .is-atencao do cms.css nunca casaria e a
// nota perderia a cor justamente nos níveis que pedem cuidado.
const CLASSES_NIVEL: Record<string, string> = {
  excelente: "excelente",
  bom: "bom",
  "atenção": "atencao",
  "crítico": "critico",
};

function classeNivel(nivel: string): string {
  return CLASSES_NIVEL[nivel] ?? nivel.toLowerCase().replace(/\s+/g, "-");
}

export function SeoPanel({ config, podeEscrever, salvar }: Props) {
  const [seo, setSeo] = useState(config.seo);
  const [nota, setNota] = useState<NotaSeo | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [calculando, setCalculando] = useState(true);

  useEffect(() => setSeo(config.seo), [config.seo]);

  const calcular = useCallback(async () => {
    setCalculando(true);
    try {
      setNota(await lerNotaSeo());
    } catch (e) {
      notify.error(extractErrorMessage(e));
    } finally {
      setCalculando(false);
    }
  }, []);

  useEffect(() => {
    void calcular();
  }, [calcular]);

  async function gravar() {
    setOcupado(true);
    try {
      await salvar({ seo });
      await calcular();
      notify.success("SEO salvo e nota recalculada.");
    } catch (e) {
      notify.error(extractErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="nx-painel">
      <section className="card-surface panel cms-nota">
        <div>
          <h2 className="panel-title">Nota da vitrine</h2>
          <p className="nx-bloco-sub">
            Doze checagens sobre o que está publicado agora — nada de pontuação de enfeite.
          </p>
        </div>
        {calculando ? (
          <LoadingInline label="Medindo o que está publicado…" />
        ) : nota ? (
          <div className="cms-nota-corpo">
            <span className={"cms-nota-num is-" + classeNivel(nota.nivel)}>{nota.nota}</span>
            <div>
              <p className="cms-nota-nivel">{nota.nivel}</p>
              <p className="nx-bloco-sub">
                {nota.pontos} de {nota.total} pontos · {nota.itens.filter((i) => !i.alcancado).length} pendência(s)
              </p>
            </div>
          </div>
        ) : (
          <p className="nx-bloco-sub">A nota não pôde ser lida.</p>
        )}
      </section>

      <Bloco
        titulo="Metadados da página pública"
        sub="Estes campos alimentam o <head> da vitrine: título, descrição, compartilhamento e indexação."
        acao={
          <BotaoSalvar
            desabilitado={!podeEscrever}
            ocupado={ocupado}
            aoSalvar={() => void gravar()}
          />
        }
      >
        <div className="nx-grade">
          {CAMPOS.map((c) => {
            const max = c.chave === "descricao" || c.chave === "ogDescricao" ? 400 : 180;
            const mudar = (v: string) => setSeo((atual) => ({ ...atual, [c.chave]: v }));
            // Descrição se escreve em frase inteira: campo de uma linha para 160
            // caracteres faria a pessoa rolar o texto na horizontal.
            return c.area ? (
              <CampoArea
                key={c.chave}
                rotulo={c.rotulo}
                valor={seo[c.chave]}
                rows={3}
                maxLength={max}
                desabilitado={!podeEscrever}
                dica={c.dica}
                aoMudar={mudar}
              />
            ) : (
              <Campo
                key={c.chave}
                rotulo={c.rotulo}
                valor={seo[c.chave]}
                maxLength={max}
                desabilitado={!podeEscrever}
                dica={c.dica}
                aoMudar={mudar}
              />
            );
          })}
        </div>
      </Bloco>

      {nota ? (
        <Bloco titulo="O que falta" sub="Cada linha é uma checagem da API, com o peso que ela tem na nota.">
          <ul className="cms-checagens">
            {nota.itens.map((i) => (
              <li key={i.item} className={"cms-checagem " + (i.alcancado ? "is-ok" : "is-falta")}>
                <span className="cms-checagem-marca" aria-hidden="true">{i.alcancado ? "✓" : "!"}</span>
                <span className="cms-checagem-item">{i.item}</span>
                <span className="cms-checagem-peso">{i.peso} pts</span>
                <span className="cms-checagem-dica">{i.dica}</span>
              </li>
            ))}
          </ul>
        </Bloco>
      ) : null}
    </div>
  );
}
