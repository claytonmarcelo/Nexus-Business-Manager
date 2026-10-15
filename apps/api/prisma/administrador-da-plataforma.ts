import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { emailDoAdministradorGlobal, type FonteDeSemente } from "./seed";
import { PASSWORD_HINT, isStrongPassword } from "../src/lib/passwordPolicy";

// F1.4 do PROMPT MESTRE: o administrador da plataforma de uma instalação de
// produção nasce por este bootstrap, e não pela semente. A F1.3 já tinha tirado
// do seed o direito de criar conta de desenvolvimento e empresa de demonstração
// num banco de cliente; faltava o caminho contrário — como a primeira conta
// global entra num banco vazio sem expor credencial no repositório.
//
// As três promessas deste arquivo:
//   1. nada vem do código: o endereço vem de SUPER_ADMIN_EMAIL e a senha de
//      ADMIN_CRIAR_SENHA, ambas declaradas por quem instala, no ambiente da
//      máquina; nenhuma das duas é impressa;
//   2. nada acontece sem decisão escrita: promover uma conta que já existe,
//      reescrever a senha de um administrador que já existe ou reativar uma conta
//      desativada exigem cada uma o seu consentimento no ambiente;
//   3. nada de demonstração: este caminho não conhece admin@nexus.local nem
//      nexus-demo — a vitrine continua sendo decisão exclusiva da semente;
//   4. ninguém fica do lado de fora: com a régua de verificação ligada (D2,
//      obrigatória em produção), a conta da plataforma nasce com o e-mail
//      confirmado. Não é atalho de segurança — é a única porta que existe para
//      ela, porque o link de verificação nunca é enviado para o administrador da
//      plataforma (ver `verificacao.service.ts`), e sem confirmação o login
//      negaria acesso à conta que a regra de acesso do dono protege.
//
// O desenho é o mesmo da semente (A8/F1.3): as decisões ficam em funções puras
// sobre um mapa de variáveis, e a escrita é provada em teste com um cliente que
// anota. Importar este módulo não toca o banco nem encerra o processo.

const prisma = new PrismaClient();

export type FonteDoOperador = FonteDeSemente;

// Nomes das chaves do operador. O valor nunca aparece aqui: um arquivo rastreado
// que escrevesse a própria senha cairia na varredura de
// `test/identificadores-fora-do-codigo.test.ts`, onde estas chaves estão listadas.
export const CHAVE_DA_SENHA = "ADMIN_CRIAR_SENHA";
export const CHAVE_DO_NOME = "ADMIN_CRIAR_NOME";
export const CONSENTIMENTO_PROMOVER = "ADMIN_CRIAR_PROMOVER";
export const CONSENTIMENTO_RENOVAR = "ADMIN_CRIAR_RENOVAR_SENHA";
export const CONSENTIMENTO_REATIVAR = "ADMIN_CRIAR_REATIVAR";

export const NOME_PADRAO = "Administrador Nexus";
const PAPEL_DA_PLATAFORMA = "SUPER_ADMIN";

/** O que o banco diz sobre a conta antes de qualquer escrita. */
export interface ContaEncontrada {
  readonly platformRole: string | null;
  readonly active: boolean;
  /**
   * N61/N78: coluna que a régua de produção (`REQUIRE_EMAIL_VERIFICATION=1`)
   * cobra no login. Opcional porque quem monta o estado em teste pode não saber
   * dela — ausência vale "não confirmada", que é o lado que tranca.
   */
  readonly emailVerifiedAt?: Date | null;
}

export type AcaoDoBootstrap =
  | "criar"
  | "confirmar-papel"
  | "renovar-senha"
  | "reativar-conta"
  | "promover"
  | "recusar";

export interface Decisao {
  readonly acao: AcaoDoBootstrap;
  /** Motivo legível para o operador. Nunca contém segredo. */
  readonly motivo: string;
  readonly escreveSenha: boolean;
  readonly reativa: boolean;
  /**
   * Regra de acesso do dono: o administrador raiz jamais pode ficar sem entrada.
   * Com a verificação obrigatória em produção, a conta que nasce (ou é promovida,
   * ou reativada) por este script precisa nascer confirmada — não existe caixa
   * postal de verdade atrás dela, o link não é enviado para ela de propósito
   * (`verificacao.service.ts` recusa SUPER_ADMIN), e sem esta coluna o bootstrap
   * criaria exatamente a conta que não consegue entrar.
   */
  readonly confirmaEmail: boolean;
}

export interface ResumoDoBootstrap {
  readonly email: string;
  readonly nome: string;
  readonly acao: string;
  /** Estado da credencial, nunca o valor. */
  readonly senha: string;
  /** O que a porta fez com a coluna de verificação. */
  readonly emailConfirmado: string;
  readonly empresasComoOwner: number;
}

function consentido(ambiente: FonteDoOperador, chave: string): boolean {
  return ambiente[chave] === "1";
}

/** Endereço do administrador da plataforma: a mesma chave que o validador de produção exige. */
export function emailDoBootstrap(ambiente: FonteDoOperador): string {
  return emailDoAdministradorGlobal(ambiente);
}

/**
 * Problemas de ambiente que impedem o bootstrap antes de qualquer consulta.
 * Lista vazia = pode continuar. A senha entra pelo nome da variável, nunca pelo valor.
 */
export function errosDoBootstrap(ambiente: FonteDoOperador): string[] {
  const problemas: string[] = [];
  if (!emailDoBootstrap(ambiente)) {
    problemas.push(
      "SUPER_ADMIN_EMAIL não está definido — em produção o endereço do administrador da plataforma vem do ambiente de quem instala; valor fixo no código é uma porta conhecida",
    );
  }
  const senha = ambiente[CHAVE_DA_SENHA];
  if (!senha) {
    problemas.push(
      `${CHAVE_DA_SENHA} não está definida — sem ela nenhuma conta é criada; exporte a senha no ambiente da instalação, nunca num arquivo do repositório (o registro da máquina fica em CREDENCIAIS.md)`,
    );
  } else if (!isStrongPassword(senha)) {
    problemas.push(`${CHAVE_DA_SENHA} não atende à regra de acesso do projeto — ${PASSWORD_HINT}`);
  }
  return problemas;
}

/**
 * Decide o que fazer com a conta que já existe. Função pura: os testes percorrem
 * o estado possível sem banco, e o banco só é consultado depois que o ambiente
 * passou por `errosDoBootstrap`.
 */
export function decisaoDoBootstrap(conta: ContaEncontrada | null, ambiente: FonteDoOperador): Decisao {
  const renova = consentido(ambiente, CONSENTIMENTO_RENOVAR);
  const reativa = consentido(ambiente, CONSENTIMENTO_REATIVAR);
  // Confirmar o e-mail é o que destranca a conta. Se ela já está confirmada, não
  // há o que escrever — reescrever o carimbo de quem entrou pelo link seria
  // falsificar a data em que a caixa postal foi provada.
  const confirmaEmail = !conta?.emailVerifiedAt;

  if (!conta) {
    return {
      acao: "criar",
      motivo: `a conta ainda não existe; ela nasce como administradora da plataforma com a senha que ${CHAVE_DA_SENHA} acabou de definir, e com o e-mail confirmado porque a régua de produção trancaria do lado de fora a conta que a regra de acesso diz que jamais pode ficar sem acesso`,
      escreveSenha: true,
      reativa: false,
      confirmaEmail: true,
    };
  }

  const daPlataforma = conta.platformRole === PAPEL_DA_PLATAFORMA;

  if (!daPlataforma && !consentido(ambiente, CONSENTIMENTO_PROMOVER)) {
    return {
      acao: "recusar",
      motivo:
        `já existe uma conta com este endereço e ela não é administradora da plataforma — promover a conta de um cliente por engano entrega todas as empresas; se a intenção é promover, declare ${CONSENTIMENTO_PROMOVER}=1`,
      escreveSenha: false,
      reativa: false,
      confirmaEmail: false,
    };
  }

  // Desativada é o mesmo cuidado nos dois casos: quem perdeu o acesso (A5) não o
  // recupera por um script que roda sem a decisão de reativar escrita.
  if (!conta.active && !reativa) {
    return {
      acao: "recusar",
      motivo:
        `a conta encontrada está desativada — reativar é decisão de quem administra o ambiente; para voltar a usar, declare ${CONSENTIMENTO_REATIVAR}=1`,
      escreveSenha: false,
      reativa: false,
      confirmaEmail: false,
    };
  }

  if (!daPlataforma) {
    return {
      acao: "promover",
      motivo: `promoção com consentimento escrito; a senha é reescrita porque a plataforma inteira não pode ficar nas mãos de uma credencial que este script não acabou de definir`,
      escreveSenha: true,
      reativa,
      confirmaEmail,
    };
  }

  if (!conta.active) {
    return {
      acao: "reativar-conta",
      motivo: `conta da plataforma reativada com consentimento escrito${renova ? " e senha reescrita" : ", com a senha preservada"}`,
      escreveSenha: renova,
      reativa: true,
      confirmaEmail,
    };
  }

  if (renova) {
    return {
      acao: "renovar-senha",
      motivo: `o papel é confirmado e a senha é reescrita porque ${CONSENTIMENTO_RENOVAR}=1 foi declarado`,
      escreveSenha: true,
      reativa: false,
      confirmaEmail,
    };
  }

  return {
    acao: "confirmar-papel",
    motivo:
      `a conta já é administradora da plataforma: o papel é confirmado e a senha fica preservada — rodar este script duas vezes não troca credencial de ninguém (para trocar, declare ${CONSENTIMENTO_RENOVAR}=1)`,
    escreveSenha: false,
    reativa: false,
    confirmaEmail,
  };
}

/**
 * Executa o bootstrap. Recusa antes da primeira consulta quando o ambiente não
 * fecha, e recusa depois quando a conta encontrada pede consentimento que não foi
 * dado — nos dois casos sem escrever nada.
 */
export async function instalarAdministradorDaPlataforma(
  ambiente: FonteDoOperador = process.env,
  cliente: PrismaClient = prisma,
): Promise<ResumoDoBootstrap> {
  const problemas = errosDoBootstrap(ambiente);
  if (problemas.length > 0) {
    throw new Error(`Bootstrap recusado — ${problemas.join("; ")}`);
  }

  const email = emailDoBootstrap(ambiente);
  const encontrada = await cliente.user.findUnique({
    where: { email },
    select: { platformRole: true, active: true, emailVerifiedAt: true },
  });
  const decisao = decisaoDoBootstrap(encontrada, ambiente);
  if (decisao.acao === "recusar") {
    throw new Error(`Bootstrap recusado — ${decisao.motivo}`);
  }

  const nome = (ambiente[CHAVE_DO_NOME] ?? "").trim() || NOME_PADRAO;
  const passwordHash = decisao.escreveSenha
    ? await bcrypt.hash(ambiente[CHAVE_DA_SENHA] ?? "", 12)
    : null;
  const agora = new Date();

  const usuario =
    decisao.acao === "criar"
      ? await cliente.user.create({
          data: {
            email,
            name: nome,
            passwordHash: passwordHash ?? "",
            platformRole: PAPEL_DA_PLATAFORMA,
            ...(decisao.confirmaEmail ? { emailVerifiedAt: agora } : {}),
          },
        })
      : await cliente.user.update({
          where: { email },
          data: {
            platformRole: PAPEL_DA_PLATAFORMA,
            ...(passwordHash ? { passwordHash } : {}),
            ...(decisao.reativa ? { active: true } : {}),
            ...(decisao.confirmaEmail ? { emailVerifiedAt: agora } : {}),
          },
        });

  // Regra definitiva de acesso: o administrador global é OWNER de toda empresa do
  // banco. Aqui isso significa as que já existem — o cadastro de uma empresa nova
  // continua dando OWNER ao cliente que a criou, e o vínculo do administrador é
  // confirmado pela semente em desenvolvimento e por este script em produção.
  const companies = await cliente.company.findMany({ select: { id: true } });
  for (const empresa of companies) {
    await cliente.companyUser.upsert({
      where: { userId_companyId: { userId: usuario.id, companyId: empresa.id } },
      update: { role: "OWNER" },
      create: { userId: usuario.id, companyId: empresa.id, role: "OWNER" },
    });
  }

  const resumo: ResumoDoBootstrap = {
    email,
    nome,
    acao: decisao.acao,
    senha: decisao.escreveSenha ? "definida agora" : "preservada",
    emailConfirmado: decisao.confirmaEmail ? "marcado agora" : "já estava",
    empresasComoOwner: companies.length,
  };
  // Sem senha, sem hash, sem token: o log diz o que aconteceu, não o que vale.
  // eslint-disable-next-line no-console
  console.log("Administrador da plataforma:", resumo, "-", decisao.motivo);
  return resumo;
}

// Rode pelo npm (`npm run admin:criar -w @nexus/api`). Importar este módulo num
// teste não pode escrever nada nem encerrar o processo.
const ehExecucaoDireta = /prisma\/administrador-da-plataforma\.ts$/.test(
  (process.argv[1] ?? "").replace(/\\/g, "/"),
);
if (ehExecucaoDireta) {
  instalarAdministradorDaPlataforma()
    .then(() => process.exit(0))
    .catch((erro: unknown) => {
      // eslint-disable-next-line no-console
      console.error(erro instanceof Error ? erro.message : erro);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}
