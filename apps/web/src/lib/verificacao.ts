import { api } from "./api";

// F4 (decisão D2): as duas chamadas de verificação de e-mail que a tela usa.
//
// Confirmar é rota pública — quem clica no link ainda não tem sessão nenhuma, e o
// token do e-mail é a credencial. Reenviar também é pública e responde sempre a
// mesma frase: um endereço cadastrado ou não cadastrado, verificado ou não, não se
// distingue por aqui, porque esta tela é um canal de informação para quem estiver
// sondando a lista de clientes.

/**
 * Confirma o token que veio no link. Uma frase só para token velho, usado ou
 * inexistente.
 *
 * N63 (P19), achado da prova de navegador da F5: a tela é montada mais de uma vez
 * sobre o mesmo endereço — o `StrictMode` do desenvolvimento monta, desmonta e
 * monta de novo, e um duplo clique no link do e-mail faz o mesmo — e cada montagem
 * disparava a sua conferência. O token é de uso único, então a segunda chamada
 * volta 400 e a pessoa lia "este link não vale mais" numa conta que acabava de ser
 * ativada. A deduplicação mora aqui, junto da chamada: enquanto houver uma
 * conferência em andamento para aquele token, quem mais chegar espera a mesma
 * resposta. Depois de resolvida a chave é liberada, porque repetir um token já
 * conferido é caso de recusa, e a recusa tem de continuar sendo medida de verdade.
 */
const conferenciasEmAndamento = new Map<string, Promise<{ ok: true; email: string }>>();

export function confirmarEmail(token: string): Promise<{ ok: true; email: string }> {
  const emAndamento = conferenciasEmAndamento.get(token);
  if (emAndamento) return emAndamento;
  const conferindo = api.post<{ ok: true; email: string }>("/auth/verify-email", { token }).then((r) => r.data);
  conferenciasEmAndamento.set(token, conferindo);
  // O `catch` aqui é o que impede a promessa derivada de virar exceção sem dono no
  // console do navegador; quem chamou recebe a rejeição pela promessa original.
  void conferindo.catch(() => undefined).finally(() => conferenciasEmAndamento.delete(token));
  return conferindo;
}

/** Reenvia a mensagem de confirmação para o endereço dado. */
export async function reenviarVerificacao(email: string): Promise<{ ok: true; message: string }> {
  const { data } = await api.post<{ ok: true; message: string }>("/auth/resend-verification", { email });
  return data;
}
