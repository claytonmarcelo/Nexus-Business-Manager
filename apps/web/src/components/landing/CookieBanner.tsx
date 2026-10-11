import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COOKIES_LANDING } from "./copy";

const CHAVE = "nexus.cookies-aviso";

// Aviso de cookies honesto: o site não planta cookie de terceiros, e o que
// existe no navegador (tema e sessão) é dito no texto. A escolha fica guardada
// para o mesmo aviso não voltar a cada visita.
export function CookieBanner({ legalPublicado }: { legalPublicado: boolean }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      setVisivel(!localStorage.getItem(CHAVE));
    } catch {
      setVisivel(true);
    }
  }, []);

  if (!visivel) return null;

  function encerrar() {
    try {
      localStorage.setItem(CHAVE, "ciente");
    } catch {
      /* modo privado: o aviso só não desaparece na próxima visita */
    }
    setVisivel(false);
  }

  return (
    <aside className="landing-cookies" role="region" aria-label="Aviso sobre cookies">
      <p>{COOKIES_LANDING.texto}</p>
      <div className="landing-cookies-acoes">
        <button type="button" className="btn btn-brand btn-sm" onClick={encerrar}>
          {COOKIES_LANDING.acao}
        </button>
        {legalPublicado && (
          <Link className="landing-cookies-link" to="/legal/privacidade">
            Política de privacidade
          </Link>
        )}
      </div>
    </aside>
  );
}
