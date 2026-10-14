// T3.5 (F4): o destino para onde o login manda a pessoa depois de entrar.
//
// A tela guarda em `location.state.from` o caminho que a pessoa queria abrir
// antes de o ProtectedRoute mandá-la para o login. Esse valor vem da navegação
// interna, mas a mesma propriedade pode chegar escrita por um link colado —
// `/login?de=https://fulano.com/#//painel` — e um `navigate(candidato)` com um
// texto que começa com `//` é uma saída do site: o navegador lê `//dominio` como
// "mesmo protocolo, aquele host", e `javascript:` como código para executar.
//
// A regra é curta e não tem exceção: só volta para onde a pessoa queria se
// "onde" for um caminho deste mesmo aplicativo. Qualquer outra coisa é `/app`.

export const DESTINO_PADRAO = "/app";

export function destinoSeguro(candidato: unknown): string {
  if (typeof candidato !== "string") return DESTINO_PADRAO;
  // Sem espaços no começo: " //malicioso" passa no teste do "/" e vira "//"
  // depois que o navegador corta o que sobrar.
  const texto = candidato.trim();
  if (!texto.startsWith("/")) return DESTINO_PADRAO;
  // "//" é protocolo-relativo; "/\" é o mesmo truque com barra invertida, que o
  // URL Standard normaliza para barra comum antes de navegar.
  if (texto.startsWith("//") || texto.startsWith("/\\")) return DESTINO_PADRAO;

  // Nada de esquema escondido adiante ("javascript:", "data:") — um caminho
  // legítimo do painel nunca tem dois-pontos na primeira posição de esquema.
  if (/^[a-z][a-z0-9+.-]*:/i.test(texto.replace(/^\//, ""))) return DESTINO_PADRAO;
  return texto;
}
