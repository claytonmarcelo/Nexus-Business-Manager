import type { GatewayProvider } from "@prisma/client";
import { badRequest } from "../../lib/errors";
import { chavePixValida, ehTipoChavePix, mensagemChaveInvalida, normalizarChavePix } from "../../lib/pix";

// F3.2 Parte 2 — a porta entre a cobrança e quem recebe o dinheiro.
//
// Esta porta existe por uma razão prática: o produto tem de cobrar hoje, e as
// integrações de mercado ainda não têm contrato assinado pelo dono. Sem uma
// porta, a primeira versão nasceria com o `if (provider === "PIX")` espalhado
// pelo serviço, e a integração nova entraria quebrando três lugares. Com ela, o
// provedor novo é UM arquivo que implementa a interface abaixo; o serviço de
// cobranças não muda uma linha.
//
// O que é decisão de produto, não de código:
//
//  1. Só o MANUAL tem adaptador. MERCADO_PAGO, EFI e STRIPE aparecem no catálogo
//     para a tela dizer a verdade — "ainda não disponível" — e param aqui. Eles
//     não têm rota de webhook, não têm campo de credencial e não têm linha no
//     banco: a recusa acontece antes de qualquer gravação, então não há estado
//     meio-cadastrado para alguém limpar depois.
//  2. Quem registra o pagamento é uma pessoa. O MANUAL não consulta ninguém: a
//     resposta dele é a validação da chave PIX e o que a empresa decidiu
//     (instruções, vencimento padrão). Nada de "esperando confirmação".
//  3. Credencial não passa por aqui. Este arquivo não conhece chave de API,
//     token ou segredo de nenhum provedor, e as colunas cifradas de
//     `payment_gateways` continuam vazias em todo o projeto.
//
// Uma nota honesta sobre o nome "falso só em teste": não existe adaptador falso
// no código de produção. O que existe é um adaptador REAL (o MANUAL, que é o
// produto de hoje) e três ausências declaradas — o que não tem implementação
// também não tem duplicata no teste.

/** O que a cobrança entrega ao provedor, antes de virar linha no banco. */
export interface RascunhoCobranca {
  method: string;
  pixKeyType?: string;
  pixKey?: string;
}

/** O que o provedor devolve de material para a cobrança. */
export interface CobrancaPreparada {
  pixKeyType: string | null;
  pixKey: string | null;
}

/** O que a tela de gateways entrega, no formato que o serviço entende. */
export interface ConfiguracaoGateway {
  pixKeyType?: string;
  pixKey?: string;
}

export interface ConfiguracaoPreparada {
  pixKeyType: string | null;
  pixKey: string | null;
}

export interface PaymentProviderAdapter {
  readonly provider: GatewayProvider;
  /** O segmento da URL — "mercado-pago", não "MERCADO_PAGO". */
  readonly slug: string;
  /** Como o provedor se apresenta na tela. */
  readonly rotulo: string;
  /** O que o adaptador faz com a cobrança antes de ela nascer. */
  prepararCobranca(rascunho: RascunhoCobranca): CobrancaPreparada;
  /** O que o adaptador aceita no cadastro dele mesmo. */
  prepararConfiguracao(entrada: ConfiguracaoGateway): ConfiguracaoPreparada;
}

/**
 * A régua da chave PIX, uma só vez, nos dois lugares que a recebem: a cobrança
 * avulsa e o cadastro do gateway. Validar nos dois e normalizar nos dois é o que
 * garante que a chave impressa no boleto é a mesma que o gateway guarda.
 */
function prepararChave(entrada: ConfiguracaoGateway): ConfiguracaoPreparada {
  const tipo = entrada.pixKeyType;
  const valor = entrada.pixKey;
  if (!tipo && !valor) return { pixKeyType: null, pixKey: null };
  if (!tipo || !ehTipoChavePix(tipo)) {
    throw badRequest("Escolha o tipo da chave PIX: CPF, CNPJ, e-mail, telefone ou aleatória");
  }
  if (!valor) throw badRequest(mensagemChaveInvalida(tipo));
  if (!chavePixValida(tipo, valor)) throw badRequest(mensagemChaveInvalida(tipo));
  return { pixKeyType: tipo, pixKey: normalizarChavePix(tipo, valor) };
}

/** O gateway da própria empresa: PIX na chave cadastrada e o resto combinado no balcão. */
export const adaptadorManual: PaymentProviderAdapter = {
  provider: "MANUAL",
  slug: "manual",
  rotulo: "Cobrança manual (balcão, PIX na chave da empresa, dinheiro ou maquininha)",
  prepararCobranca(rascunho) {
    // Fora do PIX não há chave para validar: boleto, transferência, dinheiro e
    // cartão por maquininha se combinam com o cliente, e o que a cobrança guarda
    // são as instruções e o registro de quem recebeu.
    if (rascunho.method !== "PIX") {
      if (rascunho.pixKeyType || rascunho.pixKey) {
        throw badRequest("A chave PIX só existe numa cobrança pelo PIX");
      }
      return { pixKeyType: null, pixKey: null };
    }
    return prepararChave({ pixKeyType: rascunho.pixKeyType, pixKey: rascunho.pixKey });
  },
  prepararConfiguracao(entrada) {
    return prepararChave(entrada);
  },
};

/** Um provedor do catálogo: disponível ou não, e por que não. */
export interface PerfilProvedor {
  provider: GatewayProvider;
  slug: string;
  rotulo: string;
  disponivel: boolean;
  /** Dito na tela, na resposta e no log — a recusa tem de ser honesta. */
  motivoIndisponivel?: string;
  adapter?: PaymentProviderAdapter;
}

const INDISPONIVEL = "Integração ainda não disponível: aguardando definição do provedor.";

/**
 * O catálogo completo. A ordem daqui é a ordem da tela, e a lista é a única
 * fonte do que existe: uma porta de provedor nova precisa ser declarada aqui
 * para nascer, e é aqui que ela nasce fechada.
 */
export const PROVEDORES: readonly PerfilProvedor[] = [
  {
    provider: "MANUAL",
    slug: "manual",
    rotulo: "Manual",
    disponivel: true,
    adapter: adaptadorManual,
  },
  { provider: "MERCADO_PAGO", slug: "mercado-pago", rotulo: "Mercado Pago", disponivel: false, motivoIndisponivel: INDISPONIVEL },
  { provider: "EFI", slug: "efi", rotulo: "EFI / Gerencianet", disponivel: false, motivoIndisponivel: INDISPONIVEL },
  { provider: "STRIPE", slug: "stripe", rotulo: "Stripe", disponivel: false, motivoIndisponivel: INDISPONIVEL },
];

export function provedorPorSlug(slug: string): PerfilProvedor | undefined {
  return PROVEDORES.find((p) => p.slug === slug.trim().toLowerCase());
}

/**
 * O portão dos provedores que ainda não têm contrato. Chamado na rota, ANTES de
 * qualquer parse do corpo: um pedido de credencial para uma porta fechada deve
 * ouvir "a porta está fechada", e não "o formulário está incompleto".
 */
export function exigirProvedorDisponivel(perfil: PerfilProvedor): PaymentProviderAdapter {
  if (!perfil.disponivel || !perfil.adapter) {
    throw badRequest(`${perfil.rotulo}: ${perfil.motivoIndisponivel ?? INDISPONIVEL}`);
  }
  return perfil.adapter;
}

/** O adaptador da cobrança — hoje um só, e a ausência dos outros é declarada. */
export function adapterDoProvedor(provider: GatewayProvider): PaymentProviderAdapter {
  const perfil = PROVEDORES.find((p) => p.provider === provider);
  if (!perfil?.disponivel || !perfil.adapter) {
    throw badRequest(`${perfil?.rotulo ?? provider}: ${perfil?.motivoIndisponivel ?? INDISPONIVEL}`);
  }
  return perfil.adapter;
}
