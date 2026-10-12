import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// R1 do prompt de segurança: as capturas que vao para o GitHub nunca podem carregar
// credencial ou identidade de verdade. Este teste e a prova automatica de que os
// scripts de navegador (tools/shoot-*.cjs, tools/verify-*.cjs, tools/audit-*.cjs)
// entraram na regra:
//  - nenhuma senha literal e digitada no formulario de login;
//  - a conta real do administrador da plataforma nao aparece nos scripts que
//    fotografam tela de identidade;
//  - o botao que revela a senha jamais e clicado por uma captura;
//  - a conta ficticia de captura le credencial do ambiente ou do arquivo local,
//    nunca de um literal no codigo.

const RAIZ = resolve(__dirname, "..", "..", "..");
const TOOLS = join(RAIZ, "tools");

const EMAIL_ADMIN = "nexusbussiness.admin@gmail.com";

/**
 * As telas que mostram identidade — credencial digitada, lista de usuários, a
 * própria conta e a lista de empresas. Estes scripts não podem nem citar a conta
 * real do administrador.
 */
const DE_IDENTIDADE = [
  "shoot-auth.cjs",
  "shoot-tabs.cjs",
  "verify-configuracoes.cjs",
  "shoot-clients.cjs",
  "conta-de-captura.cjs",
];

const le = (nome: string) => readFileSync(join(TOOLS, nome), "utf8");
const todosOsScripts = () =>
  readdirSync(TOOLS)
    .filter((nome) => nome.endsWith(".cjs") && !nome.endsWith(".local.cjs"))
    .sort();

describe("capturas de prova: credencial nunca entra na imagem", () => {
  it("nenhum script de navegador digita uma senha literal no formulario de login", () => {
    const ofensores: string[] = [];
    for (const nome of todosOsScripts()) {
      const texto = le(nome);
      // page.type("input[type=password]", "alguma-coisa") — o valor entre aspas é
      // o que a câmera veria. Sempre tem que ser variável, nunca literal.
      const digitou = /page\.type\(\s*["'`][^"'`]*password[^"'`]*["'`]\s*,\s*["'`]/.test(texto);
      if (digitou) ofensores.push(nome);
    }
    expect(ofensores).toEqual([]);
  });

  it("a senha da conta de desenvolvimento nao existe em nenhum script", () => {
    const ofensores = todosOsScripts().filter(
      (nome) => le(nome).includes("Nexus@2026") || le(nome).includes("admin@nexus.local"),
    );
    expect(ofensores).toEqual([]);
  });

  it("nenhuma captura clica no botao que revela a senha", () => {
    const ofensores = todosOsScripts().filter((nome) => le(nome).includes("eye-toggle"));
    expect(ofensores).toEqual([]);
  });

  it("os scripts de identidade nao citam a conta real do administrador", () => {
    for (const nome of DE_IDENTIDADE) {
      const texto = le(nome);
      expect(texto.includes(EMAIL_ADMIN), nome + " cita o e-mail real do administrador").toBe(false);
      expect(
        texto.includes("./senha-admin.cjs"),
        nome + " importa a senha do administrador",
      ).toBe(false);
    }
  });

  it("a conta de captura nao tem credencial literal no codigo", () => {
    const texto = le("conta-de-captura.cjs");
    expect(texto).toContain("NEXUS_CAPTURA_SENHA");
    expect(texto).toContain("NEXUS_CAPTURA_EMAIL");
    expect(texto).toMatch(/crypto\.randomBytes|randomInt/);
    // nenhuma senha pode estar escrita entre aspas no arquivo
    const literal = /(senha|password|passwordHint)\s*[:=]\s*["'][^"']{6,}["']/i.exec(texto);
    expect(literal && literal[0], "literal de senha em conta-de-captura.cjs").toBeNull();
    // o endereco de teste e de um dominio que a RFC 6761 reserva
    expect(texto).toMatch(/exemplo\.test/);
  });

  it("o print de login e fotografado antes de qualquer digitacao", () => {
    const texto = le("shoot-auth.cjs");
    const ateOModeloDeLogin = texto.split('shot("02-login")')[0];
    expect(ateOModeloDeLogin, "shoot-auth nao captura o login").not.toBe(texto);
    expect(ateOModeloDeLogin).not.toMatch(/page\.type\(/);
    expect(ateOModeloDeLogin).toContain("localStorage.clear()");
  });

  it("a recuperacao de senha e capturada sem codigo na tela", () => {
    const texto = le("shoot-auth.cjs");
    // a prova confere o proprio print: se aparecer sequencia de 16+ caracteres,
    // a corrida falha em vez de guardar a imagem
    expect(texto).toMatch(/\[0-9a-f\]\{16,\}/);
    expect(texto).toMatch(/sequenciaSuspeita/);
    // e o e-mail usado nao pertence a ninguem
    expect(texto).toMatch(/solicitante@exemplo\.test/);
    expect(texto.includes(EMAIL_ADMIN)).toBe(false);
  });

  it("shoot.cjs separa a conta de captura da conta do administrador, tela a tela", () => {
    const texto = le("shoot.cjs");
    // identidade: conta ficticia (ou nenhuma)
    expect(texto).toMatch(/\{\s*foto:\s*"02-login",\s*conta:\s*null\s*\}/);
    expect(texto).toMatch(/\{\s*foto:\s*"04-usuarios",\s*conta:\s*"captura"\s*\}/);
    expect(texto).toMatch(/\{\s*foto:\s*"06-configuracoes-claro",\s*conta:\s*"captura"\s*\}/);
    // as duas telas de fluxo que pedem a empresa de demonstracao cheia ficam
    // declaradas aqui, e o teste abaixo confere que nao ha mais nenhuma
    const comAdministrador = [...texto.matchAll(/\{\s*foto:\s*"([^"]+)",\s*conta:\s*"administrador"\s*\}/g)]
      .map((m) => m[1])
      .sort();
    expect(comAdministrador).toEqual(["03-dashboard", "05-auditoria"]);
    // nenhum print do shoot.cjs revela senha digitada
    expect(texto).not.toMatch(/page\.type\(\s*["'`][^"'`]*password[^"'`]*["'`]\s*,\s*["'`]/);
  });
});
