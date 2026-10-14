// F5, item 4: o teste de fumaca do produto.
//
// O que ele faz de diferente das provas de modulo (tools/verify-*.cjs) e que ele
// nao conhece o conteo de cada tela: ele atravessa o produto inteiro pelo navegador,
// do jeito que a pessoa atravessa, e so confere uma coisa — se em algum momento
// apareceu erro no console, excecao solta na pagina, requisicao que o servidor
// devolveu em 5xx ou barra de rolagem horizontal onde nao deveria haver.
//
// Roda com a conta ficticia de captura (tools/conta-de-captura.cjs) e so contra o
// banco de prova: conferirServidorDeProva() para a corrida se a API de 3001 estiver
// atendendo outro banco. As tres telas privativas da plataforma (editor do CMS,
// rotinas e a trilha da plataforma) nao aparecem no menu da conta ficticia, entao
// elas tem uma passada extra com o administrador da plataforma, na janela larga.
//
// A varredura de itens do menu e lida da propria barra lateral, e nao de uma lista
// copiada aqui: se o menu ganhar uma linha, a fumaca passa a andar ate ela.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { contaDeCaptura } = require("./conta-de-captura.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const BASE = "http://localhost:5173";

const JANELAS = [
  { rotulo: "360", width: 360, height: 640 },
  { rotulo: "1024", width: 1024, height: 768 },
  { rotulo: "1440", width: 1440, height: 900 },
];

// NEXUS_FUMACA_JANELAS=1024 roda uma janela so. Serve para conferir a fumaca de
// uma largura especifica sem atravessar o produto inteiro tres vezes.
const PEDIDO = (process.env.NEXUS_FUMACA_JANELAS || "")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);
const JANELAS_DA_CORRIDA = PEDIDO.length
  ? JANELAS.filter((j) => PEDIDO.includes(j.rotulo))
  : JANELAS;

// As paginas de erro, na ordem em que o contrato das capturas as conhece. O 404 e
// uma rota que nao existe: e assim que se chega na pagina, e nao por um endereco
// falso inventado aqui.
const ERROS = [
  { caminho: "/401", espera: "401" },
  { caminho: "/403", espera: "403" },
  { caminho: "/rota-que-nao-existe-na-casa", espera: "404" },
  { caminho: "/500", espera: "500" },
];

// O que cada pagina tem de mostrar para nao ser tela branca: qualquer texto.
const ESPERA_RENDER = 900;

function novoRegistro(pagina) {
  const estado = { console: [], excecoes: [], http5xx: [], falhasDeRequest: [] };
  pagina.on("console", (msg) => {
    if (msg.type() === "error") estado.console.push(msg.text().slice(0, 300));
  });
  pagina.on("pageerror", (err) => estado.excecoes.push(String(err.message).slice(0, 300)));
  pagina.on("response", (res) => {
    if (res.status() >= 500) estado.http5xx.push(res.status() + " " + res.url().replace(BASE, ""));
  });
  pagina.on("requestfailed", (req) => {
    const url = req.url();
    // Um favicon que o navegador pede sozinho nao e requisicao do produto.
    if (url.endsWith("/favicon.ico")) return;
    estado.falhasDeRequest.push(String(req.failure()?.errorText || "falha") + " " + url.replace(BASE, ""));
  });
  return estado;
}

async function medirPagina(pagina) {
  return pagina.evaluate(() => {
    const raiz = document.documentElement;
    const corpo = document.body;
    const estouro = Math.max(
      raiz.scrollWidth - raiz.clientWidth,
      corpo.scrollWidth - corpo.clientWidth,
      0,
    );
    return {
      texto: (corpo.innerText || "").trim().length,
      nos: raiz.querySelectorAll("*").length,
      estouro,
      endereco: location.pathname,
      titulo: (document.querySelector(".error-code") || {}).textContent || "",
    };
  });
}

async function abrir(pagina, caminho, estado) {
  await pagina.goto(BASE + caminho, { waitUntil: "networkidle0", timeout: 45000 });
  await new Promise((r) => setTimeout(r, ESPERA_RENDER));
  const medida = await medirPagina(pagina);
  const problemas = [].concat(
    estado.console.map((t) => "console.error: " + t),
    estado.excecoes.map((t) => "excecao: " + t),
    estado.http5xx.map((t) => "resposta 5xx: " + t),
    estado.falhasDeRequest.map((t) => "requisicao sem resposta: " + t),
  );
  if (medida.estouro > 1) problemas.push("estouro horizontal de " + medida.estouro + "px");
  if (medida.texto === 0) problemas.push("pagina sem nenhum texto (tela branca)");
  return { medida, problemas };
}

// Entra pela tela de login, de verdade, e devolve os caminhos que a barra lateral
// oferece para aquela conta, na ordem em que aparecem.
async function entrarEColherOMenu(pagina, conta) {
  const { email, senha } =
    conta === "captura" ? contaDeCaptura() : { email: EMAIL_ADMIN, senha: SENHA_ADMIN };
  await pagina.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await pagina.waitForSelector("input[type=email]", { timeout: 20000 });
  await pagina.waitForSelector("input[type=password]", { timeout: 20000 });
  await pagina.type("input[type=email]", email, { delay: 3 });
  await pagina.type("input[type=password]", senha, { delay: 3 });
  await Promise.all([
    pagina.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 25000 }),
    pagina.click("button[type=submit]"),
  ]);
  await new Promise((r) => setTimeout(r, ESPERA_RENDER));
  return pagina.evaluate(() => {
    const vistos = new Set();
    const caminhos = [];
    for (const a of document.querySelectorAll(".admin-nav a[href]")) {
      const caminho = a.getAttribute("href");
      if (!caminho || !caminho.startsWith("/app") || vistos.has(caminho)) continue;
      vistos.add(caminho);
      caminhos.push(caminho);
    }
    return caminhos;
  });
}

(async () => {
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  let paginas = 0;
  const ruins = [];

  for (const janela of JANELAS_DA_CORRIDA) {
    // Uma pagina por janela: o tamanho do navegador e o que define se a tela
    // arrasta na horizontal, e cada uma comeca limpa, sem resto da anterior.
    const pagina = await browser.newPage();
    await pagina.setViewport({ width: janela.width, height: janela.height });

    const passos = [];

    // 1) vitrine e login, sem sessao nenhuma.
    {
      const estado = novoRegistro(pagina);
      const r = await abrir(pagina, "/", estado);
      passos.push({ o: "vitrine", caminho: "/", ...r });
    }
    {
      const estado = novoRegistro(pagina);
      const r = await abrir(pagina, "/login", estado);
      passos.push({ o: "login", caminho: "/login", ...r });
    }

    // 2) o menu inteiro da conta ficticia, com a sessao aberta pela tela.
    const menuEstado = novoRegistro(pagina);
    let caminhos;
    try {
      caminhos = await entrarEColherOMenu(pagina, "captura");
      for (const c of caminhos) {
        const estado = novoRegistro(pagina);
        const r = await abrir(pagina, c, estado);
        passos.push({ o: "menu", caminho: c, ...r });
      }
    } catch (e) {
      passos.push({
        medida: { texto: 0, estouro: 0, endereco: "/login" },
        problemas: ["a conta ficticia nao conseguiu abrir a sessao: " + e.message],
      });
    }
    if (menuEstado.console.length || menuEstado.excecoes.length) {
      passos.push({
        medida: { texto: 1, estouro: 0, endereco: "/login (entrada)" },
        problemas: menuEstado.console.concat(menuEstado.excecoes).map((t) => "na entrada: " + t),
      });
    }

    // 3) as quatro paginas de erro.
    for (const erro of ERROS) {
      const estado = novoRegistro(pagina);
      const r = await abrir(pagina, erro.caminho, estado);
      if (r.medida.titulo !== erro.espera) {
        r.problemas.push("a pagina mostrou o codigo '" + (r.medida.titulo || "-") + "' em vez de " + erro.espera);
      }
      passos.push({ o: "erro", caminho: erro.caminho, ...r });
    }

    await pagina.close();

    // 4) na janela larga, as tres telas que so o administrador da plataforma ve.
    if (janela.rotulo === "1440") {
      const paginaAdmin = await browser.newPage();
      await paginaAdmin.setViewport({ width: janela.width, height: janela.height });
      try {
        const extras = await entrarEColherOMenu(paginaAdmin, "administrador");
        const conhecidos = new Set(caminhos || []);
        for (const c of extras.filter((x) => !conhecidos.has(x))) {
          const estado = novoRegistro(paginaAdmin);
          const r = await abrir(paginaAdmin, c, estado);
          passos.push({ o: "menu da plataforma", caminho: c, ...r });
        }
      } catch (e) {
        passos.push({
          medida: { texto: 0, estouro: 0, endereco: "/login (plataforma)" },
          problemas: ["o administrador da plataforma nao abriu sessao: " + e.message],
        });
      }
      await paginaAdmin.close();
    }

    for (const passo of passos) {
      paginas++;
      const marca = passo.problemas.length ? "RUIM " : "ok   ";
      console.log(
        marca +
          janela.rotulo.padStart(4) +
          "  " +
          String(passo.o || "").padEnd(20) +
          " " +
          passo.medida.endereco.padEnd(34) +
          (passo.problemas.length ? " :: " + passo.problemas.join(" | ") : ""),
      );
      if (passo.problemas.length) ruins.push({ janela: janela.rotulo, ...passo });
    }
    console.log("");
  }

  await browser.close();

  console.log("paginas atravessadas: " + paginas);
  console.log("com problema: " + ruins.length);
  if (ruins.length) {
    console.log("");
    console.log("===== O QUE A FUMACA PEGOU =====");
    for (const r of ruins) {
      console.log(r.janela + " " + (r.o || "") + " " + r.medida.endereco);
      for (const p of r.problemas) console.log("   - " + p);
    }
  }
  const janelas = JANELAS_DA_CORRIDA.map((j) => j.rotulo).join(", ");
  console.log(
    ruins.length === 0
      ? "ok: o produto atravessou " + janelas + " px sem erro"
      : "ha pagina com erro",
  );
  if (ruins.length) process.exitCode = 1;
})().catch((e) => {
  console.error("falha:", e.message);
  process.exit(1);
});
