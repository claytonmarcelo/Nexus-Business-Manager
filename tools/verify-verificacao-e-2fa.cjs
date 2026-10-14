// F5, item 3 + achado N62 (P17): as duas telas que a F4 trouxe, provadas no navegador.
//
// O teste unitário já exercita as duas telas com rede de mentira. Esta prova faz o
// que ele não pode fazer: atravessa a API e o banco de verdade, com Chrome, e mede
// o que a pessoa vê e o que sobou no navegador e nas tabelas depois.
//
// O que ela confere, na ordem:
//
//   1. verificação de e-mail — o link confirma a conta (a coluna `emailVerifiedAt`
//      sai de nulo), o token gasto não serve de novo, e um token velho, um token
//      inexistente e um token vencido devolvem exatamente a mesma frase: a tela não
//      é canal para descobrir quais endereços estão cadastrados;
//   2. o token nunca fica no armazenamento do navegador, nem como chave nem como
//      valor, e abrir a tela sem token não dispara conferência nenhuma;
//   3. o reenvio responde a mesma coisa para um endereço que existe e para um que
//      não existe — status e corpo conferidos na própria chamada do navegador;
//   4. segundo fator — ligar pela tela gera segredo, ele só aparece uma vez, chega
//      ao banco cifrado (o envelope `v1:` não contém o segredo em claro), e a
//      ativação emite os dez códigos de recuperação sem guardar cópia em lugar
//      nenhum;
//   5. desligar pela tela exige código, não senha: um código errado é recusado sem
//      gastar nada, e um código de recuperação funciona e limpa os dez do banco.
//
// A conta desta corrida nasce aqui pelo fluxo público de cadastro e morre aqui:
// nada é escrito na conta de captura nem na casa de demonstração do administrador.
// O segredo TOTP e os códigos de recuperação são lidos da tela para o Node, usados
// para abrir a própria porta, e nunca impressos nem fotografados — onde eles
// aparecem, a saída desta prova mostra comprimento e formato.
const puppeteer = require("puppeteer-core");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { TOTP, Secret } = require("otpauth");
const { conferirServidorDeProva, clienteDoBancoDeProva } = require("./banco-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.NEXUS_WEB || "http://localhost:5173";
const API = (process.env.NEXUS_API || "http://localhost:3001") + "/api";
const ARQUIVO_ENV = path.join(__dirname, "..", "apps", "api", ".env");

// Os mesmos parâmetros do `lib/segundo-fator.ts` da API: a prova calcula o código
// que um aplicativo autenticador calcula, e não pede favor a ninguém.
const EMISSOR_DO_TOTP = "Nexus Business Manager";
const PARAMETROS_DO_TOTP = { digits: 6, period: 30, algorithm: "SHA1" };

const ENDERECO_INEXISTENTE = "ninguem@exemplo.invalido";

let checks = 0;
const falhas = [];
function ok(nome, cond, detalhe) {
  checks += 1;
  if (cond) console.log("  [ok] " + nome + (detalhe ? " (" + detalhe + ")" : ""));
  else {
    falhas.push(nome + (detalhe ? " -> " + detalhe : ""));
    console.log("  [FALHA] " + nome + (detalhe ? " (" + detalhe + ")" : ""));
  }
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// O valor da chave de ambiente entra na memória e não sai daqui: o que a prova
// imprime é o nome da chave, nunca o conteúdo.
function valorDaChave(chave) {
  if (!fs.existsSync(ARQUIVO_ENV)) return "";
  const texto = fs.readFileSync(ARQUIVO_ENV, "utf8").replace(/\r\n/g, "\n");
  for (const linha of texto.split("\n")) {
    if (linha.trim().startsWith("#")) continue;
    const m = linha.match(new RegExp("^\\s*" + chave + "\\s*=\\s*(.+?)\\s*$"));
    if (m) return m[1].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}

// Mesmo HMAC da API (`lib/tokens.ts`): é assim que a prova escreve um token de
// verificação próprio sem depender de ler caixa de e-mail nenhuma.
function hashToken(token) {
  return crypto.createHmac("sha256", valorDaChave("JWT_REFRESH_SECRET")).update(token).digest("hex");
}

function clienteTotp(segredoBase32) {
  return new TOTP({
    ...PARAMETROS_DO_TOTP,
    issuer: EMISSOR_DO_TOTP,
    label: "conta",
    secret: Secret.fromBase32(segredoBase32),
  });
}

function codigoTotp(segredoBase32) {
  return clienteTotp(segredoBase32).generate();
}

/**
 * Um código de seis dígitos que a própria régua da biblioteca recusa.
 *
 * A janela do servidor é `validate({ window: 1 })` — o código da hora e os dois
 * vizinhos, de trinta segundos antes e depois, todos abrem a porta. Chutar um
 * número diferente do atual não basta: pode ser justamente um dos vizinhos. Aqui
 * o chute é devolvido só depois de passar pelo mesmo teste que a API faz, e a
 * prova disso está no passo anterior: o código gerado por esta mesma biblioteca
 * foi aceito pelo servidor na ativação.
 */
function codigoTotpInvalido(segredoBase32) {
  const totp = clienteTotp(segredoBase32);
  const valido = totp.generate();
  for (let i = 0; i < 1000; i++) {
    const chute = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    if (chute !== valido && totp.validate({ token: chute, window: 1 }) === null) return { valido, chute };
  }
  throw new Error("[prova] não deu para achar um código de seis dígitos fora da janela de ±30 s");
}

async function chame(metodo, caminho, corpo, token) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    dados = { texto };
  }
  return { status: res.status, dados, texto };
}

// ------------------------------------------------------------------- peça de tela
// Os campos e botões são procurados pelo texto que a pessoa lê, do mesmo jeito
// que em tools/verify-configuracoes.cjs: se a frase mudar, a prova quebra junto,
// e aí é a prova que avisa que a tela mudou.
function injeteAjuda(page) {
  return page.evaluateOnNewDocument(() => {
    window.tituloDoBloco = function (bloco) {
      return (bloco.querySelector(".panel-title")?.textContent || "").trim();
    };
    window.blocoPorTitulo = function (titulo) {
      return [...document.querySelectorAll(".nx-bloco")].find((b) => window.tituloDoBloco(b) === titulo) || null;
    };
    window.textoDe = function (seletor) {
      const el = document.querySelector(seletor);
      return el ? (el.textContent || "").trim() : null;
    };
    /** Botão (ou alerta) dentro de um bloco, procurado pelo texto do próprio botão. */
    window.acaoDoBloco = function (titulo, texto) {
      const bloco = window.blocoPorTitulo(titulo);
      if (!bloco) return "sem bloco";
      const alvo = [...bloco.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === texto);
      if (!alvo) return "sem botao";
      if (alvo.disabled) return "desabilitado";
      alvo.click();
      return "clicou";
    };
    window.alertaDoBloco = function (titulo) {
      const bloco = window.blocoPorTitulo(titulo);
      const el = bloco && bloco.querySelector('[role="alert"]');
      return el ? (el.textContent || "").trim() : null;
    };
    /** Tudo o que o navegador guarda, para a prova comparar em Node. Nunca é impresso. */
    window.armazenamento = function () {
      const saida = [];
      for (const area of [localStorage, sessionStorage]) {
        for (let i = 0; i < area.length; i++) {
          const k = area.key(i);
          saida.push({ chave: k, valor: area.getItem(k) });
        }
      }
      return saida;
    };
  });
}

/** Grava no Node cada resposta que casa com o filtro, com corpo e corpo do pedido.
 *  A linha entra na lista já no instante da resposta, e o corpo chega logo depois:
 *  sem isso a prova leria uma contagem atrasada e chamaria de medição. */
function graveRede(page, filtro, coletor) {
  page.on("response", (res) => {
    const url = res.url();
    if (!filtro.test(url)) return;
    const entrada = {
      url,
      status: res.status(),
      metodo: res.request().method(),
      pedido: res.request().postData() || "",
      corpo: "(ainda nao lido)",
    };
    coletor.push(entrada);
    res
      .text()
      .then((t) => {
        entrada.corpo = t;
      })
      .catch(() => {
        entrada.corpo = "(corpo indisponivel)";
      });
  });
}

async function novaPagina(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await injeteAjuda(page);
  return page;
}

async function semToast(page) {
  await page
    .waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 15000 })
    .catch(() => undefined);
  await espera(250);
}

async function digitar(page, seletor, texto) {
  await page.waitForSelector(seletor);
  await page.click(seletor, { clickCount: 3 });
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) el.value = "";
  }, seletor);
  await page.type(seletor, texto, { delay: 8 });
}

/** Botão procurado pelo texto que a pessoa lê — o mesmo critério das outras provas. */
async function cliquePorTexto(page, texto) {
  const resultado = await page.evaluate((t) => {
    const alvo = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").trim() === t);
    if (!alvo) return "sem botao";
    if (alvo.disabled) return "desabilitado";
    alvo.click();
    return "clicou";
  }, texto);
  if (resultado !== "clicou") {
    throw new Error('[prova] o botão "' + texto + '" não estava clicável (' + resultado + ")");
  }
}

/** Última resposta que a página recebeu de um caminho, ou 0 quando não houve. */
function ultimoStatus(rede, caminho) {
  const chamadas = chamadasDe(rede, caminho);
  return chamadas.length ? chamadas[chamadas.length - 1].status : 0;
}

/** As chamadas que a página fez a um caminho — a contagem que a prova compara. */
function chamadasDe(rede, caminho) {
  return rede.filter((r) => r.url.includes(caminho));
}

// ============================================================== 1) tela de link
async function provaVerificacao(browser, conta, tokenValido) {
  console.log("== 1) /verificar-e-mail: o link confirma, e a recusa não denuncia nada ==");
  const pagina = await novaPagina(browser);
  const rede = [];
  graveRede(pagina, /\/auth\/(verify-email|resend-verification)/, rede);

  // O token no endereço confirma a conta — e é a única credencial deste caminho.
  await pagina.goto(BASE + "/verificar-e-mail?token=" + tokenValido, { waitUntil: "networkidle0" });
  await pagina.waitForFunction(() => window.textoDe(".auth-title") === "Conta ativada", { timeout: 20000 });
  const subConfirmado = await pagina.evaluate(() => window.textoDe(".auth-sub"));
  ok("o link válido ativa a conta na tela", subConfirmado.includes(conta.email), subConfirmado);
  const hrefEntrar = await pagina.evaluate(() => document.querySelector("a.neu-btn")?.getAttribute("href") || "");
  ok("confirmado oferece ENTRAR levando ao login", hrefEntrar.includes("/login"), hrefEntrar);
  const chamada = chamadasDe(rede, "/verify-email");
  ok("a tela fez uma conferência só", chamada.length === 1, String(chamada.length));
  ok("a conferência respondeu 200", chamada[0] && chamada[0].status === 200, String(chamada[0] && chamada[0].status));
  ok("o pedido levou o token e nada além dele", (() => {
    try {
      return Object.keys(JSON.parse(chamada[0].pedido)).join() === "token";
    } catch {
      return false;
    }
  })());

  const confirmadoNoBanco = await prisma.user.findUnique({ where: { id: conta.id }, select: { emailVerifiedAt: true } });
  ok("a coluna emailVerifiedAt saiu de nulo no banco", Boolean(confirmadoNoBanco.emailVerifiedAt));
  const tokenGasto = await prisma.emailVerificationToken.findFirst({ where: { userId: conta.id, usedAt: null } });
  ok("nenhum token da conta ficou sem carimbo de uso", !tokenGasto);

  // O token não fica no navegador: nem como chave, nem dentro de valor algum.
  const guardado = await pagina.evaluate(() => window.armazenamento());
  ok(
    "nenhum armazenamento do navegador guarda o token (" + guardado.length + " chaves lidas)",
    guardado.every((e) => !String(e.chave).includes(tokenValido) && !String(e.valor).includes(tokenValido)),
  );

  // Reabrir o mesmo endereço: o token já foi gasto, e a tela trata isso igual a
  // token inexistente e igual a token vencido.
  await pagina.reload({ waitUntil: "networkidle0" });
  await pagina.waitForSelector('[role="alert"]');
  const recusaUsado = await pagina.evaluate(() => ({
    titulo: window.textoDe(".auth-title"),
    alerta: (document.querySelector('[role="alert"]')?.textContent || "").trim(),
  }));

  const tresRecusas = [{ de: "usado", ...recusaUsado, status: ultimoStatus(rede, "/verify-email") }];
  const tokenInexistente = crypto.randomBytes(24).toString("hex");
  await pagina.goto(BASE + "/verificar-e-mail?token=" + tokenInexistente, { waitUntil: "networkidle0" });
  await pagina.waitForSelector('[role="alert"]');
  const recusaInexistente = await pagina.evaluate(() => ({
    titulo: window.textoDe(".auth-title"),
    alerta: (document.querySelector('[role="alert"]')?.textContent || "").trim(),
  }));
  const statusInexistente = ultimoStatus(rede, "/verify-email");

  const tokenVencido = crypto.randomBytes(24).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { userId: conta.id, tokenHash: hashToken(tokenVencido), expiresAt: new Date(Date.now() - 60_000) },
  });
  await pagina.goto(BASE + "/verificar-e-mail?token=" + tokenVencido, { waitUntil: "networkidle0" });
  await pagina.waitForSelector('[role="alert"]');
  const recusaVencido = await pagina.evaluate(() => ({
    titulo: window.textoDe(".auth-title"),
    alerta: (document.querySelector('[role="alert"]')?.textContent || "").trim(),
  }));
  const statusVencido = ultimoStatus(rede, "/verify-email");

  tresRecusas.push({ de: "inexistente", ...recusaInexistente, status: statusInexistente });
  tresRecusas.push({ de: "vencido", ...recusaVencido, status: statusVencido });
  const [a, b, c] = tresRecusas;
  ok(
    "token usado, inexistente e vencido dão a mesma frase e o mesmo status",
    a.alerta === b.alerta && b.alerta === c.alerta && a.status === b.status && b.status === c.status,
    "HTTP " + [a.status, b.status, c.status].join("/") + " — \"" + b.alerta + "\"",
  );
  ok("a recusa não diz se o endereço existe", !/exemplo\.(test|invalido)/.test(a.alerta + b.alerta + c.alerta));
  ok("os três casos mostram o mesmo título", a.titulo === b.titulo && b.titulo === c.titulo, b.titulo);

  // Abrir a tela sem token: a pessoa cai na mesma recusa, e nenhuma conferência é
  // feita — não há o que conferir, e a tela não pergunta à toa.
  const antesDeSemToken = chamadasDe(rede, "/verify-email").length;
  await pagina.goto(BASE + "/verificar-e-mail", { waitUntil: "networkidle0" });
  await pagina.waitForSelector(".auth-title");
  await espera(600);
  const tituloSemToken = await pagina.evaluate(() => window.textoDe(".auth-title"));
  const depoisDeSemToken = chamadasDe(rede, "/verify-email").length;
  ok("abrir sem token mostra a recusa", tituloSemToken === "Confirme o seu e-mail", tituloSemToken);
  ok("abrir sem token não dispara conferência nenhuma", depoisDeSemToken === antesDeSemToken, antesDeSemToken + " -> " + depoisDeSemToken);

  // Reenvio: o endereço que existe (agora confirmado) e o que não existe em lugar
  // nenhum. As duas respostas são comparadas na chamada que o próprio navegador fez.
  await digitar(pagina, 'input[type="email"]', ENDERECO_INEXISTENTE);
  await cliquePorTexto(pagina, "REENVIAR A MENSAGEM");
  await pagina.waitForFunction(
    () => [...document.querySelectorAll("p")].some((p) => (p.textContent || "").includes("caixa de spam")),
    { timeout: 20000 },
  );
  const fraseInexistente = await pagina.evaluate(() =>
    [...document.querySelectorAll("p")].map((p) => (p.textContent || "").trim()).find((t) => t.includes("caixa de spam")));
  await espera(500);

  await digitar(pagina, 'input[type="email"]', conta.email);
  await cliquePorTexto(pagina, "REENVIAR A MENSAGEM");
  await espera(1200);
  const fraseConfirmado = await pagina.evaluate(() =>
    [...document.querySelectorAll("p")].map((p) => (p.textContent || "").trim()).find((t) => t.includes("caixa de spam")));

  const doisReenvios = chamadasDe(rede, "/resend-verification");
  ok("a tela chamou o reenvio duas vezes", doisReenvios.length === 2, String(doisReenvios.length));
  ok(
    "os dois reenvios responderam a mesma coisa, status e corpo",
    doisReenvios.length === 2 &&
      doisReenvios[0].status === doisReenvios[1].status &&
      doisReenvios[0].corpo === doisReenvios[1].corpo,
    doisReenvios.map((r) => r.status + " " + r.corpo).join(" | "),
  );
  ok(
    "a frase da tela é a mesma nos dois endereços",
    Boolean(fraseInexistente) && fraseInexistente === fraseConfirmado,
    String(fraseInexistente).slice(0, 60) + "…",
  );
  ok("nenhum reenvio devolve o endereço de volta", !doisReenvios.some((r) => r.corpo.includes("@")));
  ok(
    "pedir outra mensagem não refaz a conferência",
    chamadasDe(rede, "/verify-email").length === depoisDeSemToken,
  );

  // E-mail inválido na tela: o aviso é local, e a API não é chamada.
  const antesDoInvalido = chamadasDe(rede, "/resend-verification").length;
  await digitar(pagina, 'input[type="email"]', "nao-e-nada");
  await cliquePorTexto(pagina, "REENVIAR A MENSAGEM");
  await espera(900);
  const depoisDoInvalido = chamadasDe(rede, "/resend-verification").length;
  const toast = await pagina.evaluate(() => (document.querySelector(".toast-message, .toast")?.textContent || "").trim());
  ok("endereço inválido é barrado na tela, sem chamar a API", depoisDoInvalido === antesDoInvalido, antesDoInvalido + " -> " + depoisDoInvalido);
  ok("e a pessoa recebe o aviso do motivo", /e-mail/i.test(toast), toast.slice(0, 60));

  await pagina.close();
}

// ========================================================= 2) painel de segundo fator
async function provaSegundoFator(browser, conta) {
  console.log("== 2) /app/configuracoes: ligar, provar o código, e desligar sem a senha ==");
  const pagina = await novaPagina(browser);
  const rede = [];
  graveRede(pagina, /\/auth\/2fa\/(preparar|ativar|desativar|status)/, rede);

  await pagina.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await pagina.waitForSelector('input[type="email"]');
  await pagina.type('input[type="email"]', conta.email, { delay: 8 });
  await pagina.type('input[type="password"]', conta.senha, { delay: 8 });
  await Promise.all([
    pagina.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 30000 }),
    pagina.click("button[type=submit]"),
  ]);
  await semToast(pagina);

  await pagina.goto(BASE + "/app/configuracoes", { waitUntil: "networkidle0" });
  await pagina.waitForFunction(() => Boolean(window.blocoPorTitulo("Segundo fator desligado")), { timeout: 25000 });
  ok("a conta nova começa com o segundo fator desligado", true, "bloco lido na tela");
  ok(
    "o bloco explica que ligar é escolha, não obrigação",
    await pagina.evaluate(() => {
      const b = window.blocoPorTitulo("Segundo fator desligado");
      return (b.querySelector(".nx-bloco-sub")?.textContent || "").includes("Aqui é escolha sua");
    }),
  );

  // ---- gerar o segredo ----
  const clicouGerar = await pagina.evaluate(() => window.acaoDoBloco("Segundo fator desligado", "ATIVAR SEGUNDO FATOR"));
  ok("o botão de ativar existe e foi clicado", clicouGerar === "clicou", String(clicouGerar));
  await pagina.waitForSelector(".nx-2fa-segredo", { timeout: 25000 });
  const segredo = await pagina.evaluate(() => window.textoDe(".nx-2fa-segredo"));
  ok("a tela mostra o segredo em base32", /^[A-Z2-7]{16,}$/.test(segredo || ""), (segredo || "").length + " caracteres");
  const uri = await pagina.evaluate(() => window.textoDe(".nx-2fa-uri p"));
  ok("o endereço de configuração vem pronto para o aplicativo", uri.startsWith("otpauth://totp/"), uri.slice(0, 24) + "…");
  ok("o endereço de configuração nomeia o emissor", /Nexus/.test(uri), "emissor presente");
  const preparou = rede.filter((r) => r.url.includes("/2fa/preparar"));
  ok("gerar o segredo chamou /2fa/preparar uma vez", preparou.length === 1, String(preparou.length));

  const pendente = await prisma.user.findUnique({
    where: { id: conta.id },
    select: { totpEnabledAt: true, totpSecretCiphertext: true },
  });
  ok("segredo gerado e não confirmado deixa a conta pendente", !pendente.totpEnabledAt);
  ok("o segredo chegou ao banco dentro de um envelope cifrado", /^v1:/.test(pendente.totpSecretCiphertext || ""), (pendente.totpSecretCiphertext || "").slice(0, 3) + "…");
  ok("o texto cifrado não contém o segredo em claro", !(pendente.totpSecretCiphertext || "").includes(segredo));

  const guardadoComSegredo = await pagina.evaluate(() => window.armazenamento());
  ok(
    "o segredo não vai para o armazenamento do navegador (" + guardadoComSegredo.length + " chaves lidas)",
    guardadoComSegredo.every((e) => !String(e.valor).includes(segredo) && !String(e.chave).includes(segredo)),
  );

  // Cancelar apaga a tela: um segredo que ninguém confirmou não fica visível em
  // lugar nenhum. O estado pendente, esse sim, sobrevive — e é ele que a tela lê de
  // novo ao reabrir, para oferecer outro segredo em vez de um botão que não faz nada.
  await pagina.evaluate(() => window.acaoDoBloco("Segundo fator desligado", "Cancelar"));
  await espera(600);
  const sobrouSegredo = await pagina.evaluate(() => Boolean(document.querySelector(".nx-2fa-segredo")));
  ok("cancelar tira o segredo da tela", !sobrouSegredo);

  await pagina.reload({ waitUntil: "networkidle0" });
  await pagina.waitForFunction(() => Boolean(window.blocoPorTitulo("Segundo fator aguardando confirmação")), { timeout: 25000 });
  ok("reabrir a tela mostra a conta como pendente", true, "título lido depois do reload");
  const clicouDeNovo = await pagina.evaluate(() => window.acaoDoBloco("Segundo fator aguardando confirmação", "GERAR NOVO SEGREDO"));
  ok("o botão vira GERAR NOVO SEGREDO", clicouDeNovo === "clicou", String(clicouDeNovo));
  await pagina.waitForSelector(".nx-2fa-segredo", { timeout: 25000 });
  const segredoNovo = await pagina.evaluate(() => window.textoDe(".nx-2fa-segredo"));
  ok("o segundo segredo é outro segredo", segredoNovo !== segredo && /^[A-Z2-7]{16,}$/.test(segredoNovo), "gerado de novo");

  // ---- confirmar com o código do aplicativo ----
  const codigo = codigoTotp(segredoNovo);
  await digitar(pagina, 'input[aria-label="Código do aplicativo"]', codigo);
  await pagina.evaluate(() => window.acaoDoBloco("Segundo fator aguardando confirmação", "CONFIRMAR E LIGAR"));
  await pagina.waitForSelector("ol.nx-2fa-codigos li", { timeout: 25000 });
  const codigos = await pagina.evaluate(() => [...document.querySelectorAll("ol.nx-2fa-codigos li")].map((li) => (li.textContent || "").trim()));
  ok("a ativação entrega dez códigos de recuperação", codigos.length === 10, String(codigos.length));
  ok("cada código tem o formato que a tela anuncia", codigos.every((c) => /^[a-z0-9]{5}-[a-z0-9]{5}$/.test(c)), codigos[0].replace(/[a-z0-9]/g, "x"));
  const ativou = rede.filter((r) => r.url.includes("/2fa/ativar"));
  ok("confirmar o código chamou /2fa/ativar uma vez", ativou.length === 1, String(ativou.length));
  ok("o pedido de ativação leva só o código", (() => {
    try {
      return Object.keys(JSON.parse(ativou[0].pedido)).join() === "codigo";
    } catch {
      return false;
    }
  })());

  const ligado = await prisma.user.findUnique({
    where: { id: conta.id },
    select: { totpEnabledAt: true, totpSecretCiphertext: true },
  });
  ok("a conta fica ligada no banco", Boolean(ligado.totpEnabledAt));
  const hashes = await prisma.recoveryCode.findMany({ where: { userId: conta.id }, select: { codeHash: true, usedAt: true } });
  ok("os dez códigos estão no banco, nenhum gasto", hashes.length === 10 && hashes.every((h) => !h.usedAt), String(hashes.length));
  ok("nem um código de recuperação está em claro no banco", hashes.every((h) => !codigos.some((c) => h.codeHash.includes(c.replace("-", "")))));

  const sobrouSegredoDepois = await pagina.evaluate(() => Boolean(document.querySelector(".nx-2fa-segredo")));
  ok("depois de ligar o segredo some da tela", !sobrouSegredoDepois);
  const guardadoComCodigos = await pagina.evaluate(() => window.armazenamento());
  ok(
    "os códigos não ficam no navegador (" + guardadoComCodigos.length + " chaves lidas)",
    guardadoComCodigos.every((e) => !codigos.some((c) => String(e.valor).includes(c) || String(e.chave).includes(c))),
  );

  await cliquePorTexto(pagina, "ANOTEI, PODE FECHAR");
  await pagina.waitForFunction(() => Boolean(window.blocoPorTitulo("Segundo fator ligado")), { timeout: 25000 });
  const subLigado = await pagina.evaluate(() => (window.blocoPorTitulo("Segundo fator ligado").querySelector(".nx-bloco-sub")?.textContent || "").trim());
  ok("o bloco ligado conta os dez códigos que restam", /Restam 10 códigos de recuperação\./.test(subLigado), subLigado);

  // ---- desligar: senha não abre esta porta ----
  // A régua é o bloco do segundo fator, e não a página: a mesma aba tem o bloco de
  // troca de senha, e um campo de senha ali embaixo não tem nada a ver com isto.
  const campoSenhaNoBloco = await pagina.evaluate(() => {
    const b = window.blocoPorTitulo("Segundo fator ligado");
    return b ? Boolean(b.querySelector('input[type="password"]')) : null;
  });
  ok("o bloco que desliga pede código, não senha", campoSenhaNoBloco === false, String(campoSenhaNoBloco));
  const { chute } = codigoTotpInvalido(segredoNovo);
  await digitar(pagina, 'input[aria-label="Código para desligar"]', chute);
  await pagina.evaluate(() => window.acaoDoBloco("Segundo fator ligado", "DESLIGAR O SEGUNDO FATOR"));
  await pagina.waitForFunction(() => Boolean(window.alertaDoBloco("Segundo fator ligado")), { timeout: 25000 });
  const alertaErrado = await pagina.evaluate(() => window.alertaDoBloco("Segundo fator ligado"));
  ok("um código errado é recusado com a frase da API", /Código inválido/.test(alertaErrado), alertaErrado);
  const aindaLigado = await prisma.user.findUnique({ where: { id: conta.id }, select: { totpEnabledAt: true } });
  ok("erraram o código e o segundo fator continua de pé", Boolean(aindaLigado.totpEnabledAt));
  const contagemAposErro = await prisma.recoveryCode.count({ where: { userId: conta.id } });
  ok("nenhum código de recuperação foi gasto pela tentativa errada", contagemAposErro === 10, String(contagemAposErro));

  await digitar(pagina, 'input[aria-label="Código para desligar"]', codigos[0]);
  await pagina.evaluate(() => window.acaoDoBloco("Segundo fator ligado", "DESLIGAR O SEGUNDO FATOR"));
  await pagina.waitForFunction(() => Boolean(window.blocoPorTitulo("Segundo fator desligado")), { timeout: 25000 });
  const desativou = chamadasDe(rede, "/2fa/desativar");
  ok("a rota de desligar atendeu a tentativa errada e a certa, uma cada", desativou.length === 2, String(desativou.length));
  ok("o pedido de desligar leva só o código", (() => {
    try {
      return Object.keys(JSON.parse(desativou[desativou.length - 1].pedido)).join() === "codigo";
    } catch {
      return false;
    }
  })());
  const desligado = await prisma.user.findUnique({
    where: { id: conta.id },
    select: { totpEnabledAt: true, totpSecretCiphertext: true },
  });
  ok("desligado apaga o carimbo e o segredo do banco", !desligado.totpEnabledAt && !desligado.totpSecretCiphertext);
  const codesDepois = await prisma.recoveryCode.count({ where: { userId: conta.id } });
  ok("desligar leva os dez códigos embora", codesDepois === 0, String(codesDepois));

  // Nenhuma chamada autenticada desta prova levou senha no corpo.
  const corpoDeTodos = rede.map((r) => r.pedido).join(" ");
  ok("nenhuma das quatro chamadas de segundo fator levou senha", !/password|senha/i.test(corpoDeTodos));
  await semToast(pagina);
  await pagina.close();
}

// ------------------------------------------------------------------------ banco
let prisma = null;
let conta = null;

async function contagens() {
  if (!conta || !conta.id) return null;
  return {
    user: await prisma.user.count({ where: { id: conta.id } }),
    company: conta.companyId ? await prisma.company.count({ where: { id: conta.companyId } }) : 0,
    companyUser: await prisma.companyUser.count({ where: { userId: conta.id } }),
    membershipDaCasa: conta.companyId ? await prisma.companyUser.count({ where: { companyId: conta.companyId } }) : 0,
    sessoes: await prisma.refreshToken.count({ where: { userId: conta.id } }),
    tokensDeVerificacao: await prisma.emailVerificationToken.count({ where: { userId: conta.id } }),
    codigosDeRecuperacao: await prisma.recoveryCode.count({ where: { userId: conta.id } }),
    auditoria: await prisma.auditLog.count({ where: { userId: conta.id } }),
    tentativasDeLogin: await prisma.loginAttempt.count({ where: { email: conta.email } }),
  };
}

async function limpeza() {
  if (!conta || !conta.id) return;
  const antes = await contagens();
  console.log("  [banco] antes da limpeza: " + JSON.stringify(antes));
  try {
    await prisma.recoveryCode.deleteMany({ where: { userId: conta.id } });
    await prisma.emailVerificationToken.deleteMany({ where: { userId: conta.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: conta.id } });
    await prisma.loginAttempt.deleteMany({ where: { email: conta.email } });
    await prisma.auditLog.deleteMany({ where: { userId: conta.id } });
    await prisma.companyUser.deleteMany({ where: { userId: conta.id } });
    if (conta.companyId) {
      await prisma.auditLog.deleteMany({ where: { companyId: conta.companyId } });
      await prisma.companyUser.deleteMany({ where: { companyId: conta.companyId } });
    }
    await prisma.user.delete({ where: { id: conta.id } });
    if (conta.companyId) await prisma.company.delete({ where: { id: conta.companyId } });
  } catch (e) {
    console.log("  [banco] a limpeza falhou: " + String(e.message).split("\n")[0]);
  }
  const depois = await contagens();
  console.log("  [banco] depois da limpeza: " + JSON.stringify(depois));
  const sobrou = Object.values(depois || {}).some((n) => n > 0);
  ok("a conta de prova não deixou nenhuma linha no banco", !sobrou);
}

// ----------------------------------------------------------------------- roteiro
(async () => {
  // D6: nada desta prova toca o banco de desenvolvimento.
  await conferirServidorDeProva();
  prisma = clienteDoBancoDeProva();

  // A conta nasce pelo fluxo público de cadastro — o mesmo que uma pessoa usa.
  const senha = "Prova" + crypto.randomBytes(5).toString("hex").toUpperCase() + "#A";
  const email = "prova-verificacao-" + Date.now().toString(36) + "@exemplo.test";
  const cadastro = await chame("POST", "/auth/register", { name: "Prova Verificacao", email, password: senha });
  if (cadastro.status !== 201) {
    throw new Error("[prova] o cadastro de prova falhou (HTTP " + cadastro.status + "): " + cadastro.texto.slice(0, 160));
  }
  conta = {
    id: cadastro.dados.user.id,
    email,
    senha,
    companyId: cadastro.dados.user.companyId || null,
  };
  console.log("  [banco] conta fictícia desta corrida: " + email + " (empresa " + (conta.companyId || "-") + ")");
  ok("a conta nasce sem caixa postal confirmada", !(await prisma.user.findUnique({ where: { id: conta.id }, select: { emailVerifiedAt: true } })).emailVerifiedAt);

  // O token é criado aqui e escrito no banco já no formato que a API guarda (HMAC);
  // o valor em claro vive só nesta memória e na URL do navegador local.
  const tokenValido = crypto.randomBytes(24).toString("hex");
  await prisma.emailVerificationToken.create({
    data: { userId: conta.id, tokenHash: hashToken(tokenValido), expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000) },
  });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    userDataDir: fs.mkdtempSync(path.join(require("node:os").tmpdir(), "nexus-verificacao-2fa-")),
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    await provaVerificacao(browser, conta, tokenValido);
    await provaSegundoFator(browser, conta);
  } finally {
    await browser.close().catch(() => undefined);
    await limpeza();
    await prisma.$disconnect().catch(() => undefined);
  }

  console.log("");
  console.log(checks + " verificacoes, " + falhas.length + " falhas");
  console.log(falhas.length === 0 ? "ok: verificação de e-mail e segundo fator provados no navegador" : "FALHOU");
  if (falhas.length > 0) process.exitCode = 1;
})().catch((e) => {
  console.error("falha:", e.message);
  process.exit(1);
});
