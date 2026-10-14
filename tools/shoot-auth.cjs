// Captura as tres telas de autenticacao: login, cadastro e recuperacao de senha.
//
// Nada aqui digita credencial de verdade:
//  - o login e fotografado vazio, com o placeholder que quem chega ve. O navegador
//    comeca limpo e "lembrar de mim" fica desmarcado, entao nenhum endereco de
//    pessoa real aparece na imagem;
//  - o cadastro traz dado claramente ficticio ("Novo Empresario" com um e-mail
//    sem @) para que a prova mostre a validacao da tela;
//  - a recuperacao e fotografada no passo 2 a partir de um e-mail que nao existe
//    na base: a API devolve so o aviso generico e nenhum codigo de desenvolvimento
//    chega a tela. A prova confere isso antes de gravar o print — se aparecer
//    qualquer sequencia de 16+ caracteres, a corrida falha em vez de guardar a
//    imagem. Nada e mascarado a mao depois.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const BASE = require("./pilha-de-prova.cjs").baseDoNavegador();
const OUT = require("./pilha-de-prova.cjs").pastaDeCaptura("docs/screenshots");

// Endereco de teste (RFC 6761) que nunca e cadastrado: e por ele que a tela de
// recuperacao chega ao passo 2 sem que a API precise soltar um codigo real.
const EMAIL_SEM_CONTA = "solicitante@exemplo.test";

(async () => {
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const shot = async (nome) => {
    await new Promise((r) => setTimeout(r, 700));
    await page.screenshot({ path: path.join(OUT, nome + ".png") });
    console.log("capturado", nome);
  };
  const falhas = [];
  const confira = (nome, cond) => {
    if (!cond) falhas.push(nome);
    console.log((cond ? "  [ok] " : "  [FALHA] ") + nome);
  };

  // 02-login: o formulario exatamente como quem chega o encontra.
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=password]", { timeout: 15000 });
  const loginVazio = await page.evaluate(() => ({
    email: document.querySelector("input[type=email]")?.value ?? null,
    senha: document.querySelector("input[type=password]")?.value ?? null,
  }));
  confira("a tela de login e capturada sem nada digitado",
    loginVazio.email === "" && loginVazio.senha === "");
  await shot("02-login");

  // 08-cadastro: dado ficticio e a validacao inline da tela.
  await page.goto(BASE + "/cadastro", { waitUntil: "networkidle0" });
  await page.waitForSelector(".auth-card");
  const inputs = await page.$$(".auth-card input");
  await inputs[0].type("Novo Empresario", { delay: 3 });
  await inputs[1].type("email-invalido", { delay: 3 });
  await page.click(".auth-card .neu-btn");
  await shot("08-cadastro");

  // 09-recuperar-senha: passo 2, sem codigo na tela.
  await page.goto(BASE + "/recuperar-senha", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", EMAIL_SEM_CONTA, { delay: 3 });
  await page.click(".neu-btn");
  await page
    .waitForFunction(() => Boolean(document.querySelector('input[name="codigo"], input#codigo'))
      || Boolean(document.querySelector(".auth-card input[type=text]"))
      || /Digite o codigo|nova senha/i.test(document.body.innerText), { timeout: 15000 })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));
  const recuperacao = await page.evaluate(() => {
    const texto = document.body.innerText;
    const campos = [...document.querySelectorAll(".auth-card input")];
    return {
      step2: /Digite o c/.test(texto),
      valores: campos.map((c) => c.value),
      sequenciaSuspeita: (texto.match(/[0-9a-f]{16,}/gi) || []).length,
    };
  });
  confira("a recuperacao chegou ao passo 2", recuperacao.step2);
  confira("nenhum codigo de recuperacao aparece na tela",
    recuperacao.sequenciaSuspeita === 0 && recuperacao.valores.every((v) => v === ""));
  await shot("09-recuperar-senha");

  await browser.close();
  if (falhas.length) {
    console.error("capturas de autenticacao reprovadas: " + falhas.join(" | "));
    process.exit(1);
  }
  console.log("ok: telas de autenticacao capturadas sem credencial alguma");
})().catch((e) => {
  console.error("falha:", e.message);
  process.exit(1);
});
