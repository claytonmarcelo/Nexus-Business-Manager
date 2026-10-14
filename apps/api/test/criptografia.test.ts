import { describe, it, expect } from "vitest";
import { comFlag } from "./helpers";
import {
  cifraDisponivel,
  decifrar,
  formatoDaChaveValido,
  cifrar,
} from "../src/lib/criptografia";

// T3.4 (decisão D3): o envelope que guarda o segredo do segundo fator.
//
// Este arquivo é unitário de propósito: cifrações de segredo não dependem de MySQL, e
// é justamente a parte que precisa ser provada antes de qualquer conta existir. O
// que não pode acontecer aqui tem nome: segredo em claro no banco, chave impressa
// em mensagem de erro, e produção subindo sem chave própria.

const SEGREDO_EXEMPLO = "JBSWY3DPEHPK3PXP";

/** Chave de 32 bytes em hexadecimal, escrita como um ambiente de verdade escreveria. */
const CHAVE_DE_TESTE = "a".repeat(63) + "b";
const CHAVE_DE_OUTRO_LADO = "b".repeat(63) + "a";

/** Captura a mensagem de erro sem imprimir segredo nenhum na saída do vitest. */
function mensagemDoErro(trecho: () => unknown): string {
  try {
    trecho();
  } catch (erro) {
    return erro instanceof Error ? erro.message : String(erro);
  }
  return "";
}

describe("Cifração do segredo do segundo fator", () => {
  it("cifra e devolve o mesmo texto, sem nunca entregar o texto no envelope", () => {
    const envelope = cifrar(SEGREDO_EXEMPLO);
    expect(envelope.startsWith("v1:")).toBe(true);
    expect(envelope).not.toContain(SEGREDO_EXEMPLO);
    expect(decifrar(envelope)).toBe(SEGREDO_EXEMPLO);
  });

  it("dois envelopes do mesmo segredo sao diferentes, e os dois abrem", () => {
    const a = cifrar(SEGREDO_EXEMPLO);
    const b = cifrar(SEGREDO_EXEMPLO);
    // Vetor de inicial aleatorio: se a saida fosse igual, um dump mostraria quais
    // contas compartilham o mesmo segredo -- e o GCM perderia o sentido.
    expect(a).not.toBe(b);
    expect(decifrar(a)).toBe(decifrar(b));
  });

  it("com outra chave o envelope nao abre, e o erro nao cita chave nem segredo", async () => {
    await comFlag("TOTP_ENCRYPTION_KEY", CHAVE_DE_TESTE, async () => {
      const envelope = cifrar(SEGREDO_EXEMPLO);
      await comFlag("TOTP_ENCRYPTION_KEY", CHAVE_DE_OUTRO_LADO, async () => {
        // A cifraçao existe para que a tabela sozinha nao abra nada, e isso só é
        // verdade se a chave importar: trocada a chave, o mesmo envelope é lixo.
        const mensagem = mensagemDoErro(() => decifrar(envelope));
        expect(mensagem).not.toBe("");
        expect(mensagem).not.toContain(SEGREDO_EXEMPLO);
        expect(mensagem).not.toMatch(/[0-9a-f]{16}/);
      });
      // De volta à chave dona, o mesmo envelope abre.
      expect(decifrar(envelope)).toBe(SEGREDO_EXEMPLO);
    });
  });

  it("envelope adulterado ou truncado devolve erro, nao lixo", () => {
    const envelope = cifrar(SEGREDO_EXEMPLO);
    const [, iv, tag, texto] = envelope.split(":");
    // Mexer um caractere do texto cifrado: o GCM autentica, então a resposta é
    // "este envelope não é meu", e não "aqui está um segredo qualquer".
    expect(() => decifrar("v1:" + iv + ":" + tag + ":" + texto!.slice(0, -4) + "AAAA")).toThrow();
    expect(() => decifrar("v1:" + iv + ":" + tag)).toThrow();
    expect(() => decifrar("v2:" + iv + ":" + tag + ":" + texto)).toThrow();
  });

  it("fora de producao, sem chave propria a cifraçao ainda funciona e e estavel", async () => {
    await comFlag("TOTP_ENCRYPTION_KEY", "", async () => {
      expect(cifraDisponivel()).toBe(true);
      const envelope = cifrar(SEGREDO_EXEMPLO);
      expect(decifrar(envelope)).toBe(SEGREDO_EXEMPLO);
      // Estável significa derivada do JWT_ACCESS_SECRET: dois envelopes abrem com a
      // mesma chave implícita, e um reinício do servidor não perde os segredos.
      expect(decifrar(cifrar(SEGREDO_EXEMPLO))).toBe(SEGREDO_EXEMPLO);
    });
  });

  it("em producao a chave propria e obrigatoria, e o erro nomeia a chave sem imprimir valor", async () => {
    await comFlag("NODE_ENV", "production", async () => {
      await comFlag("TOTP_ENCRYPTION_KEY", "", async () => {
        expect(cifraDisponivel()).toBe(false);
        const mensagem = mensagemDoErro(() => cifrar(SEGREDO_EXEMPLO));
        expect(mensagem).toContain("TOTP_ENCRYPTION_KEY");
        expect(mensagem).not.toContain(SEGREDO_EXEMPLO);
      });
      // Com a chave declarada, a mesma producao funciona.
      await comFlag("TOTP_ENCRYPTION_KEY", CHAVE_DE_TESTE, async () => {
        expect(cifraDisponivel()).toBe(true);
        expect(decifrar(cifrar(SEGREDO_EXEMPLO))).toBe(SEGREDO_EXEMPLO);
      });
    });
  });

  it("chave com formato errado e recusada, e o erro nao devolve a chave", async () => {
    await comFlag("TOTP_ENCRYPTION_KEY", "senha-de-tutorial", async () => {
      expect(cifraDisponivel()).toBe(false);
      const mensagem = mensagemDoErro(() => cifrar(SEGREDO_EXEMPLO));
      expect(mensagem).toContain("TOTP_ENCRYPTION_KEY");
      expect(mensagem).not.toContain("senha-de-tutorial");
    });
  });

  it("a regua do formato da chave e a mesma da producao", () => {
    expect(formatoDaChaveValido(CHAVE_DE_TESTE)).toBe(true);
    expect(formatoDaChaveValido("a".repeat(63))).toBe(false);
    expect(formatoDaChaveValido("g".repeat(64))).toBe(false);
    expect(formatoDaChaveValido("")).toBe(false);
  });
});
