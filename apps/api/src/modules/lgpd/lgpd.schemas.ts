import { z } from "zod";

// T6.4 (F7) — o corpo dos dois pedidos de eliminação.
//
// Um campo só, e ele é obrigatório: os direitos de anonimização e exclusão destroem
// dado pessoal sem volta, então o sistema não aceita o pedido de quem só tem um token.
// A senha volta a ser conferida contra o hash no serviço, do mesmo jeito que a troca
// de senha da F4 exige a atual. O teto de 200 caracteres é o da coluna, e existe para
// o corpo de dez megabytes não virar trabalho para o bcrypt.
export const confirmacaoDeSenhaSchema = z.object({
  senha: z.string().min(1).max(200),
});

export type ConfirmacaoDeSenha = z.infer<typeof confirmacaoDeSenhaSchema>;
