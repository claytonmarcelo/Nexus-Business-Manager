// Prova de navegador da regra de acesso: toda sessão encerrada volta para a
// página de boas-vindas ("/"), e quem chega sem sessão nenhuma continua indo ao
// login. As quatro portas de saída são percorridas pelo caminho de verdade do
// app, sem atalho:
//   1) o botão "Sair" do painel;
//   2) o 401 de uma chamada de negócio sem refresh token em disco — a sessão
//      expira no meio do trabalho, que é quando o aviso de Toastr importa;
//   3) o logout feito em outra aba, que chega a esta aba apenas como evento de
//      storage, sem nenhum pedido nosso;
//   4) /app aberto por quem não tem sessão, que tem o login como destino e não
//      a vitrine.
// Junto disso a prova mede o que a regra não pode tocar: o "voltar" do navegador
// não reabre o painel com sessão morta, o tema escolhido no navegador fica no
// lugar, e nenhum alert() nativo é usado no caminho.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const BASE = require("./pilha-de-prova.cjs").baseDoNavegador();
const EMAIL = EMAIL_ADMIN;
const AVISO = "Sua sessão expirou. Entre novamente para continuar.";

let total = 0;
let falhas = 0;
function ok(cond, msg) {
  total++;
  if (cond) {
    console.log("OK    " + msg);
  } else {
    falhas++;
    console.log("FAIL  " + msg);
  }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// A vitrine é a raiz ".landing"; o painel é a raiz ".admin-shell". São as duas
// marcas que separam os destinos, sem depender de texto que o CMS possa mudar.
const naVitrine = (page) =>
  page
    .waitForFunction(() => location.pathname === "/" && Boolean(document.querySelector(".landing")), {
      timeout: 15000,
    })
    .then(() => true)
    .catch(() => false);

const noPainel = (page) =>
  page
    .waitForFunction(() => Boolean(document.querySelector(".admin-shell")), { timeout: 20000 })
    .then(() => true)
    .catch(() => false);

const rota = (page) => page.evaluate(() => location.pathname);

async function novaAba(browser) {
  const page = await browser.newPage();
  // Toda aba desta prova registra um alerta nativo que apareça. A regra diz que
  // o aviso é de Toastr; se alguém voltar a usar alert(), isto pega.
  await page.evaluateOnNewDocument(() => {
    window.__alertou = false;
    window.alert = () => {
      window.__alertou = true;
    };
    window.confirm = () => {
      window.__alertou = true;
      return true;
    };
  });
  return page;
}

async function entrar(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("nexus.remember.email"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", EMAIL, { delay: 3 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 3 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 25000 });
  return noPainel(page);
}

// Clique no elemento pelo texto, do jeito que a pessoa faz: o botão "Sair" é um
// botão do shell, e a rota é um Link do menu lateral.
function cliqueTexto(page, texto) {
  return page.evaluate((alvo) => {
    const el = [...document.querySelectorAll("button,a")].find((b) => (b.textContent || "").trim().endsWith(alvo));
    if (!el) return false;
    el.click();
    return true;
  }, texto);
}

function cliqueRota(page, caminho) {
  return page.evaluate((href) => {
    const el = document.querySelector('a[href="' + href + '"]');
    if (!el) return false;
    el.click();
    return true;
  }, caminho);
}

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

  // ── 1. logout pelo botão, com o tema do navegador no lugar ────────────────
  const pagina = await novaAba(browser);
  await pagina.goto(BASE + "/", { waitUntil: "networkidle0" });
  await pagina.evaluate(() => localStorage.setItem("nexus.theme", "light"));
  await pagina.reload({ waitUntil: "networkidle0" });
  await espera(900);
  const temaAntes = await pagina.evaluate(() => ({
    salvo: localStorage.getItem("nexus.theme"),
    atributo: document.documentElement.getAttribute("data-theme"),
  }));
  ok(temaAntes.atributo === "light", "a vitrine abre no tema claro deste navegador " + JSON.stringify(temaAntes));

  ok(await entrar(pagina), "o login abre o painel");
  const temaNoPainel = await pagina.evaluate(() => ({
    salvo: localStorage.getItem("nexus.theme"),
    atributo: document.documentElement.getAttribute("data-theme"),
  }));
  ok(
    temaNoPainel.salvo === "light" && temaNoPainel.atributo === "light",
    "entrar no painel não muda a escolha de tema " + JSON.stringify(temaNoPainel),
  );

  // Antes de sair, empurra uma rota de verdade para o histórico do navegador: é
  // ela que o "voltar" vai tentar reabrir adiante, com a sessão já morta.
  ok(await cliqueRota(pagina, "/app/vendas"), "o menu lateral abre a tela de vendas");
  await pagina.waitForFunction(() => location.pathname === "/app/vendas", { timeout: 15000 });

  ok(await cliqueTexto(pagina, "Sair"), "o botão Sair do painel está na tela");
  const voltouVitrine = await naVitrine(pagina);
  const pathDepoisDoSair = await rota(pagina);
  ok(
    voltouVitrine && pathDepoisDoSair === "/",
    "sair pelo botão leva à página de boas-vindas, e não ao login (path=" + pathDepoisDoSair + ")",
  );
  const painelAindaVisivel = await pagina.evaluate(() => Boolean(document.querySelector(".admin-shell")));
  ok(!painelAindaVisivel, "o painel saiu de tela: .admin-shell não existe mais na vitrine");
  const temaDepois = await pagina.evaluate(() => ({
    salvo: localStorage.getItem("nexus.theme"),
    atributo: document.documentElement.getAttribute("data-theme"),
  }));
  ok(
    temaDepois.salvo === "light" && temaDepois.atributo === "light",
    "sair do sistema não apaga a preferência de tema " + JSON.stringify(temaDepois),
  );
  const tokensMortos = await pagina.evaluate(() => localStorage.getItem("nexus.refresh"));
  ok(tokensMortos === null, "o refresh token saiu do disco junto com a sessão");

  await pagina.goBack({ waitUntil: "networkidle0" });
  // O item de histórico é a tela de vendas que a pessoa acabou de deixar. Se o
  // redirect não fosse replace(), ela reabria o painel com sessão morta.
  await espera(1800);
  const naVolta = await pagina.evaluate(() => ({
    path: location.pathname,
    painel: Boolean(document.querySelector(".admin-shell")),
  }));
  ok(
    !naVolta.painel && !naVolta.path.startsWith("/app"),
    'o "voltar" do navegador não reabre o painel com sessão morta (path=' + naVolta.path + ")",
  );
  ok(
    await pagina.evaluate(() => window.__alertou === false),
    "nenhum alert() nativo apareceu no caminho do logout",
  );

  // ── 2. visitante sem sessão ───────────────────────────────────────────────
  const visitante = await novaAba(browser);
  await visitante.goto(BASE + "/app/vendas", { waitUntil: "networkidle0" });
  const foiLogin = await visitante
    .waitForFunction(() => location.pathname === "/login", { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  const pathVisitante = await rota(visitante);
  const vitrineVisitante = await visitante.evaluate(() => Boolean(document.querySelector(".landing")));
  ok(
    foiLogin && pathVisitante === "/login" && !vitrineVisitante,
    "quem abre /app/vendas sem sessão nenhuma vai ao login, não à vitrine (path=" + pathVisitante + ")",
  );

  // ── 3. sessão expirada no meio do trabalho: 401 real, sem refresh em disco ─
  const trabalho = await novaAba(browser);
  await entrar(trabalho);
  await trabalho.evaluate(() => localStorage.removeItem("nexus.refresh"));
  await trabalho.setRequestInterception(true);
  trabalho.on("request", (pedido) => {
    const url = pedido.url();
    if (url.includes("/api/sales")) {
      pedido
        .respond({
          status: 401,
          contentType: "application/json",
          body: '{"error":"UNAUTHORIZED","message":"Sessão expirada"}',
        })
        .catch(() => undefined);
      return;
    }
    pedido.continue().catch(() => undefined);
  });
  ok(await cliqueRota(trabalho, "/app/vendas"), "a tela de vendas abre pelo menu");
  const caiuVitrineExpirada = await naVitrine(trabalho);
  const pathExpirada = await rota(trabalho);
  ok(
    caiuVitrineExpirada && pathExpirada === "/",
    "o 401 sem refresh token em disco encerra a sessão na vitrine (path=" + pathExpirada + ")",
  );
  const avisoVisivel = await trabalho
    .waitForFunction(
      (texto) =>
        [...document.querySelectorAll(".toast-message")].some(
          (t) => (t.textContent || "").includes(texto) && t.offsetParent !== null,
        ),
      { timeout: 8000 },
      AVISO,
    )
    .then(() => true)
    .catch(() => false);
  ok(avisoVisivel, 'a expiração avisa em Toastr: "' + AVISO + '"');
  ok(
    await trabalho.evaluate(() => window.__alertou === false),
    "o aviso de sessão expirada não usa alert() nativo",
  );

  // ── 4. logout feito em outra aba ──────────────────────────────────────────
  const ativa = await novaAba(browser);
  await entrar(ativa);
  const outra = await novaAba(browser);
  await outra.goto(BASE + "/app", { waitUntil: "networkidle0" });
  await noPainel(outra);
  ok(await cliqueTexto(outra, "Sair"), "a segunda aba fecha a sessão");
  const outraCaiu = await naVitrine(outra);
  const ativaCaiu = await naVitrine(ativa);
  ok(outraCaiu, "a aba que saiu chega às boas-vindas (path=" + (await rota(outra)) + ")");
  const pathAtiva = await rota(ativa);
  const painelAtiva = await ativa.evaluate(() => Boolean(document.querySelector(".admin-shell")));
  ok(
    ativaCaiu && pathAtiva === "/" && !painelAtiva,
    "a aba que ficou aberta recebe o evento de storage e volta às boas-vindas (path=" + pathAtiva + ")",
  );
  ok(
    await ativa.evaluate(() => window.__alertou === false),
    "o fim de sessão por outra aba também não usa alert() nativo",
  );

  // ── 5. a porta silenciosa: a renovação recusada pelo servidor ─────────────
  // A pessoa fecha o navegador e volta depois — com o refresh token vencido ou
  // revogado. Havia sessão em curso, então o destino é a vitrine avisando, e não
  // a porta de entrada de quem nunca entrou.
  const voltou = await novaAba(browser);
  await entrar(voltou);
  await voltou.evaluate(() => localStorage.setItem("nexus.refresh", "token-que-a-api-recusa"));
  await voltou.reload({ waitUntil: "networkidle0" });
  const caiuVitrineRenovacao = await naVitrine(voltou);
  const pathRenovacao = await rota(voltou);
  ok(
    caiuVitrineRenovacao && pathRenovacao === "/",
    "a renovação recusada no reload encerra a sessão na vitrine (path=" + pathRenovacao + ")",
  );
  ok(
    await voltou
      .waitForFunction(
        (texto) =>
          [...document.querySelectorAll(".toast-message")].some((t) => (t.textContent || "").includes(texto)),
        { timeout: 8000 },
        AVISO,
      )
      .then(() => true)
      .catch(() => false),
    "a renovação recusada também avisa em Toastr",
  );

  await browser.close();
  console.log("");
  console.log(total + " verificações, " + falhas + " falhas");
  console.log(falhas === 0 ? "ok: toda sessão encerrada volta para as boas-vindas" : "FALHOU");
  if (falhas > 0) process.exitCode = 1;
})().catch((e) => {
  console.error("falha:", e.message);
  process.exit(1);
});
