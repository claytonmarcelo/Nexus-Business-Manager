import { valorDaMetrica } from "../../lib/metricaVitrine";
import type { ItemMetrica } from "../../lib/landingTypes";
import { SOBRE_LANDING } from "./copy";

// "Sobre" com texto do produto, não do vendedor: o que está no ar, o que ainda
// não chegou e como a interface se comporta. Nenhuma cifra aparece aqui a menos
// que o dono do site cadastre uma métrica de verdade na seção seguinte.
export function AboutSection({ metricas }: { metricas: ItemMetrica[] }) {
  return (
    // Duas colunas de leitura, e as duas com conteúdo: o título abre a esquerda
    // com o parágrafo de apresentação embaixo dele, e os três parágrafos
    // seguintes ocupam a direita. Com o título sozinho naquela coluna a linha
    // media 450px de altura contra 63px de conteúdo — os ~380px em branco embaixo
    // do título eram o espaço vazio que a vitrine mostrava aqui.
    <section className="landing-sobre" id="sobre" aria-label="Sobre o sistema">
      <div className="landing-sobre-titulo">
        <h2>{SOBRE_LANDING.titulo}</h2>
        {/* A abertura é a frase que apresenta o produto: fica junto do título,
            não no topo da coluna do detalhe. */}
        <p className="landing-sobre-lead">{SOBRE_LANDING.paragrafos[0]}</p>
      </div>
      <div className="landing-sobre-texto">
        {SOBRE_LANDING.paragrafos.slice(1).map((paragrafo) => (
          <p key={paragrafo.slice(0, 24)}>{paragrafo}</p>
        ))}
      </div>
      {metricas.length > 0 && (
        // As métricas, quando o dono cadastra, atravessam a linha inteira em
        // faixa — embaixo das duas colunas, para não brigar com o texto.
        <ul className="landing-metricas" aria-label="Números do produto">
          {metricas.map((metrica) => (
            <li className="card-surface" key={metrica.id}>
              <strong>{valorDaMetrica(metrica)}</strong>
              <span>{metrica.title}</span>
              {metrica.body && <small>{metrica.body}</small>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
