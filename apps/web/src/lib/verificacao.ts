import { api } from "./api";

// F4 (decisão D2): as duas chamadas de verificação de e-mail que a tela usa.
//
// Confirmar é rota pública — quem clica no link ainda não tem sessão nenhuma, e o
// token do e-mail é a credencial. Reenviar também é pública e responde sempre a
// mesma frase: um endereço cadastrado ou não cadastrado, verificado ou não, não se
// distingue por aqui, porque esta tela é um canal de informação para quem estiver
// sondando a lista de clientes.

/** Confirma o token que veio no link. Uma frase só para token velho, usado ou inexistente. */
export async function confirmarEmail(token: string): Promise<{ ok: true; email: string }> {
  const { data } = await api.post<{ ok: true; email: string }>("/auth/verify-email", { token });
  return data;
}

/** Reenvia a mensagem de confirmação para o endereço dado. */
export async function reenviarVerificacao(email: string): Promise<{ ok: true; message: string }> {
  const { data } = await api.post<{ ok: true; message: string }>("/auth/resend-verification", { email });
  return data;
}
