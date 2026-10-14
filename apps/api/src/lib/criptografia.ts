import crypto from "node:crypto";
import { env, isProd } from "../config/env";

// F4 (decisão D3): o envelope de cifrações de segredo em repouso.
//
// O segredo do segundo fator é a chave da porta. Guardá-lo em claro no banco
// significaria que um dump do MySQL, uma cópia de backup ou uma leitura curiosa
// pela ferramenta de administração dariam a qualquer pessoa a capacidade de gerar
// códigos válidos para sempre — e o segundo fator deixaria de existir para a
// vítima sem que ela percebesse. Por isso o que o banco vê é este envelope:
//
//   v1:<iv em base64>:<tag de autenticação em base64>:<texto cifrado em base64>
//
// AES-256-GCM, com a chave de 32 bytes vinda de `TOTP_ENCRYPTION_KEY` (64
// caracteres hexadecimais). O GCM é escolhido em vez de CBC de propósito: ele
// autentica o que cifra, então um envelope adulterado não devolve lixo para ser
// interpretado como segredo — devolve erro. O `v1` no começo é o espaço de
// manobra para uma rotação de algoritmo no futuro, sem adivinhação.
//
// Nada aqui imprime chave, texto em claro ou pedaços de um e do outro. As
// mensagens de erro nomeiam a chave de ambiente e nunca o valor dela.

const PREFIXO_DO_ENVELOPE = "v1";
const ALGORITMO = "aes-256-gcm";
const TAMANHO_DA_CHAVE_HEX = 64;
const TAMANHO_DO_VETOR_INICIAL = 12;

// Sal da derivação usada fora de produção (explicado em `chave()`). É constante
// pública, não segredo: serve só para que a chave derivada não coincida com a
// senha de onde ela veio.
const INFO_DA_DERIVACAO = "nexus-business-manager:segredo-totp-em-repouso";

export function formatoDaChaveValido(valor: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(valor);
}

/**
 * A chave de 32 bytes, resolvida na hora da chamada.
 *
 * Em produção ela é a `TOTP_ENCRYPTION_KEY` declarada no ambiente — e a subida já
 * foi recusada antes daqui se ela faltasse (a mesma régua vive em
 * `config/producao.ts`, que é o que a suíte de configuração exercita sem precisar
 * de um processo novo).
 *
 * Fora de produção, sem chave declarada, a resposta é derivar uma chave estável do
 * segredo de sessão já existente (HKDF-SHA256), em vez de: (a) gerar uma chave
 * aleatória a cada boot, que faria o 2FA ligado ontem parar de funcionar hoje sem
 * aviso nenhum, ou (b) embutir uma chave fixa no código, que é exatamente o erro
 * que esta decisão existe para corrigir. Consequência aceita e documentada: no dev
 * local, trocar `JWT_ACCESS_SECRET` desliga o segundo fator das contas de teste até
 * que a pessoa o reative. Produção não herda esse atalho — lá a chave dedicada é
 * obrigatória, e a ausência dela derruba o servidor.
 */
function chave(): Buffer {
  const declarada = (env.TOTP_ENCRYPTION_KEY ?? "").trim();
  if (declarada) {
    if (!formatoDaChaveValido(declarada)) {
      throw new Error(
        "TOTP_ENCRYPTION_KEY tem formato inválido: use 64 caracteres hexadecimais (32 bytes)",
      );
    }
    return Buffer.from(declarada, "hex");
  }
  if (env.NODE_ENV === "production") {
    // Lido do `env` na hora da chamada, e não do `isProd` memoizado do boot: é o
    // que permite à suíte provar os dois lados desta trava sem precisar de um
    // segundo processo da API.
    throw new Error("TOTP_ENCRYPTION_KEY ausente: produção não cifra segredo de segundo fator sem chave própria");
  }
  return Buffer.from(
    crypto.hkdfSync("sha256", Buffer.from(env.JWT_ACCESS_SECRET, "utf8"), Buffer.alloc(32), Buffer.from(INFO_DA_DERIVACAO, "utf8"), 32),
  );
}

export function cifrar(texto: string): string {
  const vetorIncial = crypto.randomBytes(TAMANHO_DO_VETOR_INICIAL);
  const cifra = crypto.createCipheriv(ALGORITMO, chave(), vetorIncial);
  const cifrado = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  return [PREFIXO_DO_ENVELOPE, vetorIncial.toString("base64"), cifra.getAuthTag().toString("base64"), cifrado.toString("base64")].join(":");
}

export function decifrar(envelope: string): string {
  const partes = envelope.split(":");
  const [versao, vetorEmBase64, tagEmBase64, textoEmBase64] = partes;
  if (partes.length !== 4 || versao !== PREFIXO_DO_ENVELOPE || !vetorEmBase64 || !tagEmBase64 || !textoEmBase64) {
    throw new Error("Envelope de segredo em formato não reconhecido");
  }
  const vetorIncial = Buffer.from(vetorEmBase64, "base64");
  const tag = Buffer.from(tagEmBase64, "base64");
  const cifrado = Buffer.from(textoEmBase64, "base64");
  if (vetorIncial.length !== TAMANHO_DO_VETOR_INICIAL || tag.length !== 16 || cifrado.length === 0) {
    throw new Error("Envelope de segredo truncado");
  }
  const decifra = crypto.createDecipheriv(ALGORITMO, chave(), vetorIncial);
  decifra.setAuthTag(tag);
  try {
    return Buffer.concat([decifra.update(cifrado), decifra.final()]).toString("utf8");
  } catch {
    // O GCM recusa o envelope adulterado ou cifrado com outra chave. A resposta é
    // uma frase só, sem pedaço do texto, sem pedaço da chave e sem o conteúdo do
    // erro criptográfico, que costuma trazer bytes do buffer.
    throw new Error("Envelope de segredo inválido ou cifrado com outra chave");
  }
}

/**
 * Diz se há como cifrar neste ambiente, sem revelar nada da chave. É a pergunta
 * que as rotas de segundo fator fazem antes de gerar segredo para uma conta:
 * sem chave, a instalação avisa "configure TOTP_ENCRYPTION_KEY" em vez de gravar
 * um segredo que não consegue ler de volta.
 */
export function cifraDisponivel(): boolean {
  try {
    return chave().length === 32;
  } catch {
    return false;
  }
}

// Reexportado para o teste de borda da forma (a régua de produção usa a mesma
// expressão e não pode divergir daqui).
export const TAMANHO_DA_CHAVE_EM_BYTES = TAMANHO_DA_CHAVE_HEX / 2;
