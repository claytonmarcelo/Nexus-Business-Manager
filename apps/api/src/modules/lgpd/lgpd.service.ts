import type { Prisma } from "@prisma/client";
import { LegalKind } from "@prisma/client";
import { obterLegal } from "../cms/cms.service";

// ===== F7 (LGPD) — o que a pessoa aceitou, e onde isso ficou =====
//
// A prateleira dos textos já existia (T-cinco do CMS: `legal_documents`, editor na
// plataforma, leitura pública que recusa o que não foi publicado). O que faltava é
// a outra ponta da LGPD item 1: o **registro** do aceite. Sem ele, a resposta para
// "mostre o que este usuário aceitou" é a palavra de quem opera o sistema, e não
// uma linha com data, versão e endereço.
//
// Três decisões moram aqui, e todas são reversíveis (padrão seguro, decisão D14 do
// dono — registradas em `docs/decisoes/`):
//
// 1. **duas vontades, duas caixas.** Termos de uso e Política de privacidade têm
//    fundamentos jurídicos diferentes — um é o contrato, o outro é o consentimento
//    sobre dados pessoais. Aceitar um não aceita o outro, então a tela exige as
//    duas e a gravação faz duas linhas.
// 2. **o aceite é do cadastro self-service.** A conta que um ADMIN cria para a
//    própria equipe não tem aceite: ninguém marcou caixa por aquela pessoa, e
//    registrar um aceite que ela nunca deu seria fabricar a prova. A tela de
//    equipe continua criando conta como criava (o teste amarra isso).
// 3. **a linha guarda a versão daquele momento**, não uma junção viva com o
//    documento: o texto pode ser reescrito amanhã, e o aceite de ontem continua
//    apontando para a versão que estava em vigor quando a pessoa leu.
//
// Limitação declarada, não escondida: se o dono ainda não publicou os textos, a
// linha registra a versão da prateleira vazia (1). O cadastro não é barrado por
// isso — numa instalação recém-subida não haveria como criar a primeira conta —,
// mas a prova de aceite só fica forte depois de publicar os documentos, e é por
// isso que `docs/PRODUCAO.md`, seção 9 ("Depois da primeira subida"), tem essa linha.

/** Os dois textos que a tela de cadastro apresenta. O LGPD fica de fora: ele é a
 *  prestação de contas da empresa sobre o tratamento, não um contrato que se
 *  assina para entrar. */
export const TEXTOS_DO_CADASTRO = [LegalKind.TERMS, LegalKind.PRIVACY] as const;

export interface OfertaDeAceite {
  kind: LegalKind;
  version: number;
  publicado: boolean;
}

/**
 * O que está sendo oferecido agora, com a versão de cada texto. Lida fora da
 * transação de cadastro: `obterLegal` garante a prateleira (upsert) e não escreve
 * conteúdo nenhum, e a versão lida aqui é a que vai para a linha de aceite.
 */
export async function ofertasDoCadastro(): Promise<OfertaDeAceite[]> {
  const documentos = await Promise.all(TEXTOS_DO_CADASTRO.map((kind) => obterLegal(kind)));
  return documentos.map((doc) => ({ kind: doc.kind, version: doc.version, publicado: doc.published }));
}

/**
 * Grava as linhas de aceite dentro da MESMA transação que cria a conta: ou a
 * pessoa existe com o aceite dela, ou não existe nenhuma das duas. Uma conta sem
 * linha de aceite só existe num cenário em que o cadastro não passou por esta
 * função — é o caso da conta criada pela equipe, acima.
 */
export async function registrarAceites(
  tx: Prisma.TransactionClient,
  args: { userId: string; ofertas: OfertaDeAceite[]; ip?: string | null },
): Promise<number> {
  for (const oferta of args.ofertas) {
    await tx.consentRecord.create({
      data: {
        userId: args.userId,
        kind: oferta.kind,
        version: oferta.version,
        ip: args.ip ?? null,
      },
    });
  }
  return args.ofertas.length;
}
