import type { GatewayProvider, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest } from "../../lib/errors";
import { audit } from "../../lib/audit";
import { PROVEDORES, exigirProvedorDisponivel, type PerfilProvedor } from "../charges/charge-adapters";
import type { ConfigGatewayManualInput } from "./gateways.schemas";

// F3.2 Parte 2 — o que a tela de gateways pode ver e escrever.
//
// Três regras mandam aqui, e as três existem por causa do mesmo risco: uma tela
// de pagamentos é o lugar onde um projeto costuma começar a guardar segredo de
// terceiro sem que ninguém tenha decidido isso.
//
//  1. A resposta é o CATÁLOGO, não o banco. Quatro provedores, um por linha,
//     sempre. Se nada foi configurado, a linha existe e diz "não configurado"; se
//     o provedor não existe no produto, a linha existe e diz por que. Uma tela que
//     só mostra o que tem registro mostraria um vazio e o dono leria como
//     "sistema quebrado".
//  2. Credencial não sobe nem desce. As colunas `public_key`, `credential_cipher`
//     e `webhook_cipher` não aparecem na resposta em hipótese alguma — nem vazias,
//     nem por chave — e o MANUAL grava as três nulas por construção. Um cliente
//     JSON que imprime a resposta de uma API não pode imprimir material de acesso.
//  3. Escrever configuração de recebimento é ato de ADMINISTRADOR (`settings:write`,
//     o mesmo portão de Configurações), e ler é ato de quem opera o caixa. Um
//     atendente não troca a chave PIX da empresa; é o dono quem responde pelo
//     dinheiro que entra.

/**
 * A chave PIX e o resto da configuração do MANUAL moram num JSON de exibição.
 *
 * É `type`, não `interface`: a coluna `Json` do Prisma só aceita objeto que tenha
 * assinatura de índice implícita, e type alias de literal tem; interface não.
 * Trocar a palavra é o que evita um cast na escrita.
 */
type ConfiguracaoManual = {
  pixKeyType: string | null;
  pixKey: string | null;
  beneficiaryName: string | null;
  instructions: string | null;
  defaultDueDays: number | null;
}

const SELECT_LINHA = {
  provider: true,
  environment: true,
  displayName: true,
  active: true,
  chargeSettings: true,
  updatedAt: true,
} satisfies Prisma.PaymentGatewaySelect;

type LinhaArmazenada = Prisma.PaymentGatewayGetPayload<{ select: typeof SELECT_LINHA }>;

/** O JSON do banco é texto solto: lido com régua, nunca com fé. */
function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor : null;
}

function inteiro(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? Math.trunc(valor) : null;
}

function lerConfiguracao(bruto: unknown): ConfiguracaoManual {
  const obj = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  return {
    pixKeyType: texto(obj.pixKeyType),
    pixKey: texto(obj.pixKey),
    beneficiaryName: texto(obj.beneficiaryName),
    instructions: texto(obj.instructions),
    defaultDueDays: inteiro(obj.defaultDueDays),
  };
}

/**
 * Com as duas etiquetas de ambiente possíveis, qual linha é "a que vale"?
 *
 * A que está ligada; empatando, a de produção; empatando, a mexida por último. Não
 * é critério de banco, é critério de tela: o dono precisa ver UMA configuração de
 * recebimento por provedor, e a que opera o balcão é a produção ativa.
 */
function escolherAtual(linhas: LinhaArmazenada[]): LinhaArmazenada | undefined {
  if (linhas.length === 0) return undefined;
  const ativas = linhas.filter((l) => l.active);
  const pool = ativas.length > 0 ? ativas : linhas;
  const producao = pool.filter((l) => l.environment === "PRODUCTION");
  const final = producao.length > 0 ? producao : pool;
  return [...final].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
}

function montarLinha(perfil: PerfilProvedor, linha?: LinhaArmazenada) {
  const config = lerConfiguracao(linha?.chargeSettings);
  return {
    provider: perfil.provider,
    slug: perfil.slug,
    rotulo: perfil.rotulo,
    available: perfil.disponivel,
    configured: Boolean(linha),
    motivoIndisponivel: perfil.motivoIndisponivel ?? null,
    environment: linha?.environment ?? null,
    active: linha?.active ?? false,
    displayName: linha?.displayName ?? null,
    ...config,
    updatedAt: linha?.updatedAt ?? null,
  };
}

export async function listGateways(companyId: string) {
  const linhas = await prisma.paymentGateway.findMany({
    where: { companyId },
    select: SELECT_LINHA,
  });
  const porProvedor = new Map<GatewayProvider, LinhaArmazenada[]>();
  for (const linha of linhas) {
    const grupo = porProvedor.get(linha.provider);
    if (grupo) grupo.push(linha);
    else porProvedor.set(linha.provider, [linha]);
  }
  return {
    data: PROVEDORES.map((perfil) => montarLinha(perfil, escolherAtual(porProvedor.get(perfil.provider) ?? []))),
  };
}

/** A linha do MANUAL como a tela a lê, depois de qualquer escrita. */
async function linhaManual(companyId: string) {
  const lista = await listGateways(companyId);
  const linha = lista.data.find((p) => p.provider === "MANUAL");
  if (!linha) throw badRequest("O gateway manual não está no catálogo deste produto");
  return linha;
}

/**
 * Grava a configuração do MANUAL — e é a única escrita de gateway que existe.
 *
 * O `upsert` na chave `(empresa, provedor, ambiente)` é o que faz "salvar de novo"
 * ser editar a mesma configuração em vez de abrir uma segunda: dois cartões PIX no
 * balcão é a conta dividida em dois lugares, e ninguém nunca sabe qual deles o
 * cliente pagou. As colunas de credencial entram nulas de propósito — gravar o
 * MANUAL limpa qualquer resquício delas nesta linha.
 *
 * O auditor vê o TIPO da chave, nunca o valor: a chave PIX é o endereço público de
 * recebimento da empresa, e mesmo assim quem lê a trilha de auditoria não precisa
 * de nada além do tipo para saber o que mudou.
 */
export async function salvarConfiguracaoManual(
  companyId: string,
  input: ConfigGatewayManualInput,
  ator: { userId: string },
  ip: string,
) {
  const perfil = PROVEDORES.find((p) => p.provider === "MANUAL");
  if (!perfil) throw badRequest("O gateway manual não está no catálogo deste produto");
  const adapter = exigirProvedorDisponivel(perfil);

  const chave = adapter.prepararConfiguracao({
    pixKeyType: input.pixKeyType,
    pixKey: input.pixKey,
  });
  const settings: ConfiguracaoManual = {
    pixKeyType: chave.pixKeyType,
    pixKey: chave.pixKey,
    beneficiaryName: input.beneficiaryName ?? null,
    instructions: input.instructions ?? null,
    defaultDueDays: input.defaultDueDays ?? null,
  };

  await prisma.paymentGateway.upsert({
    where: {
      companyId_provider_environment: {
        companyId,
        provider: "MANUAL",
        environment: input.environment,
      },
    },
    update: {
      displayName: input.displayName ?? null,
      active: input.active ?? true,
      chargeSettings: settings,
      publicKey: null,
      credentialCipher: null,
      webhookCipher: null,
    },
    create: {
      companyId,
      provider: "MANUAL",
      environment: input.environment,
      displayName: input.displayName ?? null,
      active: input.active ?? true,
      chargeSettings: settings,
    },
  });

  await audit({
    userId: ator.userId,
    companyId,
    action: "gateway.update",
    entity: "payment_gateway",
    ip,
    metadata: {
      provider: "MANUAL",
      environment: input.environment,
      chavePixTipo: chave.pixKeyType,
      defaultDueDays: settings.defaultDueDays,
    },
  });

  return linhaManual(companyId);
}
