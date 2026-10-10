import { Logo } from "../Logo";
import { LANDING_COPY } from "./copy";

// Herói com entrada escalonada (stagger): cada elemento sobe com um pequeno atraso,
// animando apenas transform/opacity para manter 60 FPS.
export function Hero() {
  return (
    <main className="landing-hero">
      <div className="landing-hero-inner">
        <span className="rise rise-1">
          <Logo size={210} animation="heartbeat" className="landing-logo" />
        </span>
        <p className="landing-eyebrow rise rise-2">{LANDING_COPY.eyebrow}</p>
        <h1 className="landing-title rise rise-3">{LANDING_COPY.title}</h1>
        <p className="landing-subtitle rise rise-4">{LANDING_COPY.subtitle}</p>
      </div>
    </main>
  );
}
