import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppFooter } from "../components/layout/AppFooter";
import { LandingHeader } from "../components/landing/LandingHeader";
import { ErrorState, Skeleton } from "../components/StateView";
import { extractErrorMessage } from "../lib/api";
import { lerDocumentoPublico } from "../lib/landingApi";
import { kindPeloSlug, type DocumentoLegal } from "../lib/landingTypes";

// Textos legais publicados pelo CMS (Termos, Privacidade, LGPD). O slug é o
// único endereço aceito: kind desconhecido nem chega à requisição. Enquanto o
// documento não estiver publicado a API responde 404, e a tela diz isso.
export function Legal() {
  const { slug } = useParams();
  const kind = kindPeloSlug(slug);
  const [doc, setDoc] = useState<DocumentoLegal | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) {
      setErro("Esse documento não existe.");
      return undefined;
    }
    let vivo = true;
    setErro(null);
    void lerDocumentoPublico(kind)
      .then((documento) => {
        if (vivo) setDoc(documento);
      })
      .catch((err: unknown) => {
        if (vivo) setErro(extractErrorMessage(err, "Documento ainda não publicado."));
      });
    return () => {
      vivo = false;
    };
  }, [kind]);

  return (
    <div className="app-bg landing">
      <LandingHeader />
      <main id="conteudo" className="landing-main landing-legal">
        <article className="card-surface">
          <Link to="/" className="landing-legal-volta">
            ← Voltar para o site
          </Link>
          {erro && !doc && <ErrorState message={erro} />}
          {!erro && !doc && <Skeleton rows={6} />}
          {doc && (
            <>
              <h1>{doc.title}</h1>
              {doc.content ? (
                doc.content
                  .split(/\n{2,}/)
                  .filter((bloco) => bloco.trim().length > 0)
                  .map((bloco, index) => <p key={index}>{bloco.trim()}</p>)
              ) : (
                <p>Este documento ainda não tem texto publicado.</p>
              )}
            </>
          )}
        </article>
      </main>
      <AppFooter legais={doc ? [{ kind: doc.kind, title: doc.title, published: true }] : []} contexto="vitrine" />
    </div>
  );
}
