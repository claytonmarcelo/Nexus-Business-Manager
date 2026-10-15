import { z } from "zod";
import { strongPassword, PASSWORD_HINT } from "../../lib/passwordPolicy";
import { somenteDigitos, telefoneValido } from "../../lib/brFields";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().min(1).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const switchCompanySchema = z.object({
  companyId: z.string().min(1),
});

// Cadastro self-service: cria usuário + empresa própria (OWNER).
//
// F7 (LGPD, item 1): os dois aceites obrigatórios. São duas caixas, não uma,
// porque os textos têm fundamentos jurídicos diferentes — um é o contrato, o outro
// é o consentimento sobre os dados pessoais. Aceitar um não aceita o outro, então a
// tela exige as duas e a gravação faz duas linhas
// (`modules/lgpd/lgpd.service.ts`).
//
// A caixa é `caixaObrigatoria`, e não um `z.boolean().refine(...)`: com o campo
// ausente o zod falha antes do refine, e a pessoa leria "Required" em inglês numa
// tela em português. Os dois caminhos — não marcou, ou marcou e tirou — dizem a
// mesma frase.
const caixaObrigatoria = (texto: string) =>
  z.boolean({ errorMap: () => ({ message: texto }) }).refine((v) => v, texto);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: strongPassword,
  aceitaTermos: caixaObrigatoria("Leia e aceite os Termos de uso para criar a conta"),
  aceitaPrivacidade: caixaObrigatoria("Leia e aceite a Política de privacidade para criar a conta"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  token: z.string().min(16, "Cole o código de recuperação recebido"),
  password: strongPassword,
});

// Perfil da própria conta: todo papel pode ajustar o próprio nome e telefone.
// Campo ausente significa "não mexer"; telefone vazio ou null limpa o valor.
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome completo").max(120, "Nome longo demais").optional(),
    phone: z
      .string()
      .trim()
      .max(32, "Telefone longo demais")
      .refine(
        (v) => v === "" || telefoneValido(somenteDigitos(v)),
        "Informe um telefone válido com DDD (ex.: (11) 98888-7777)",
      )
      .nullable()
      .optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Envie ao menos um campo para gravar");

// Troca de senha autenticada: conferimos a senha atual antes de gravar a nova.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: strongPassword,
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ---- F4 (D2): verificação de e-mail ----

export const verifyEmailSchema = z.object({
  // Token de 48 caracteres hexadecimais, ou o mesmo código digitado com espaços:
  // a régua minima é a do que o serviço emite, não a da conveniência da tela.
  token: z.string().trim().min(32, "Cole o código de confirmação recebido"),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});

// ---- F4 (D3): segundo fator ----

// Formato aceito nas duas pontas: os seis dígitos do aplicativo ou o código de
// recuperação (dez caracteres do alfabeto sem ambiguidade, com ou sem o traço que
// a tela mostra). Algo maior que isso é digitação de outro campo, e o zod corta
// antes de chegar a quem compara.
const codigoDeSegundoFator = z
  .string()
  .trim()
  .regex(/^(\d{6}|[a-z0-9]{5}-?[a-z0-9]{5})$/i, "Digite o código de 6 dígitos ou um código de recuperação");

export const segundoFatorDesafioSchema = z
  .object({
    challengeToken: z.string().min(16, "Faça login novamente"),
    codigo: codigoDeSegundoFator,
  })
  .strict();

// Rota de etapa: o token é o cabeçalho? Não — vem no corpo, porque a pessoa ainda
// não tem sessão nenhuma e o navegador não tem onde guardar um cookie de etapa.
export const segundoFatorAtivarSchema = z.object({ codigo: codigoDeSegundoFator }).strict();

export const segundoFatorDesativarSchema = z.object({ codigo: codigoDeSegundoFator }).strict();

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type SegundoFatorDesafioInput = z.infer<typeof segundoFatorDesafioSchema>;
export { codigoDeSegundoFator };
export { PASSWORD_HINT };
