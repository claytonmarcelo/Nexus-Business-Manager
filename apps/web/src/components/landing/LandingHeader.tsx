import { Link } from "react-router-dom";
import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { LANDING_COPY } from "./copy";

// Cabeçalho da vitrine: a marca de um lado e, do outro, o tema e a porta de
// entrada. As âncoras de seção saíram daqui — com o conteúdo vindo do banco, a
// lista de links dependia do que estava cadastrado, e um cabeçalho que muda de
// forma a cada item ligado ou desligado não é a vitrine que a casa quer mostrar.
// O link do logo leva ao topo, não ao /app, porque quem chegou sem conta ainda
// não tem para onde ir.
export function LandingHeader() {
  return (
    <header className="landing-header rise rise-1">
      <div className="landing-brand">
        <Logo size={34} />
        <span className="landing-brand-name">{LANDING_COPY.brand}</span>
      </div>
      <nav className="landing-actions" aria-label="Tema e acesso">
        <ThemeToggle />
        <Link to="/login" className="btn btn-brand">
          {LANDING_COPY.access}
        </Link>
      </nav>
    </header>
  );
}
