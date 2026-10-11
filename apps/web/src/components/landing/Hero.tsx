import { Link } from "react-router-dom";
import { Logo } from "../Logo";
import type { ConfiguracaoHero } from "../../lib/landingTypes";

// Herói montado a partir do CMS: título, subtítulo e os dois chamados do
// bloco `hero`. A imagem de fundo é uma camada separada do véu, então o
// desfoque não borra o texto e o overlay não depende de cor fixa.
// Sem imagem cadastrada, volta o emblema animado de sempre.
export function Hero({
  headline,
  subheadline,
  hero,
}: {
  headline: string;
  subheadline: string;
  hero: ConfiguracaoHero;
}) {
  const temImagem = Boolean(hero.imagemUrl);
  return (
    <section className={"landing-hero" + (temImagem ? " has-image" : "")} aria-label="Apresentação">
      {temImagem && (
        <div
          className="landing-hero-bg"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${hero.imagemUrl})`,
            filter: hero.desfoque > 0 ? `blur(${hero.desfoque}px)` : undefined,
          }}
        />
      )}
      {temImagem && (
        <div className="landing-hero-veil" aria-hidden="true" style={{ opacity: hero.overlay }} />
      )}
      <div className="landing-hero-inner">
        {!temImagem && (
          <span className="rise rise-1">
            <Logo size={210} animation="heartbeat" className="landing-logo" />
          </span>
        )}
        {hero.eyebrow && <p className="landing-eyebrow rise rise-2">{hero.eyebrow}</p>}
        <h1 className="landing-title rise rise-3">{headline}</h1>
        <p className="landing-subtitle rise rise-4">{subheadline}</p>
        <div className="landing-cta-row rise rise-5">
          <Chamado texto={hero.ctaPrimario} rota={hero.rotaPrimario} primario />
          <Chamado texto={hero.ctaSecundario} rota={hero.rotaSecundario} />
        </div>
      </div>
    </section>
  );
}

// Rota interna (começa com "/") é Link do router; o resto é tratado como
// endereço externo e abre em nova aba com rel definido. Sem rota, sem botão:
// chamado que não leva a lugar nenhum é ruído na tela.
function Chamado({ texto, rota, primario }: { texto: string; rota: string; primario?: boolean }) {
  if (!texto || !rota) return null;
  const classe = "btn " + (primario ? "btn-brand" : "btn-ghost");
  if (rota.startsWith("/")) {
    return (
      <Link to={rota} className={classe}>
        {texto}
      </Link>
    );
  }
  return (
    <a href={rota} className={classe} target="_blank" rel="noopener noreferrer">
      {texto}
    </a>
  );
}
