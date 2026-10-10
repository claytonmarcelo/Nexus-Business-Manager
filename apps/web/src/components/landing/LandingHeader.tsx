import { Link } from "react-router-dom";
import { Logo } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { LANDING_COPY } from "./copy";

export function LandingHeader() {
  return (
    <header className="landing-header rise rise-1">
      <div className="landing-brand">
        <Logo size={34} />
        <span className="landing-brand-name">{LANDING_COPY.brand}</span>
      </div>
      <nav className="landing-actions">
        <ThemeToggle />
        <Link to="/login" className="btn btn-brand">
          {LANDING_COPY.access}
        </Link>
      </nav>
    </header>
  );
}
