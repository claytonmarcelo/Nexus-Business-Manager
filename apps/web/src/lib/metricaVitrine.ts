import { formatCurrency } from "./format";
import { numeroMeta, textoMeta, type ItemMetrica } from "./landingTypes";

// O `meta` da métrica é o mesmo objeto validado pelo servidor: valor numérico
// (ou texto), formato e unidade. Formato desconhecido cai em número — nunca em
// um "R$ " na frente de um valor que não é dinheiro.
//
// Foi para um módulo próprio porque é lógica de exibição com quatro caminhos, e
// é aqui que um teste de unidade alcança cada um deles. A prova de navegador só
// consegue mostrar o que a API aceita cadastrar, e a API aceita número em
// `valor` — deixar o moeda na tela significaria publicar um valor inventado.
export function valorDaMetrica(metrica: ItemMetrica): string {
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
