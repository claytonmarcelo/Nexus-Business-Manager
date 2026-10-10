import { LANDING_COPY } from "./copy";

type Feature = (typeof LANDING_COPY.features)[number];

export function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <div className={"feature-card card-surface rise rise-" + (5 + index)}>
      <span className="feature-icon" aria-hidden="true">{feature.icon}</span>
      <h3>{feature.title}</h3>
      <p>{feature.text}</p>
    </div>
  );
}
