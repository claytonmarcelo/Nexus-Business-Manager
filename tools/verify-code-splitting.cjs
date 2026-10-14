// D8 (F5, item 6) e F5, item 3: o produto aberto em pedaços, provado no navegador.
//
// Esta prova roda contra o resultado de `npm run build --workspace @nexus/web`
// (apps/web/dist) e nunca contra o servidor de desenvolvimento: no dev cada modulo
// e uma requisicao propria e nenhum numero de pacote vale nada. Ela sobe um
// servidor estatico caseiro numa porta local, que serve o dist e encaminha /api
// para a API de prova (3001) — por isso comeca com conferirServidorDeProva(), a
// mesma guarda das outras provas. Ela nao escreve em banco nenhum: nada aqui cria
// conta, nada aqui mexe em linha.
//
// Tres coisas sao medidas:
//   1. o que o navegador baixa, rota por rota, depois do code splitting, e o
//      confronto com o pacote unico que existia antes (o numero esta na const ANTES,
//      medido com o mesmo instrumento na arvore imediatamente anterior a mudanca);
//   2. que o pedaco de uma pagina que a pessoa nao visitou nao desce junto com a
//      tela dela — a Agenda, de longe o maior pedaco da casa, e a referencia;
//   3. que o teto de erro (F5, item 3) vale tambem para um pedaco que nao chega:
//      seguramos e depois derrubamos a requisicao do chunk de uma rota e conferimos
//      que a pessoa cai na pagina de erro da casa, com o episodio anotado em
//      sessionStorage["nexus.erro"] — nunca no fundo branco.
//
// Derrubando a propria rede, esta prova ve o navegador reclamar (console.error de
// "Failed to fetch dynamically imported module" e requestfailed). Nao e o produto
// quebrando: e o ferimento que ela inflige de proposito, e por isso ela conta a
// reclamação em vez de fingir que nao aconteceu. O teste de fumaca (F5, item 4) e
// quem garante que, no caminho normal, nenhuma dessas reclamacoes aparece.
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const puppeteer = require("puppeteer-core");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DIST = path.join(__dirname, "..", "apps", "web", "dist");
const ASSETS = path.join(DIST, "assets");
const PORTA = Number(process.env.NEXUS_PORTA_DO_DIST || 4173);
const BASE = "http://127.0.0.1:" + PORTA;
const RAIZ_DA_API = process.env.NEXUS_API || "http://localhost:3001";

// Medido com `npm run build --workspace @nexus/web` na arvore de trabalho de
// 2026-10-14, com todas as paginas importadas no topo do App.tsx: um unico arquivo
// de JavaScript de 964,31 kB (283,61 kB comprimidos), que todo visitante baixava
// inteiro antes de ver a primeira tela — inclusive quem so queria o login.
const ANTES = { rotulo: "um pacote unico", jsBruto: 964_310, jsGzip: 283_610 };

// Rotas que a prova atravessa sem sessao nenhuma. Cada uma tem o nome do chunk que
// a pagina carrega — os nomes saem do proprio dist, nada copiado a mao.
const ROTAS = [
  { caminho: "/", quem: "vitrine", pagina: "Landing" },
  { caminho: "/login", quem: "entrada", pagina: "Login" },
  { caminho: "/cadastro", quem: "cadastro", pagina: "Register" },
  { caminho: "/recuperar-senha", quem: "recuperacao", pagina: "ForgotPassword" },
  { caminho: "/verificar-e-mail", quem: "link de confirmacao", pagina: "VerificarEmail" },
  { caminho: "/legal/privacidade", quem: "texto legal", pagina: "Legal" },
];

// As paginas do painel. Nenhuma delas deve descer em rota publica: se o menu
// ganhar uma pagina nova e ela ficar de fora daqui, a prova nao percebe — mas o
// contrario (uma pagina publica puxar a Agenda) ela pega na hora.
const PAGINAS_DO_PAINEL = [
  "Dashboard", "Users", "Clients", "Products", "Sales", "OrdensDeServico", "Cobrancas",
  "Purchases", "Finance", "CRM", "Agenda", "Audit", "Settings", "Cms", "Notifications",
  "Rotinas", "PlataformaAuditoria",
];

let verificacoes = 0;
let falhas = 0;
function ok(rotulo, condicao, detalhe) {
  verificacoes++;
  if (condicao) {
    console.log("  [ok] " + rotulo + (detalhe === undefined || detalhe === "" ? "" : " (" + detalhe + ")"));
    return true;
  }
  falhas++;
  console.log("  [FALHA] " + rotulo + (detalhe === undefined || detalhe === "" ? "" : " (" + detalhe + ")"));
  return false;
}
function medida(rotulo, detalhe) {
  console.log("  [medida] " + rotulo + (detalhe === undefined ? "" : ": " + detalhe));
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
function kB(n) {
  return (n / 1000).toFixed(2).replace(".", ",") + " kB";
}

// ---------------------------------------------------------------- o servidor

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sirvaArquivo(url, res) {
  const pedido = url.pathname === "/" ? "/index.html" : url.pathname;
  const candidato = path.join(DIST, pedido);
  const dentro = candidato === DIST || candidato.startsWith(DIST + path.sep);
  const alvo =
    dentro && fs.existsSync(candidato) && fs.statSync(candidato).isFile()
      ? candidato
      : path.join(DIST, "index.html");
  const corpo = fs.readFileSync(alvo);
  res.writeHead(200, {
    "content-type": TIPOS[path.extname(alvo).toLowerCase()] || "application/octet-stream",
    "content-length": corpo.length,
    "cache-control": "no-store",
  });
  res.end(corpo);
}

function encaminhe(req, res, url) {
  const cabecalhos = { ...req.headers, host: RAIZ_DA_API.replace(/^http:\/\//, "") };
  const p = http.request(
    RAIZ_DA_API + url.pathname + url.search,
    { method: req.method, headers: cabecalhos },
    (r) => {
      res.writeHead(r.statusCode || 502, r.headers);
      r.pipe(res);
    },
  );
  p.on("error", () => {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end('{"ok":false,"message":"api de prova fora do ar"}');
  });
  req.pipe(p);
}

function subaServidor() {
  return new Promise((resolve, reject) => {
    const servidor = http.createServer((req, res) => {
      const url = new URL(req.url, BASE);
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        encaminhe(req, res, url);
        return;
      }
      sirvaArquivo(url, res);
    });
    servidor.on("error", reject);
    servidor.listen(PORTA, "127.0.0.1", () => resolve(servidor));
  });
}

// ------------------------------------------------------------------- o dist

function chunkDaEntrada() {
  const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  const achado = html.match(/\/assets\/(index-[^"']+\.js)/);
  if (!achado) throw new Error("[dist] o index.html nao aponta nenhum pacote de entrada");
  return achado[1];
}

function arquivosJs() {
  return fs.readdirSync(ASSETS).filter((a) => a.endsWith(".js"));
}

function chunkDe(pagina) {
  const alvo = arquivosJs().find((a) => a.startsWith(pagina + "-"));
  if (!alvo) throw new Error("[dist] nao existe chunk para a pagina " + pagina + " — rode o build");
  return alvo;
}

function pesoDe(nome) {
  const corpo = fs.readFileSync(path.join(ASSETS, nome));
  return { bruto: corpo.length, gzip: zlib.gzipSync(corpo).length };
}

// O fonte mais novo do app: se ele for mais recente que o dist, a prova estaria
// medindo uma publicacao velha, e numero velho nao prova nada.
function fonteMaisNovo() {
  const raiz = path.join(__dirname, "..", "apps", "web", "src");
  let maisNovo = 0;
  let nome = "";
  const pilha = [raiz];
  while (pilha.length) {
    const pasta = pilha.pop();
    for (const entrada of fs.readdirSync(pasta, { withFileTypes: true })) {
      const completo = path.join(pasta, entrada.name);
      if (entrada.isDirectory()) {
        pilha.push(completo);
        continue;
      }
      if (!/\.(ts|tsx|css)$/.test(entrada.name)) continue;
      const m = fs.statSync(completo).mtimeMs;
      if (m > maisNovo) {
        maisNovo = m;
        nome = completo;
      }
    }
  }
  return { maisNovo, nome };
}

// ------------------------------------------------------- o navegador que mede

function abraPagina(browser, { segurar = null, derrubar = null, segurarMs = 1600 } = {}) {
  return browser.newPage().then(async (pagina) => {
    await pagina.setViewport({ width: 1440, height: 900 });
    const descidos = [];
    const reclamacoes = [];
    pagina.on("response", (res) => {
      const url = res.url();
      if (!url.includes("/assets/") || !url.endsWith(".js")) return;
      descidos.push({
        nome: url.split("/assets/")[1],
        bytes: Number(res.headers()["content-length"] || 0),
        status: res.status(),
      });
    });
    pagina.on("requestfailed", (req) => {
      const url = req.url();
      if (url.includes("/assets/")) reclamacoes.push(url.split("/assets/")[1]);
    });
    if (segurar || derrubar) {
      await pagina.setRequestInterception(true);
      pagina.on("request", (req) => {
        const url = req.url();
        if (derrubar && url.includes(derrubar)) {
          req.abort("failed").catch(() => undefined);
          return;
        }
        if (segurar && url.includes(segurar)) {
          setTimeout(() => req.continue().catch(() => undefined), segurarMs);
          return;
        }
        req.continue().catch(() => undefined);
      });
    }
    return { pagina, descidos, reclamacoes };
  });
}

function some(descidos) {
  return descidos.reduce((t, d) => t + d.bytes, 0);
}
function liste(descidos) {
  return descidos.map((d) => d.nome.replace(".js", "") + " " + kB(d.bytes)).join(" + ");
}

async function atravesse(browser) {
  const entrada = chunkDaEntrada();
  const registros = [];

  console.log("== 1) o que cada tela baixa, rota por rota ==");
  ok("o dist medido e mais novo que o codigo-fonte", (() => {
    const f = fonteMaisNovo();
    const d = fs.statSync(path.join(DIST, "index.html")).mtimeMs;
    return d >= f.maisNovo;
  })(), "se falhar, rode `npm run build --workspace @nexus/web` antes");

  for (const rota of ROTAS) {
    const { pagina, descidos } = await abraPagina(browser);
    await pagina.goto(BASE + rota.caminho, { waitUntil: "networkidle0", timeout: 45000 });
    await espera(500);
    const texto = await pagina.evaluate(() => (document.body.innerText || "").trim().length);
    await pagina.close();

    registros.push({ ...rota, descidos, texto });

    const proprio = chunkDe(rota.pagina);
    const baixouProprio = descidos.some((d) => d.nome === proprio);
    const baixouEntrada = descidos.some((d) => d.nome === entrada);
    const puxouDoPainel = PAGINAS_DO_PAINEL.filter((p) => {
      const alvo = arquivosJs().find((a) => a.startsWith(p + "-"));
      return alvo && descidos.some((d) => d.nome === alvo);
    });
    const total = some(descidos);

    ok(rota.quem + " montou texto na tela", texto > 40, texto + " caracteres");
    ok(rota.quem + " desce com o pacote de entrada", baixouEntrada, entrada);
    ok(rota.quem + " desce com o proprio pedaco", baixouProprio, proprio);
    ok(rota.quem + " nao puxa nenhuma pagina do painel", puxouDoPainel.length === 0, puxouDoPainel.join(", "));
    medida(rota.quem + " (" + rota.caminho + ")", liste(descidos));
    medida(rota.quem + ": JavaScript descido", kB(total) + " de " + ANTES.rotulo + " " + kB(ANTES.jsBruto));
  }

  const entradaPeso = pesoDe(entrada);
  ok(
    "o pacote de entrada caiu abaixo da metade do pacote unico",
    entradaPeso.bruto < ANTES.jsBruto / 2,
    kB(entradaPeso.bruto) + " contra " + kB(ANTES.jsBruto) + " (" +
      Math.round((entradaPeso.bruto / ANTES.jsBruto) * 100) + "%)",
  );
  ok(
    "comprimido, o pacote de entrada caiu abaixo da metade",
    entradaPeso.gzip < ANTES.jsGzip / 2,
    kB(entradaPeso.gzip) + " contra " + kB(ANTES.jsGzip),
  );

  const piorRoleta = registros.reduce((a, b) => (some(b.descidos) > some(a.descidos) ? b : a));
  ok(
    "nem a tela que mais baixa chega perto do pacote unico",
    some(piorRoleta.descidos) < ANTES.jsBruto * 0.6,
    piorRoleta.quem + " baixa " + kB(some(piorRoleta.descidos)),
  );

  const agenda = chunkDe("Agenda");
  const agendaPeso = pesoDe(agenda);
  const desceuAgenda = registros.filter((r) => r.descidos.some((d) => d.nome === agenda));
  ok("a Agenda existe como pedaco separado", Boolean(agenda), agenda);
  ok(
    "nenhuma rota publica baixou a Agenda",
    desceuAgenda.length === 0,
    desceuAgenda.map((r) => r.quem).join(", ") || "nenhuma",
  );
  medida("o maior pedaco do painel (Agenda)", kB(agendaPeso.bruto) + " / " + kB(agendaPeso.gzip) + " comprimido");

  const todosJs = arquivosJs();
  const brutoDaCasa = todosJs.reduce((t, a) => t + fs.statSync(path.join(ASSETS, a)).size, 0);
  medida("pedacos de JavaScript no dist", todosJs.length + " arquivos");
  medida("tudo junto, se a pessoa visitasse todas as paginas", kB(brutoDaCasa));
  ok(
    "a casa inteira continua na estante: o que mudou e o que se baixa primeiro",
    brutoDaCasa > ANTES.jsBruto,
    "+" + kB(brutoDaCasa - ANTES.jsBruto) + " de custo do corte",
  );

  return registros;
}

// ------------------------------------------------- o teto sobre a rede quebrada

async function pedacoQueNaoChega(browser) {
  console.log("== 2) o limite de erro vestindo um pedaco que nao chega ==");
  const entrada = chunkDaEntrada();

  for (const rota of [{ caminho: "/login", pagina: "Login", quem: "entrada" }]) {
    const alvo = chunkDe(rota.pagina);
    const { pagina, descidos, reclamacoes } = await abraPagina(browser, { derrubar: alvo });
    await pagina.goto(BASE + rota.caminho, { waitUntil: "load", timeout: 45000 }).catch(() => undefined);
    let titulo = "";
    let codigo = "";
    try {
      await pagina.waitForSelector(".error-title", { timeout: 15000 });
      titulo = await pagina.$eval(".error-title", (e) => e.textContent.trim());
      codigo = await pagina.$eval(".error-code", (e) => e.textContent.trim());
    } catch {
      titulo = await pagina.evaluate(() => (document.body.innerText || "").trim().slice(0, 60));
    }
    const texto = await pagina.evaluate(() => (document.body.innerText || "").trim().length);
    const temFormulario = (await pagina.$("input[type=email]")) !== null;
    const caderno = await pagina.evaluate(() => sessionStorage.getItem("nexus.erro"));
    await pagina.close();

    const registros = (() => {
      try {
        return JSON.parse(caderno || "[]");
      } catch {
        return [];
      }
    })();
    const ultimo = registros[0] || {};

    ok("pedaco caido: o navegador realmente nao deixou o " + alvo + " descer",
      reclamacoes.some((n) => n === alvo), reclamacoes.join(", "));
    ok("pedaco caido: o pacote de entrada desceu normalmente",
      descidos.some((d) => d.nome === entrada), entrada);
    ok("pedaco caido: a pessoa cai na pagina de erro da casa",
      titulo === "Algo quebrou nesta tela", titulo);
    ok("pedaco caido: a pagina vest o codigo 500", codigo === "500", codigo);
    ok("pedaco caido: nao e fundo branco", texto > 80, texto + " caracteres");
    ok("pedaco caido: a tela quebrada nao ficou meio montada", !temFormulario, String(temFormulario));
    ok("pedaco caido: o episodio foi anotado no caderno do navegador",
      registros.length >= 1 && ultimo.escopo === "aplicacao",
      ultimo.escopo + " / " + String(ultimo.mensagem || "").slice(0, 60));
    ok("pedaco caido: a anotacao aponta o pedaco que faltou",
      String(ultimo.mensagem || "").includes(alvo.replace(".js", "")), String(ultimo.mensagem || "").slice(0, 80));
    ok("pedaco caido: a anotacao nao carrega credencial nenhuma",
      !/token=|password=|senha=/i.test(JSON.stringify(registros)), "nenhuma");
  }

  // A pagina de 500 da casa e importada no topo de proposito: ela nao pode depender
  // de um pedaco que justamente nao chegou.
  const alvo = chunkDe("Login");
  const { pagina } = await abraPagina(browser, { derrubar: alvo });
  await pagina.goto(BASE + "/500", { waitUntil: "networkidle0", timeout: 45000 }).catch(() => undefined);
  const tituloErro = await pagina.$eval(".error-title", (e) => e.textContent.trim()).catch(() => "");
  const codigoErro = await pagina.$eval(".error-code", (e) => e.textContent.trim()).catch(() => "");
  await pagina.close();
  ok("a pagina de erro da casa nao depende de pedaco nenhum",
    tituloErro === "Erro interno" && codigoErro === "500", tituloErro + " / " + codigoErro);

  // E o contrario do ferimento: segurando o pedaco, quem aparece e o carregamento
  // da casa, e a tela se monta sozinha quando o pedaco chega — sem recarregar.
  const { pagina: segura, descidos: descidosSegurados } = await abraPagina(browser, { segurar: alvo });
  const navegando = segura.goto(BASE + "/login", { waitUntil: "load", timeout: 60000 });
  await espera(500);
  const carregando = await segura.evaluate(() => {
    const el = document.querySelector('[role="status"]');
    return el ? { texto: (el.textContent || "").trim(), ocupado: el.getAttribute("aria-busy") } : null;
  });
  await navegando.catch(() => undefined);
  await segura.waitForSelector("input[type=email]", { timeout: 25000 }).catch(() => undefined);
  const montou = (await segura.$("input[type=email]")) !== null;
  await segura.close();
  ok("com o pedaco segurado, a tela mostra o carregamento da casa",
    Boolean(carregando) && /Abrindo a p/.test(carregando.texto) && carregando.ocupado === "true",
    carregando ? carregando.texto.slice(0, 40) + " / aria-busy=" + carregando.ocupado : "nada na tela");
  ok("liberado o pedaco, a mesma aba monta a tela sem recarregar", montou, String(montou));
  ok("a tela entrou depois de ficar de pé no carregamento",
    descidosSegurados.some((d) => d.nome === alvo), alvo);
}

// ------------------------------------------------------------------------- casa

async function main() {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    console.error("[dist] apps/web/dist nao existe — rode `npm run build --workspace @nexus/web` antes desta prova");
    process.exit(1);
  }
  await conferirServidorDeProva(RAIZ_DA_API + "/api");

  let servidor;
  let browser;
  try {
    servidor = await subaServidor();
    medida("servidor estatico", BASE + " servindo " + DIST + ", com /api encaminhado para " + RAIZ_DA_API);
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: "new",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "nexus-split-")),
    });
    await atravesse(browser);
    await pedacoQueNaoChega(browser);
  } catch (erro) {
    console.error("  [FALHA] a corrida quebrou: " + (erro && erro.message ? erro.message : erro));
    falhas++;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (servidor) servidor.close();
  }

  console.log("");
  console.log(verificacoes + " verificacoes, " + falhas + " falhas");
  if (falhas) {
    console.log("falhou: code splitting e teto de erro sobre a rede quebrada");
    process.exit(1);
  }
  console.log("ok: code splitting medido e teto de erro provado no navegador");
}

main();
