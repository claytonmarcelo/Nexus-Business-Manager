import { useCallback, useEffect, useState } from "react";
import { extractErrorMessage } from "../../lib/api";
import { notify } from "../../lib/notify";
import { EmptyState, ErrorState, LoadingInline } from "../StateView";
import { BotaoSalvar, Bloco, Campo, CampoArea, CampoLigado } from "./Campos";
import { lerLegais, salvarLegal, type DocumentoLegal, type KindLegal } from "../../lib/cmsApi";
import { slugPeloKind } from "../../lib/landingTypes";

// ===== Aba Textos legais =====
// Termos, Privacidade e LGPD só aparecem em /legal/… depois de publicados:
// enquanto o texto não existe a página pública diz isso, em vez de encher
// espaço com cláusula inventada por quem escreve a tela.

const ROTULOS: Record<KindLegal, { rotulo: string; sub: string }> = {
  TERMS: { rotulo: "Termos de uso", sub: "As regras de uso da plataforma." },
  PRIVACY: { rotulo: "Política de privacidade", sub: "Como os dados pessoais são tratados." },
  LGPD: { rotulo: "Tratamento de dados (LGPD)", sub: "O texto específico da lei brasileira." },
};

interface Rascunho {
  kind: KindLegal;
  title: string;
  content: string;
  published: boolean;
}

export function LegaisPanel({ podeEscrever }: { podeEscrever: boolean }) {
  const [docs, setDocs] = useState<DocumentoLegal[] | null>(null);
  const [aberto, setAberto] = useState<KindLegal>("TERMS");
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const lista = await lerLegais();
      setDocs(lista);
      // O rascunho nasce da primeira leitura. Depois disso a pessoa pode estar
      // editando, e recarregar não pode jogar o texto dela fora — por isso o
      // carregar só roda na montagem e na tentativa de recuperar o erro.
      const primeiro = lista[0];
      if (primeiro) {
        setAberto(primeiro.kind);
        setRascunho({
          kind: primeiro.kind,
          title: primeiro.title,
          content: primeiro.content,
          published: primeiro.published,
        });
      }
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function gravar(publicar?: boolean) {
    if (!rascunho) return;
    setOcupado(true);
    try {
      const salvo = await salvarLegal(rascunho.kind, {
        title: rascunho.title,
        content: rascunho.content,
        ...(publicar === undefined ? {} : { published: publicar }),
      });
      setRascunho({ kind: salvo.kind, title: salvo.title, content: salvo.content, published: salvo.published });
      setDocs((atual) => (atual ? atual.map((d) => (d.kind === salvo.kind ? salvo : d)) : atual));
      notify.success(salvo.published ? "Texto publicado no site." : "Rascunho salvo.");
    } catch (e) {
      notify.error(extractErrorMessage(e));
    } finally {
      setOcupado(false);
    }
  }

  if (carregando) return <LoadingInline label="Carregando os documentos…" />;
  if (erro) return <ErrorState message={erro} onRetry={carregar} />;
  if (!docs) return <EmptyState title="Nenhum documento legal" />;

  return (
    <div className="cms-painel">
      <div className="cms-tipos" role="group" aria-label="Documento legal">
        {docs.map((d) => (
          <button
            key={d.kind}
            type="button"
            className={"btn btn-sm " + (d.kind === aberto ? "btn-brand" : "btn-ghost")}
            aria-pressed={d.kind === aberto}
            onClick={() => {
              setAberto(d.kind);
              setRascunho({ kind: d.kind, title: d.title, content: d.content, published: d.published });
            }}
          >
            {ROTULOS[d.kind].rotulo}
            <span className="cms-mini-estado">{d.published ? "publicado" : "rascunho"}</span>
          </button>
        ))}
      </div>

      {rascunho && rascunho.kind === aberto ? (
        <Bloco
          titulo={ROTULOS[aberto].rotulo}
          sub={ROTULOS[aberto].sub}
          acao={
            <div className="row-actions">
              <BotaoSalvar
                desabilitado={!podeEscrever}
                ocupado={ocupado}
                rotulo="Salvar rascunho"
                neutra
                aoSalvar={() => void gravar()}
              />
              <BotaoSalvar
                desabilitado={!podeEscrever}
                ocupado={ocupado}
                rotulo={rascunho.published ? "Publicar de novo" : "Publicar no site"}
                aoSalvar={() => void gravar(true)}
              />
            </div>
          }
        >
          <div className="cms-grade">
            <Campo
              rotulo="Título do documento"
              valor={rascunho.title}
              maxLength={160}
              desabilitado={!podeEscrever}
              aoMudar={(v) => setRascunho({ ...rascunho, title: v })}
            />
            <CampoLigado
              rotulo="Publicado no site"
              valor={rascunho.published}
              desabilitado={!podeEscrever}
              dica={"Enquanto desligado, /legal/" + slugPeloKind(rascunho.kind) + " diz que o texto ainda não existe."}
              aoMudar={(v) => setRascunho({ ...rascunho, published: v })}
            />
            <div className="field field-full">
              <span className="field-label">Texto do documento</span>
              <textarea
                className="input cms-legal-texto"
                rows={18}
                value={rascunho.content}
                maxLength={60000}
                disabled={!podeEscrever}
                aria-label="Texto do documento"
                placeholder="Escreva o texto aqui. Cada parágrafo em uma linha em branco separada aparece como parágrafo no site."
                onChange={(e) => setRascunho({ ...rascunho, content: e.target.value })}
              />
              <span className="field-hint">
                {rascunho.content.length} caracteres · linha em branco separa parágrafo
              </span>
            </div>
            <CampoArea rotulo="Endereço público" valor={"/legal/" + slugPeloKind(rascunho.kind)} rows={1}
              desabilitado dica="Definido pelo tipo do documento." aoMudar={() => undefined} />
          </div>
        </Bloco>
      ) : null}
    </div>
  );
}
