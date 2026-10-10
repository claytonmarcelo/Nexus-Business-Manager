import { Logo } from "../Logo";
import { currentYear } from "../../lib/format";
import { LANDING_COPY } from "./copy";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <Logo size={24} />
      <span>© {currentYear()} {LANDING_COPY.footer.rights}</span>
      <span className="landing-footer-dev">{LANDING_COPY.footer.dev}</span>
    </footer>
  );
}
