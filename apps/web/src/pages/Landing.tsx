import { LandingHeader } from "../components/landing/LandingHeader";
import { Hero } from "../components/landing/Hero";
import { FeatureCard } from "../components/landing/FeatureCard";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LANDING_COPY } from "../components/landing/copy";

// Página pública: apenas composição. Textos vivem em landing/copy.ts,
// comportamento visual nos componentes e no design system.
export function Landing() {
  return (
    <div className="app-bg landing">
      <LandingHeader />
      <Hero />
      <section id="recursos" className="landing-features" aria-label="Recursos do sistema">
        {LANDING_COPY.features.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </section>
      <LandingFooter />
    </div>
  );
}
