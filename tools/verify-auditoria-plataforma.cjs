// Prova do navegador para a F2 do PROMPT MESTRE: as duas trilhas de auditoria.
//
// O que se verifica aqui é a tela aberta por uma sessão de verdade, não um
// componente isolado: o menu chama a área da plataforma, a tabela nomeia a empresa
// de origem em vez de esconder um identificador, a Auditoria da empresa explica a
// outra trilha, e quem não responde pela plataforma (i) não vê o item no menu,
// (ii) recebe a tela fechada na URL direta e (iii) toma 403 na API.
//
// A prova escreve no banco de propósito: cria um STAFF de teste na empresa ativa e
// liga/desliga uma rotina pela API para ter evento fresco na trilha. No fim devolve
// tudo — restaura o estado da rotina, apaga os dois eventos que ela criou e apaga o
// usuário de prova. Nenhuma captura desta prova vai para o repositório: a trilha
// mostra nomes de empresa reais do banco de desenvolvimento.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva, clienteDoBancoDeProva } = require("./banco-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.NEXUS_WEB || "http://localhost:5173";
const API = (process.env.NEXUS_API || "http://localhost:3001") + "/api";
const SLUG = "estoque-baixo";

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

let token = "";
async function chame(metodo, caminho, corpo, comToken) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(comToken === false || !token ? {} : { Authorization: "Bearer " + token }),
    },
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

async function semToast(page) {
  await page
    .waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 })
    .catch(() => {});
  await espera(250);
}

const ruidoDeRede = (t) =>
  /Failed to load resource: the server responded with a status of 4\d\d/.test(t);

async function entrarNoPainel(page, email, senha) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", email);
  await page.type("input[type=password]", senha);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await semToast(page);
}

async function vaPara(page, caminho) {
  await Promise.all([
    page.waitForFunction((c) => window.location.pathname === c, { timeout: 15000 }, caminho),
    page.evaluate((c) => {
      // O clique é no link do menu, com o mesmo href que a pessoa vê no rodapé do
      // navegador. Sem link (área fechada), o endereço direto é o caminho do teste.
      const link = [...document.querySelectorAll(".admin-nav-item")].find((a) => a.getAttribute("href") === c);
      if (link) link.click();
      else window.location.assign(c);
    }, caminho),
  ]);
  await semToast(page);
}

// A página precisa ter chegado de verdade antes da próxima leitura: um clique no
// menu troca de tela dentro da aplicação, mas um endereço digitado reboota o
// painel, e o reboot passa por um corpo quase vazio.
async function espereTexto(page, trecho, timeout = 15000) {
  const viu = await page
    .waitForFunction((t) => document.body.innerText.includes(t), { timeout }, trecho)
    .then(() => true)
    .catch(() => false);
  ok("a tela mostra \"" + trecho.slice(0, 42) + "...\"", viu);
  return viu;
}

function leLinhas() {
  return [...document.querySelectorAll("tbody tr")].map((r) =>
    [...r.querySelectorAll("td")].map((c) => c.innerText.trim()));
}

// ------------------------------------------------------------------------ banco
let prisma = null;
async function abrirBanco() {
  // D6 (tarefa T1): o .env de desenvolvimento fica fora desta prova. O cliente vem de
  // banco-de-prova.cjs, que so aceita DATABASE_URL_TESTE apontando para o banco de prova.
  prisma = clienteDoBancoDeProva();
}

async function criarStaff(companyId) {
  const bcrypt = require("bcryptjs");
  const email = "prova-auditoria-" + Date.now() + "@nexus.prova";
  const senha = "ProvaAuditoria2026#";
  const user = await prisma.user.create({
    data: { email, name: "Prova Auditoria", passwordHash: await bcrypt.hash(senha, 12) },
  });
  await prisma.companyUser.create({ data: { userId: user.id, companyId, role: "STAFF" } });
  console.log("  [banco] STAFF de prova criado na empresa ativa");
  return { id: user.id, email, senha };
}

(async () => {
  const login = await chame("POST", "/auth/login", { email: EMAIL_ADMIN, password: SENHA_ADMIN }, false);
  if (login.status !== 200) {
    console.error("login falhou: " + login.status + " " + login.texto);
    process.exit(1);
  }
  token = login.dados.accessToken;
  const empresa = (await chame("GET", "/companies/current")).dados;
  console.log("API: sessao obtida · empresa \"" + empresa.name + "\"");

  await abrirBanco();
  const jobAntes = await prisma.cronJob.findUnique({
    where: { slug: SLUG },
    select: { enabled: true },
  });
  const inicioDaProva = new Date();
  const staff = await criarStaff(empresa.id);

  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // ---- 1. evento fresco na trilha, escrito pela API como qualquer cliente ----
    console.log("\n-- escrita de plataforma --");
    const pausa = await chame("PATCH", "/ops/jobs/" + SLUG, { habilitada: false });
    const volta = await chame("PATCH", "/ops/jobs/" + SLUG, { habilitada: jobAntes ? jobAntes.enabled : true });
    ok("a rotina foi pausada e devolvida pelo estado anterior",
      pausa.status === 200 && volta.status === 200, pausa.status + "/" + volta.status);

    const trilhaApi = await chame("GET", "/audit/plataforma?entity=cron_job&pageSize=50");
    ok("a trilha da plataforma responde 200 para o administrador", trilhaApi.status === 200, trilhaApi.status);
    // Só as escritas desta janela: a rotina já tem trilha histórica de outras provas.
    const meus = trilhaApi.dados.data.filter(
      (l) => l.entityId === SLUG && new Date(l.createdAt) >= inicioDaProva,
    );
    ok("as duas escritas desta prova estão na trilha", meus.length >= 2, meus.length + " linhas");
    ok("nenhuma linha devolve companyId",
      trilhaApi.dados.data.every((l) => !("companyId" in l)));
    ok("a origem da sessão é a empresa ativa do administrador",
      meus.every((l) => l.origemSessao === empresa.name),
      String(meus[0] && meus[0].origemSessao));

    // ---- 2. a tela ----
    console.log("\n-- /app/auditoria-plataforma --");
    const pagina = await browser.newPage();
    await pagina.setViewport({ width: 1440, height: 900 });
    const erros = [];
    pagina.on("pageerror", (e) => erros.push(String(e)));
    pagina.on("console", (m) => {
      if (m.type() === "error" && !ruidoDeRede(m.text())) erros.push("console: " + m.text());
    });

    await entrarNoPainel(pagina, EMAIL_ADMIN, SENHA_ADMIN);
    const temLink = await pagina.evaluate(() =>
      [...document.querySelectorAll(".admin-nav-item")].some((a) => a.textContent.includes("Auditoria da plataforma")));
    ok("o menu lateral chama \"Auditoria da plataforma\"", temLink);

    await vaPara(pagina, "/app/auditoria-plataforma");
    await pagina.waitForSelector("tbody tr", { timeout: 15000 });
    const titulo = await pagina.evaluate(() => document.querySelector(".page-title")?.textContent.trim());
    ok("a tela abre com o título certo", titulo === "Auditoria da plataforma", titulo);
    const cabecalhos = await pagina.evaluate(() =>
      [...document.querySelectorAll("thead th")].map((t) => t.textContent.trim()));
    ok("a coluna diz \"Origem da sessão\", e não \"Empresa\"",
      cabecalhos.includes("Origem da sessão"), cabecalhos.join(" · "));
    const painel = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-panel-title")].some((h) => h.textContent.includes("O que esta trilha não mostra")) === false &&
      [...document.querySelectorAll(".nx-panel-sub")].some((p) => p.textContent.includes("Nada aqui pertence a uma empresa")));
    ok("o painel explica que nada aqui pertence a uma empresa", painel);

    const linhas = await pagina.evaluate(leLinhas);
    ok("a tabela tem linhas", linhas.length > 0, linhas.length + " linhas");
    ok("cada linha mostra a origem com nome de empresa",
      linhas.every((l) => (l[3] || "").length > 0 && !/^[0-9a-f-]{30,}$/i.test(l[3])),
      String(linhas[0] && linhas[0][3]));
    ok("as ações aparecem em português, sem o código cru na frente",
      linhas.every((l) => !/^(cms|cron):/.test(l[0] || "")),
      String(linhas[0] && linhas[0][0]));
    const maisFresca = await pagina.evaluate(() => {
      const tr = document.querySelector("tbody tr");
      return tr ? tr.innerText : "";
    });
    ok("a linha mais recente é a escrita desta prova",
      maisFresca.includes("Rotina agendada alterada") && maisFresca.includes(empresa.name),
      maisFresca.split("\n")[0]);

    const filtro = await pagina.evaluate(() => {
      const sel = document.querySelector("select");
      if (!sel) return "sem seletor";
      const opcao = [...sel.options].find((o) => o.value === "cron_job");
      if (!opcao) return "sem opcao";
      sel.value = opcao.value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return opcao.textContent.trim();
    });
    ok("o seletor de origem conhece a rotina agendada", filtro === "Rotina agendada", filtro);
    await espera(1200);
    const depoisDoFiltro = await pagina.evaluate(leLinhas);
    ok("o filtro deixa só linhas de rotina", depoisDoFiltro.length > 0 &&
      depoisDoFiltro.every((l) => l[1] === "Rotina agendada"), depoisDoFiltro.length + " linhas");

    // ---- 3. a Auditoria da empresa explica a outra trilha ----
    console.log("\n-- /app/auditoria (empresa) --");
    await vaPara(pagina, "/app/auditoria");
    await espereTexto(pagina, "O que esta trilha não mostra");
    const aviso = await pagina.evaluate(() =>
      document.body.innerText.includes("trilha própria, reservada ao administrador da plataforma"));
    ok("o aviso permanente aparece na Auditoria da empresa", aviso);
    const atalho = await pagina.evaluate(() =>
      [...document.querySelectorAll("a")].some((a) => a.textContent.includes("Abrir a trilha da plataforma")));
    ok("quem tem o papel da plataforma recebe o atalho", atalho);
    const vazou = await pagina.evaluate(() => document.body.innerText.includes("Rotina agendada alterada"));
    ok("a ação da plataforma não aparece na trilha da empresa", vazou === false);

    // ---- 4. quem não responde pela plataforma ----
    console.log("\n-- sessao sem o papel da plataforma --");
    const staffLogin = await chame("POST", "/auth/login", { email: staff.email, password: staff.senha }, false);
    ok("o STAFF de prova entrou na mesma empresa", staffLogin.status === 200, staffLogin.status);
    const staffTrilha = await fetch(API + "/audit/plataforma", {
      headers: { Authorization: "Bearer " + staffLogin.dados.accessToken },
    });
    ok("a API recusa a trilha da plataforma para o STAFF (403)", staffTrilha.status === 403, staffTrilha.status);

    const paginaStaff = await browser.newPage();
    await paginaStaff.setViewport({ width: 1440, height: 900 });
    await entrarNoPainel(paginaStaff, staff.email, staff.senha);
    const menuDoStaff = await paginaStaff.evaluate(() =>
      [...document.querySelectorAll(".admin-nav-item")].some((a) => a.textContent.includes("Auditoria da plataforma")));
    ok("o item não aparece no menu de quem não é da plataforma", menuDoStaff === false);

    await paginaStaff.goto(BASE + "/app/auditoria-plataforma", { waitUntil: "networkidle0" });
    await semToast(paginaStaff);
    const fechada = await paginaStaff.evaluate(() =>
      document.body.innerText.includes("Área reservada da plataforma"));
    const semTabela = await paginaStaff.evaluate(() => document.querySelectorAll("tbody tr").length === 0);
    ok("na URL direta a tela diz que é área reservada", fechada);
    ok("e não chega a listar nada", semTabela);
    const chamou = await paginaStaff.evaluate(() => performance.getEntriesByType("resource")
      .some((r) => r.name.includes("/audit/plataforma")));
    ok("sem o papel, nenhuma chamada sai do navegador para a trilha", chamou === false);

    await vaPara(paginaStaff, "/app/auditoria");
    await espereTexto(paginaStaff, "O que esta trilha não mostra");
    const avisoSemAtalho = await paginaStaff.evaluate(() => ({
      aviso: document.body.innerText.includes("trilha própria, reservada ao administrador da plataforma"),
      atalho: [...document.querySelectorAll("a")].some((a) => a.textContent.includes("Abrir a trilha da plataforma")),
    }));
    ok("o aviso aparece para o STAFF também", avisoSemAtalho.aviso);
    ok("mas o atalho não", avisoSemAtalho.atalho === false);

    ok("nenhum erro de console ou de página durante a prova", erros.length === 0, erros.slice(0, 2).join(" | "));
  } finally {
    await browser.close().catch(() => {});
    // Devolve o banco: estado da rotina, os eventos desta janela e o usuário de prova.
    if (prisma && jobAntes) {
      await prisma.cronJob.update({ where: { slug: SLUG }, data: { enabled: jobAntes.enabled } });
    }
    if (prisma) {
      const deletados = await prisma.auditLog.deleteMany({
        where: { entity: "cron_job", entityId: SLUG, createdAt: { gte: inicioDaProva } },
      });
      await prisma.companyUser.deleteMany({ where: { userId: staff.id } });
      await prisma.auditLog.deleteMany({ where: { userId: staff.id } });
      await prisma.user.deleteMany({ where: { id: staff.id } });
      console.log("\n  [banco] rotina restaurada, " + deletados.count + " evento(s) da prova removidos, STAFF apagado");
      await prisma.$disconnect();
    }
  }

  console.log("\n" + checks + " verificações, " + falhas.length + " falha(s)");
  if (falhas.length) {
    falhas.forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
  console.log("PROVA OK: as duas trilhas de auditoria funcionam no navegador");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
