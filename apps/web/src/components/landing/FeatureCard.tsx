// Cartão de capacidade da vitrine. O texto e o ícone vêm do item FEATURE do
// CMS (meta.icone, até 8 caracteres); sem ícone cadastrado entra o glifo da
// casa na posição do item, para a grade nunca ficar com buraco.
const GLIFOS = ["⛨", "◈", "▤", "✦", "◫", "▣", "⬡", "❐"];

export interface CapacidadeView {
  icon: string;
  title: string;
  text: string;
  href?: string;
}

export function FeatureCard({ feature, index }: { feature: CapacidadeView; index: number }) {
  return (
    <div className={"feature-card card-surface rise rise-" + (5 + index)}>
      <span className="feature-icon" aria-hidden="true">
        {feature.icon || GLIFOS[index % GLIFOS.length]}
      </span>
      <h3>{feature.title}</h3>
      {feature.text && <p>{feature.text}</p>}
      {feature.href && (
        <a className="feature-link" href={feature.href} target={feature.href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
          Saiba mais
        </a>
      )}
    </div>
  );
}
