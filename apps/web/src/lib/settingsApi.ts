import { api } from "./api";

// ===== Fala da tela /app/configuracoes com o módulo de empresas e de conta =====
// Os tipos espelham apps/api/src/modules/companies/companies.service.ts e
// auth/schemas.ts: campo que o servidor não valida não existe aqui. Cada função
// é um bloco da tela — ler, gravar parcial, pedir as listas de opções.

/** O que o GET /companies/current devolve (Decimal já vem como número). */
export interface EmpresaConfig {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  legalName: string | null;
  tradeName: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  stateUf: string | null;
  logoUrl: string | null;
  currency: string;
  timezone: string;
  language: string;
  revenueTarget: number | null;
  /** Papel de quem lê, para a tela saber se mostra o botão de gravar. */
  role: string;
}

/** Campos de texto do cadastro. A lista é a mesma que o PATCH aceita. */
export const CAMPOS_TEXTO_EMPRESA = [
  "name", "legalName", "tradeName", "cnpj", "phone", "email",
  "zipCode", "street", "number", "district", "city", "stateUf", "logoUrl",
] as const;

export type CampoTextoEmpresa = (typeof CAMPOS_TEXTO_EMPRESA)[number];

/** Os três de escolha obrigatória têm lista fechada servida pela própria API. */
export type CampoEscolhaEmpresa = "currency" | "timezone" | "language";

/**
 * Toda escrita é parcial: o bloco manda só o que a pessoa mudou. Aqui isso quer
 * dizer duas coisas — chave ausente não toca no campo, e chave vazia limpa o que
 * estava guardado. Meta sem valor é null, não zero.
 */
export type MudancaEmpresa = {
  [chave in CampoTextoEmpresa | CampoEscolhaEmpresa]?: string;
} & {
  revenueTarget?: number | null;
};

export interface ListaOpcao {
  codigo: string;
  rotulo: string;
}

export interface OpcoesConfig {
  ufs: readonly string[];
  moedas: readonly ListaOpcao[];
  idiomas: readonly ListaOpcao[];
  fusos: readonly string[];
}

/** O servidor devolve a empresa inteira depois de gravar: é ela que vai para a tela. */
export interface ResultadoGravacao {
  empresa: EmpresaConfig;
  alterados: string[];
}

export async function lerEmpresa(): Promise<EmpresaConfig> {
  const { data } = await api.get<EmpresaConfig>("/companies/current");
  return data;
}

export async function gravarEmpresa(mudanca: MudancaEmpresa): Promise<ResultadoGravacao> {
  const { data } = await api.patch<ResultadoGravacao>("/companies/current", mudanca);
  return data;
}

export async function lerOpcoes(): Promise<OpcoesConfig> {
  const { data } = await api.get<OpcoesConfig>("/companies/settings/opcoes");
  return data;
}

/** Perfil da própria conta: nome e telefone, com a mesma regra de campo ausente. */
export interface MudancaPerfil {
  name?: string;
  phone?: string | null;
}

/**
 * A resposta traz o usuário novo, mas a tela não usa: ela chama reload() do
 * AuthContext. Manter uma segunda cópia da sessão no componente é como ela
 * ficava velha em relação ao cabeçalho e ao formato das outras telas.
 */
export async function gravarPerfil(mudanca: MudancaPerfil): Promise<{ alterados: string[] }> {
  const { data } = await api.patch<{ alterados: string[] }>("/auth/me", mudanca);
  return data;
}

export interface ResultadoSenha {
  ok: true;
  sessionsRevoked: number;
}

export async function trocarSenha(currentPassword: string, newPassword: string): Promise<ResultadoSenha> {
  const { data } = await api.post<ResultadoSenha>("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return data;
}
