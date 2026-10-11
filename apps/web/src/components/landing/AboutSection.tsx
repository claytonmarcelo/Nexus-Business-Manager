import { formatCurrency } from "../../lib/format";
import { numeroMeta, textoMeta, type ItemMetrica } from "../../lib/landingTypes";
import { SOBRE_LANDING } from "./copy";

// "Sobre" com texto do produto, não do vendedor: o que está no ar, o que ainda
// não chegou e como a interface se comporta. Nenhuma cifra aparece aqui a menos
// que o dono do site cadastre uma métrica de verdade na seção seguinte.
export function AboutSection({ metricas }: { metricas: ItemMetrica[] }) {
  return (
    // Sem métrica cadastrada a segunda coluna da grade ficaria vazia: a classe
    // abaixo devolve a linha inteira ao texto, com comprimento de leitura próprio.
    <section
      className={"landing-sobre" + (metricas.length > 0 ? "" : " landing-sobre-sem-metricas")}
      id="sobre"
      aria-label="Sobre o sistema"
    >
      <div className="landing-sobre-texto">
        <h2>{SOBRE_LANDING.titulo}</h2>
        {SOBRE_LANDING.paragrafos.map((paragrafo) => (
          <p key={paragrafo.slice(0, 24)}>{paragrafo}</p>
        ))}
      </div>
      {metricas.length > 0 && (
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

// O `meta` da métrica é o mesmo objeto validado pelo servidor: valor numérico
// (ou texto), formato e unidade. Formato desconhecido cai em número — nunca em
// um "R$ " na frente de um valor que não é dinheiro.
function valorDaMetrica(metrica: ItemMetrica): string {
  const formato = textoMeta(metrica.meta, "formato") || "numero";
  if (formato === "texto") return textoMeta(metrica.meta, "valor");
  const valor = numeroMeta(metrica.meta, "valor");
  if (valor === null) return "";
  if (formato === "moeda") return formatCurrency(valor);
  const base = new Intl.NumberFormat("pt-BR").format(valor);
  if (formato === "porcentagem") return `${base}%`;
  const unidade = textoMeta(metrica.meta, "unidade");
  return unidade ? `${base} ${unidade}` : base;
}
