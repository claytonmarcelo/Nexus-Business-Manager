import { Link } from "react-router-dom";
import { Logo } from "../Logo";
import { currentYear } from "../../lib/format";
import { slugPeloKind, type ResumoLegal } from "../../lib/landingTypes";
import { LANDING_COPY } from "./copy";

// Rodapé da vitrine: marca, ano, crédito e os textos legais que de fato estão
// publicados. Documento guardado na mesa não vira link que leva a um 404.
export function LandingFooter({ legais }: { legais: ResumoLegal[] }) {
  const publicados = legais.filter((doc) => doc.published);
  return (
    <footer className="landing-footer">
      <Logo size={24} />
      <span>
        © {currentYear()} {LANDING_COPY.footer.rights}
      </span>
      {publicados.length > 0 && (
        <nav className="landing-footer-legais" aria-label="Documentos legais">
          {publicados.map((doc) => (
            <Link key={doc.kind} to={`/legal/${slugPeloKind(doc.kind)}`}>
              {doc.title}
            </Link>
          ))}
        </nav>
      )}
      <span className="landing-footer-dev">{LANDING_COPY.footer.dev}</span>
    </footer>
  );
}
