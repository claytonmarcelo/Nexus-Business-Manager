import { Link } from "react-router-dom";
import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { LANDING_COPY } from "./copy";

export interface SecaoAncora {
  id: string;
  rotulo: string;
}

// Cabeçalho da vitrine. As âncoras chegam prontas da página, calculadas com o
// que de fato existe no conteúdo publicado: uma âncora para seção vazia é
// link quebrado. O link do logo leva ao topo, não ao /app, porque quem chegou
// sem conta ainda não tem para onde ir.
export function LandingHeader({ secoes }: { secoes: SecaoAncora[] }) {
  return (
    <header className="landing-header rise rise-1">
      <div className="landing-brand">
        <Logo size={34} />
        <span className="landing-brand-name">{LANDING_COPY.brand}</span>
      </div>
      {secoes.length > 0 && (
        <nav className="landing-nav" aria-label="Seções da página">
          {secoes.map((secao) => (
            <a key={secao.id} href={`#${secao.id}`}>
              {secao.rotulo}
            </a>
          ))}
        </nav>
      )}
      <nav className="landing-actions">
        <ThemeToggle />
        <Link to="/login" className="btn btn-brand">
          {LANDING_COPY.access}
        </Link>
      </nav>
    </header>
  );
}
