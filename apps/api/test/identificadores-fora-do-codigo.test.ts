import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// R2 do prompt de segurança: o endereço pessoal do administrador global e a
// senha de desenvolvimento do seed saíram do repositório. Este arquivo é a porta
// que impede os dois de voltarem: ele varre TODOS os arquivos rastreados —
// código, teste, ferramenta, README, CHANGELOG — e falha se qualquer um deles
// reaparecer.
//
// Os valores procurados são montados por fragmentos de propósito. Um teste que
// caça um literal não pode escrever o próprio literal, senão ele mesmo seria a
// primeira violação varrida.

const RAIZ = resolve(process.cwd(), "..", ".."); // apps/api -> raiz do monorepo
const BINARIO = /\.(png|jpe?g|webp|gif|ico|woff2?|ttf|eot|zip|pdf|mp3|mp4)$/i;

const ENDERECO_DO_ADMINISTRADOR = ["nexus", "bussiness", ".", "admin", "@", "gmail", ".com"].join("");
const SENHA_DE_DESENVOLVIMENTO = ["Nex", "us", "@", "20", "26"].join("");

// O domínio pessoal é a forma ampla da mesma regra: o projeto não tem nenhuma
// conta @gmail — a identidade escrita no código é fictícia e termina em
// exemplo.test.
const FORMADO_DOMINIO_PESSOAL = /@gmail\.com/i;

function arquivosRastreados(): string[] {
  const saida = execFileSync("git", ["-C", RAIZ, "ls-files", "-z"], { maxBuffer: 64e6 });
  // Arquivo que o git ainda lista mas o disco já não tem: é o intervalo entre
  // apagar um componente e indexar a apagada. O que sumiu do disco não carrega
  // dado nenhum, e o histórico continua coberto pela varredura de patch.
  return saida
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((arquivo) => existsSync(resolve(RAIZ, arquivo)));
}

function textoDe(arquivo: string): string {
  return readFileSync(resolve(RAIZ, arquivo), "utf8");
}

// Devolve "arquivo:linha" de cada ocorrência — nunca o valor encontrado.
function ocorrencias(procura: string | RegExp): string[] {
  const achados: string[] = [];
  for (const arquivo of arquivosRastreados()) {
    if (BINARIO.test(arquivo)) continue;
    const texto = textoDe(arquivo);
    const linhas = texto.split("\n");
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i] ?? "";
      const casa = typeof procura === "string" ? linha.includes(procura) : procura.test(linha);
      if (casa) achados.push(`${arquivo}:${i + 1}`);
    }
  }
  return achados;
}

describe("Identificadores reais fora do código (R2)", () => {
  it("nenhum arquivo rastreado traz o endereço pessoal do administrador global", () => {
    expect(ocorrencias(ENDERECO_DO_ADMINISTRADOR)).toEqual([]);
  });

  it("nenhum arquivo rastreado traz um endereço de domínio pessoal", () => {
    expect(ocorrencias(FORMADO_DOMINIO_PESSOAL)).toEqual([]);
  });

  it("nenhum arquivo rastreado traz a senha de desenvolvimento do seed", () => {
    expect(ocorrencias(SENHA_DE_DESENVOLVIMENTO)).toEqual([]);
  });

  it("o padrão fora de produção é a conta fictícia admin@exemplo.test", () => {
    for (const arquivo of ["apps/api/src/lib/passwordPolicy.ts", "apps/api/prisma/seed.ts"]) {
      const fonte = textoDe(arquivo);
      expect(fonte, arquivo).toContain("admin@exemplo.test");
      expect(fonte, arquivo).not.toContain(ENDERECO_DO_ADMINISTRADOR);
    }
  });

  it("o .env.example só carrega placeholder, nunca valor real", () => {
    const exemplo = textoDe("apps/api/.env.example");
    expect(exemplo).toContain("SUPER_ADMIN_EMAIL=admin@exemplo.test");
    expect(exemplo).toContain("SEED_DEV_PASSWORD=defina-uma-senha-forte");
    expect(exemplo).not.toContain(SENHA_DE_DESENVOLVIMENTO);
    expect(exemplo).not.toMatch(FORMADO_DOMINIO_PESSOAL);
  });

  it("as ferramentas de prova leem o endereço do administrador, não o repetem", () => {
    const leitor = textoDe("tools/senha-admin.cjs");
    // A mesma ordem da senha: ambiente primeiro, depois o arquivo local ignorado.
    expect(leitor).toContain("NEXUS_ADMIN_EMAIL");
    expect(leitor).toContain("SUPER_ADMIN_EMAIL");
    expect(leitor).not.toContain(ENDERECO_DO_ADMINISTRADOR);
    // Toda ferramenta que fazia login com o endereço agora usa EMAIL_ADMIN.
    const comLiteral = arquivosRastreados().filter(
      (a) => a.startsWith("tools/") && !a.endsWith(".local.cjs") && textoDe(a).includes(ENDERECO_DO_ADMINISTRADOR),
    );
    expect(comLiteral).toEqual([]);
  });
});
