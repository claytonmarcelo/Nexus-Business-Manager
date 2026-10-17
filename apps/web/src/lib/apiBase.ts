// O backend nasce com toda rota sob o prefixo `/api` — `/api/health`,
// `/api/auth/login`, `/api/public/landing`. O painel, servido pelo Vite em
// desenvolvimento, fala com a mesma origem e o proxy cuida do resto; publicado
// em outro endereço, quem instala é obrigado a dizer onde a API mora, e foi
// medido duas vezes o valor chegar como a origem nua (`https://painel.example`),
// o que manda as chamadas para `/health` e `/public/landing` num host que não
// tem essas rotas. A origem nua é completada aqui. Quem já escreveu o caminho
// inteiro passa reto.
export const PREFIXO_DA_API = "/api";

const ORIGEM_ABSOLUTA = /^https?:\/\//i;

export function urlBaseDaApi(valor: string | undefined): string {
  const bruto = (valor ?? "").trim().replace(/\/+$/, "");
  if (!bruto) return PREFIXO_DA_API;
  if (ORIGEM_ABSOLUTA.test(bruto) && !/\/api$/i.test(bruto)) return bruto + PREFIXO_DA_API;
  return bruto;
}
