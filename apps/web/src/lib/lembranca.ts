// F5, item 1 (Problema C): a unica coisa que a tela de entrada deixa neste
// navegador e o e-mail de quem marcou "lembrar de mim". Senha nunca passa por
// aqui — nem hoje, nem "cifrada", nem "so ate a aba fechar".
//
// O morador desta chave e o proprio navegador, e a regra de vida dela e curta:
// nasce quando a pessoa entra com a caixa marcada, e morre no primeiro instante
// em que a sessao acaba — pelo botao, por expiracao, por logout em outra aba ou
// por uma renovacao que nao passou mais. E por isso que o tokenStore chama
// esquecaEMailLembrado() no clear(): quem apaga o rastro da sessao apaga tambem
// a identidade que a lembrava.
//
// O e-mail gravado jamais aparece no campo: a tela monta vazia de proposito e
// usa o valor em silencio quando a pessoa digita so a senha.

const LEMBRADO_KEY = "nexus.remember.email";

/** O e-mail lembrado deste navegador, ou null quando nao ha ninguno. */
export function leiaEMailLembrado(): string | null {
  try {
    return localStorage.getItem(LEMBRADO_KEY);
  } catch {
    /* storage indisponível (modo privado) */
    return null;
  }
}

/** Guarda o e-mail escolhido pela pessoa. Só e-mail, sempre. */
export function graveEMailLembrado(email: string): void {
  try {
    localStorage.setItem(LEMBRADO_KEY, email);
  } catch {
    /* storage indisponível: lembrar de mim simplesmente não funciona */
  }
}

/** Apaga o e-mail lembrado. Chamado em todo fim de sessão. */
export function esquecaEMailLembrado(): void {
  try {
    localStorage.removeItem(LEMBRADO_KEY);
  } catch {
    /* storage indisponível: nao ha o que apagar */
  }
}
