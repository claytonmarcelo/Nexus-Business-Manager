import crypto from "node:crypto";
import { Secret, TOTP } from "otpauth";
import { hashToken } from "./tokens";
import { decifrar, cifrar } from "./criptografia";

// T3.4 (decisão D3 do dono): segundo fator pelo tempo (TOTP).
//
// A biblioteca é a `otpauth` 9.5.2, escolhida em vez da `otplib` 13.5.0 por três
// motivos medidos na instalação: um único dependente de produção contra seis,
// tipos escritos junto do código (sem pacote `@types` separado) e construtores que
// carregam emissor e rótulo na própria chave — que é justamente o que o
// `otpauth://` de configuração precisa. A escolha está escrita em
// `docs/decisoes/ADR-0013-...`; o `npm audit --omit=dev` rodou depois dela e não
// trouxe nenhuma vulnerabilidade nova.
//
// O segredo nunca é persistido em claro, e nunca volta para o navegador depois de
// confirmado. O que o banco guarda é o envelope cifrado de `lib/criptografia.ts`.

/** Emissor escrito no `otpauth://`: é o nome que o aplicativo de códigos mostra. */
export const EMISSOR_DO_TOTP = "Nexus Business Manager";

/** Duração do desafio (senha conferida, aguardando o código de 6 dígitos). */
export const TTL_DO_DESAFIO = "5m";

/** Duração do token que só serve para ligar o segundo fator obrigatório. */
export const TTL_DA_CONFIGURACAO = "15m";

export function novoSegredo(): string {
  // 20 bytes = 160 bits, o tamanho que RFC 4226 pede e o que os aplicativos
  // esperam. `base32` é a forma canônica: é o texto que a pessoa digita no app.
  return new Secret({ size: 20 }).base32;
}

export function uriDeConfiguracao(input: { conta: string; segredoBase32: string }): string {
  return new TOTP({
    issuer: EMISSOR_DO_TOTP,
    label: input.conta,
    secret: Secret.fromBase32(input.segredoBase32),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  }).toString();
}

/**
 * Confere o código de seis dígitos com uma janela de tolerância de um período
 * para cada lado (90 segundos no total). É a tolerância padrão dos aplicativos:
 * sem ela, o celular que atrasa um minuto tranca o dono fora de casa.
 *
 * O segredo só pode ser lido pela chave declarada no ambiente, e uma falha de
 * leitura é tratada como "não confere": sem envelope legível não há segunda etapa,
 * e ninguém passa. Quem administra a instalação vê o caso por outro caminho — a
 * rota de entrada confere a legibilidade antes e devolve a frase que nomeia a
 * chave que não bate (ver `exigeSegredoLegivel` no serviço).
 */
export function codigoConfere(input: { segredoCifrado: string; codigo: string }): boolean {
  let segredo: string;
  try {
    segredo = decifrar(input.segredoCifrado);
  } catch {
    return false;
  }
  const totp = new TOTP({
    issuer: EMISSOR_DO_TOTP,
    label: "conta",
    secret: Secret.fromBase32(segredo),
    digits: 6,
    period: 30,
    algorithm: "SHA1",
  });
  return totp.validate({ token: input.codigo.trim(), window: 1 }) !== null;
}

/**
 * Um lote de códigos de recuperação. A forma é legível em voz alta e digitável
 * (10 caracteres de alfabeto sem símbolos ambíguos), e o que vai para o banco é o
 * HMAC de cada um — a mesma régua dos tokens de sessão: ler a tabela não dá a
 * porta de entrada para ninguém.
 */
const ALFABETO_DE_RECUPERACAO = "abcdefghjkmnpqrstuvwxyz23456789";

function codigoDeRecuperacao(): string {
  const bytes = crypto.randomBytes(10);
  let saida = "";
  for (const b of bytes) saida += ALFABETO_DE_RECUPERACAO[b % ALFABETO_DE_RECUPERACAO.length];
  return saida.slice(0, 5) + "-" + saida.slice(5, 10);
}

export function gerarCodigosDeRecuperacao(quantidade = 10): { visiveis: string[]; hashes: string[] } {
  const visiveis: string[] = [];
  for (let i = 0; i < quantidade; i++) visiveis.push(codigoDeRecuperacao());
  // O hash é da forma canônica (sem o traço de legibilidade), porque é sobre ela
  // que a conferência acontece: quem digita `abcde-fghij` ou `abcdefghij` abre a
  // mesma porta. Hash da forma com traço aqui faria nenhum código de recuperação
  // nunca conferir — defeito que o teste de segundo fator pegou antes de qualquer
  // conta existir.
  return { visiveis, hashes: visiveis.map((c) => hashDeCodigoDeRecuperacao(c)) };
}

export function hashDeCodigoDeRecuperacao(codigo: string): string {
  // A forma canônica é a do código sem o traço que só existe para a leitura:
  // colar `abcde-fghij` ou digitar `abcdefghij` é a mesma porta. O que o banco
  // guarda é o hash da forma canônica, e a comparação acontece sobre ela.
  return hashToken(codigo.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
}

/**
 * Cifra o segredo na hora de gravar. Existe como função separada para que o
 * serviço nunca escreva um segredo em claro por distração em algum ramo de
 * atualização.
 */
export function cifrarSegredo(segredoBase32: string): string {
  return cifrar(segredoBase32);
}

// A regra de quem é obrigado a ter segundo fator, isolada da leitura do banco:
// em produção, administrador da plataforma e OWNER de qualquer casa. Fora de
// produção a resposta é sempre "não" — é o que deixa o desenvolvimento e a
// suíte de testes entrarem sem aplicativo de código nenhum, e é o que impede um
// `.env` esquecido de travar meia equipe num ambiente que não é o da loja.
export function doisFatorObrigatorio(input: {
  platformRole?: string | null;
  papeis: string[];
  nodeEnv: string | undefined;
}): boolean {
  if (input.nodeEnv !== "production") return false;
  if (input.platformRole === "SUPER_ADMIN") return true;
  return input.papeis.includes("OWNER");
}
