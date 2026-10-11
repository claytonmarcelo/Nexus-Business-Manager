// ===== O texto digitado vira número (Fase 3e da auditoria) =====
//
// O painel inteiro fazia `parseFloat(texto.replace(",", "."))`. Com uma vírgula
// isso resolve `1290,50` → 1290.5, mas com o ponto de milhar brasileiro quebra:
// `1.290,50` vira `1.290.50`, e `parseFloat` para no primeiro ponto devolvendo
// 1.29. Ninguém avisava: R$ 1.290,50 entrava como R$ 1,29 no pedido, no preço
// unitário e no lançamento financeiro — a nota saía certa de uma tela errada.
//
// Aqui o texto passa pela mesma regra da porta da API
// (`normalizarTextoMoeda`, em apps/api/src/lib/money.ts): ponto e vírgula juntos
// só podem significar milhar + decimal; vírgula sozinha é decimal; ponto sozinho
// é decimal. Não é coincidência — se as duas camadas adivinhassem cada uma do
// seu jeito, o mesmo valor digitado valeria coisas diferentes conforme o campo,
// e a divergência só apareceria depois de gravado.
//
// O que não é número tem duas saídas, e é para isso que existem as duas
// funções: `valorNumerico` devolve 0, como o `|| 0` dos chamadores fazia, e
// serve nos campos que já validam "maior que zero" na própria tela; `lerNumero`
// devolve `null` para quem precisa dizer "isso não é valor" em vez de gravar
// zero — é o caso do valor do lead, que hoje deixava a porta da API responder.
// Nulo aqui não é resposta válida em lugar nenhum: ou a tela reclama antes de
// enviar, ou o texto segue para a API reclamar com a mensagem do próprio campo.
//
// Uma escolha aceita de propósito: `1.290` sem vírgula vale 1,29 e não mil e
// duzentos e noventa. É o que a API já faz, é o que um número com três casas
// decimais significa, e a alternativa exigiria adivinhar pelo tamanho do grupo.
// O formato sem ambiguidade é `1290,50`.

/** Lê o texto do formulário como número. `null` é "não há número aí". */
export function lerNumero(valor: string | number | null | undefined): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const texto = (valor ?? "").trim();
  if (texto === "") return null;
  const temVirgula = texto.includes(",");
  const temPonto = texto.includes(".");
  const normalizado = temVirgula && temPonto
    ? texto.replace(/\./g, "").replace(",", ".")
    : temVirgula
      ? texto.replace(",", ".")
      : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

/** O texto do formulário para número. Aceita o que já era aceito e `1.290,50`. */
export function valorNumerico(valor: string | number | null | undefined): number {
  return lerNumero(valor) ?? 0;
}
