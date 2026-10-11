import type { ItemFaq } from "../../lib/landingTypes";

// FAQ em <details>: o navegador entrega expansão, foco e leitura de tela sem
// uma linha de estado nosso. A primeira pergunta vem aberta para a seção não
// parecer um botão sozinho.
export function FaqAccordion({ faqs }: { faqs: ItemFaq[] }) {
  if (faqs.length === 0) return null;
  return (
    <section className="landing-faqs" id="faqs" aria-label="Dúvidas frequentes">
      <h2>Dúvidas frequentes</h2>
      <div className="landing-faqs-lista">
        {faqs.map((faq, index) => (
          <details className="card-surface" key={faq.id} open={index === 0}>
            <summary>{faq.title}</summary>
            {faq.body && <p>{faq.body}</p>}
          </details>
        ))}
      </div>
    </section>
  );
}
