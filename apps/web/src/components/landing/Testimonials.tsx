import { numeroMeta, textoMeta, type ItemDepoimento } from "../../lib/landingTypes";

// Depoimentos saem do CMS e só existem se alguém cadastrou. A decisão de
// produto é explícita: nada de depoimento inventado enfeitando a vitrine — a
// seção inteira fica de fora quando a lista vem vazia.
export function Testimonials({ depoimentos }: { depoimentos: ItemDepoimento[] }) {
  if (depoimentos.length === 0) return null;
  return (
    <section className="landing-depoimentos" id="depoimentos" aria-label="Depoimentos">
      <h2>O que dizem quem usa</h2>
      <div className="landing-depoimentos-grid">
        {depoimentos.map((item) => (
          <figure className="landing-depoimento card-surface" key={item.id}>
            <Estrelas valor={numeroMeta(item.meta, "estrelas")} />
            <blockquote>{item.body || item.title}</blockquote>
            <figcaption>
              {item.author && <strong>{item.author}</strong>}
              {(item.role || textoMeta(item.meta, "empresa")) && (
                <span>{[item.role, textoMeta(item.meta, "empresa")].filter(Boolean).join(" · ")}</span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

// Estrelas cheias só até o valor cadastrado; sem nota, a linha não aparece
// (nota zero em depoimento é informação, não enfeite).
function Estrelas({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  const total = Math.max(0, Math.min(5, Math.round(valor)));
  return (
    <span className="landing-estrelas" role="img" aria-label={`${total} de 5`}>
      <span aria-hidden="true">{"★".repeat(total)}</span>
      <span aria-hidden="true" className="is-vazia">{"★".repeat(5 - total)}</span>
    </span>
  );
}
