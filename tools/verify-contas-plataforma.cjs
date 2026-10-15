// Prova do navegador para a T5.5 (N61): a porta administrativa de confirmação de e-mail.
//
// O achado dizia: com a decisão D2 cobrando verificação de e-mail em produção, uma
// entrega que falha no meio do cadastro deixa a pessoa sem link, sem confirmação e sem
// painel — e quem atende não tem botão, porque a única escrita em
// `users.email_verified_at` era o clique na mensagem. A saída documentada era escrever
// no banco à mão. Esta prova confere que o botão existe, na área da plataforma, e que
// ele faz exatamente o que a API promete:
//
//   1. a fila mostra quem espera, e a contagem dela é a contagem do banco;
//   2. o cadeado é o papel da plataforma — o ADMIN de uma empresa toma 403 nas duas
//      portas e o anônimo toma 401, sem que nada seja escrito;
//   3. na tela o motivo escrito é condição: sem frase nenhuma POST de escrita sai;
//   4. confirmar escreve a coluna, mata o link que ainda estava vivo e nasce na trilha
//      da plataforma com `companyId` nulo e o endereço mascarado — o JSON da auditoria
//      não contém o inteiro;
//   5. confirmar de novo não escreve nem audita duas vezes;
//   6. a conta que espera aparece na tela, some da tela depois da escrita, e o evento
//      é lido na Auditoria da plataforma com rótulo em português.
//
// D6/N65: esta prova só fala com a pilha de prova (API 3002, Vite 5174) e com o banco
// nexusbusinessmanager_teste, pela conta fictícia de `tools/prova-admin.local.json`. O
// banco de desenvolvimento não é tocado, e nada do que ela escreve fica: as contagens
// antes e depois são impressas no `finally`. A captura cai em `docs/screenshots-prova/`
// (pasta ignorada): a fila é feita de endereços de conta, e ela não é entregável.
const puppeteer = require("puppeteer-core");
const { clienteDoBancoDeProva, conferirServidorDeProva, contaDeProva } = require("./banco-de-prova.cjs");
const PILHA = require("./pilha-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = PILHA.baseDoNavegador();
const API = PILHA.raizDaApi() + "/api";
const FILA = "/plataforma/contas/sem-confirmacao";
const SENHA_DE_PROVA = "ProvaDaPorta2026#";
const MOTIVO = "cliente sem acesso ao e-mail; identidade conferida no chamado de prova";

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
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', email, { delay: 8 });
  await page.type('input[type="password"]', senha, { delay: 8 });
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 30000 }),
    page.click("button[type=submit]"),
  ]);
  await semToast(page);
}

async function vaPara(page, caminho) {
  await Promise.all([
    page.waitForFunction((c) => window.location.pathname === c, { timeout: 20000 }, caminho),
    page.evaluate((c) => {
      const link = [...document.querySelectorAll(".admin-nav-item")].find(
        (a) => a.getAttribute("href") === c,
      );
      if (link) link.click();
      else window.location.assign(c);
    }, caminho),
  ]);
  await semToast(page);
}

async function espereTexto(page, trecho, timeout = 20000) {
  const viu = await page
    .waitForFunction((t) => document.body.innerText.includes(t), { timeout }, trecho)
    .then(() => true)
    .catch(() => false);
  ok('a tela mostra "' + trecho.slice(0, 40) + '..."', viu);
  return viu;
}

function escrevaNoCampo(page, seletor, valor, textarea) {
  return page.evaluate(
    (sel, v, ehTextArea) => {
      const campo = document.querySelector(sel);
      if (!campo) return "sem campo";
      const proto = ehTextArea ? window.HTMLTextAreaElement : window.HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(campo, v);
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      return "escreveu";
    },
    seletor,
    valor,
    textarea,
  );
}

// ------------------------------------------------------------------------ banco
(async () => {
  const conta = contaDeProva();
  const login = await chame("POST", "/auth/login", { email: conta.email, password: conta.senha }, false);
  if (login.status !== 200) {
    console.error(
      "login da conta de prova falhou: " + login.status +
        " — suba a pilha com `npm run dev:prova` e prepare o banco com `npm run db:prova`.",
    );
    process.exit(1);
  }
  token = login.dados.accessToken;
  const empresa = (await chame("GET", "/companies/current")).dados;
  console.log('API: sessao obtida · casa "' + empresa.name + '"');

  // D6/N65: a conferência é medida — o id que a API devolveu no login precisa existir
  // em nexusbusinessmanager_teste. Se o servidor estiver no banco de desenvolvimento,
  // a prova para aqui, antes de escrever em qualquer lugar.
  await conferirServidorDeProva(undefined, conta);

  const prisma = clienteDoBancoDeProva();
  const inicioDaProva = new Date();
  const sufixo = Date.now();
  const criadas = [];
  let linkVivo = null;

  try {
    const pendentesAntes = await prisma.user.count({ where: { emailVerifiedAt: null } });
    console.log("\n[banco] contagem antes: " + pendentesAntes + " conta(s) sem confirmação");

    // ---- 1. quem espera: contas criadas por fora, sem confirmar ----
    console.log("\n-- a fila --");
    const bcrypt = require("bcryptjs");
    const hash = await bcrypt.hash(SENHA_DE_PROVA, 12);
    const criada = await prisma.user.create({
      data: {
        email: "prova.porta." + sufixo + "@nexus.prova",
        name: "Prova Da Porta",
        passwordHash: hash,
        emailVerifiedAt: null,
      },
    });
    criadas.push(criada.id);
    await prisma.companyUser.create({ data: { userId: criada.id, companyId: empresa.id, role: "STAFF" } });
    // Um link vivo, do jeito que a verificação de cadastro escreve: hash e validade.
    linkVivo = await prisma.emailVerificationToken.create({
      data: {
        userId: criada.id,
        tokenHash: "prova-" + sufixo + "-" + Math.random().toString(36).slice(2),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const pendentesNaFila = await prisma.user.count({ where: { emailVerifiedAt: null } });
    ok("a conta criada pela prova está pendente no banco", pendentesNaFila === pendentesAntes + 1,
      pendentesAntes + " -> " + pendentesNaFila);

    const lista = await chame("GET", FILA + "?pageSize=100");
    ok("a fila responde 200 para o administrador da plataforma", lista.status === 200, lista.status);
    ok("a contagem da fila é a contagem do banco",
      lista.dados.meta && lista.dados.meta.total === pendentesNaFila,
      (lista.dados.meta && lista.dados.meta.total) + " na API · " + pendentesNaFila + " no banco");
    // A página 1 é a mais antiga (`orderBy: createdAt asc`): numa fila de centenas,
    // a conta criada agora só aparece quando se busca por ela — e buscar pelo
    // endereço é justamente o caminho de quem atende um chamado.
    const achadaPeloEndereco = await chame("GET", FILA + "?search=" + encodeURIComponent(criada.email));
    ok("a conta criada agora está na fila, e a busca pelo endereço a acha",
      achadaPeloEndereco.status === 200 &&
        achadaPeloEndereco.dados.data.length === 1 &&
        achadaPeloEndereco.dados.data[0].userId === criada.id,
      (achadaPeloEndereco.dados.data || []).length + " linha(s)");
    ok("a resposta não carrega empresa dona",
      lista.dados.data.every((l) => !("companyId" in l) && !("companyName" in l)));
    ok("cada linha diz quantas casas a conta serve",
      lista.dados.data.every((l) => typeof l.empresas === "number"));

    const filtrada = await chame("GET", FILA + "?search=" + encodeURIComponent("Prova Da Porta"));
    ok("a busca acha a conta pelo nome",
      filtrada.status === 200 && filtrada.dados.data.length === 1 &&
        filtrada.dados.data[0].userId === criada.id,
      (filtrada.dados.data || []).length + " linha(s)");

    // ---- 2. o cadeado ----
    console.log("\n-- quem não pode abrir a porta --");
    const adminDaCasa = await prisma.user.create({
      data: {
        email: "prova.porta.admin." + sufixo + "@nexus.prova",
        name: "Prova Admin De Casa",
        passwordHash: hash,
        emailVerifiedAt: new Date(),
      },
    });
    criadas.push(adminDaCasa.id);
    await prisma.companyUser.create({ data: { userId: adminDaCasa.id, companyId: empresa.id, role: "ADMIN" } });
    const loginAdmin = await chame("POST", "/auth/login",
      { email: adminDaCasa.email, password: SENHA_DE_PROVA }, false);
    ok("o ADMIN de empresa entrou na mesma casa", loginAdmin.status === 200, loginAdmin.status);
    const cabecalhoAdmin = { "Content-Type": "application/json", Authorization: "Bearer " + loginAdmin.dados.accessToken };
    const leuFila = await fetch(API + FILA, { headers: cabecalhoAdmin });
    ok("a fila é recusada para o ADMIN de empresa (403)", leuFila.status === 403, leuFila.status);
    const tentouConfirmar = await fetch(API + "/plataforma/contas/" + criada.id + "/confirmar-email", {
      method: "POST",
      headers: cabecalhoAdmin,
      body: JSON.stringify({ motivo: "tentativa medida pela prova" }),
    });
    ok("escrever é recusado para o ADMIN de empresa (403)",
      tentouConfirmar.status === 403, tentouConfirmar.status);
    ok("e a recusa não escreveu nada",
      (await prisma.user.count({ where: { id: criada.id, emailVerifiedAt: null } })) === 1);
    const semSessao = await fetch(API + FILA);
    ok("sem token é 401, não lista vazia", semSessao.status === 401, semSessao.status);

    // ---- 3. a tela ----
    console.log("\n-- /app/plataforma-contas --");
    const browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: "new",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const pagina = await browser.newPage();
      await pagina.setViewport({ width: 1440, height: 900 });
      const erros = [];
      pagina.on("pageerror", (e) => erros.push(String(e)));
      pagina.on("console", (m) => {
        if (m.type() === "error" && !ruidoDeRede(m.text())) erros.push("console: " + m.text());
      });

      await entrarNoPainel(pagina, conta.email, conta.senha);
      ok("o menu lateral chama \"Contas sem confirmação\"", await pagina.evaluate(() =>
        [...document.querySelectorAll(".admin-nav-item")].some((a) =>
          a.textContent.includes("Contas sem confirmação"))));

      await vaPara(pagina, "/app/plataforma-contas");
      await pagina.waitForSelector('input[type="search"]', { timeout: 20000 });
      const titulo = await pagina.evaluate(() => document.querySelector(".page-title")?.textContent.trim());
      ok("a tela abre com o título igual ao do menu", titulo === "Contas sem confirmação", titulo);
      const painel = await pagina.evaluate(() =>
        document.body.innerText.includes("não prova que a pessoa leu a mensagem"));
      ok("o painel diz que confirmar por aqui não simula a entrega", painel);
      const cabecalhos = await pagina.evaluate(() =>
        [...document.querySelectorAll("thead th")].map((t) => t.textContent.trim()));
      ok("a tabela tem conta, casas, situação e espera",
        ["Conta", "Empresas", "Situação", "Desde", "Ações"].every((c) => cabecalhos.includes(c)),
        cabecalhos.join(" · "));

      await escrevaNoCampo(pagina, 'input[type="search"]', "Prova Da Porta", false);
      await pagina.evaluate(() => document.querySelector('form.toolbar button[type="submit"]').click());
      await espera(1500);
      const linha = await pagina.evaluate((nome) => {
        const tr = [...document.querySelectorAll("tbody tr")].find((r) => r.innerText.includes(nome));
        return tr ? [...tr.querySelectorAll("td")].map((c) => c.innerText.trim()) : null;
      }, "Prova Da Porta");
      ok("a conta de prova aparece na tabela com o endereço",
        Boolean(linha) && String(linha[0]).includes("prova.porta." + sufixo), linha && linha[0]);
      ok("e diz que a conta serve uma casa", Boolean(linha) && linha[1] === "1 empresa", linha && linha[1]);
      const identificadorVazou = await pagina.evaluate(() =>
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(
          [...document.querySelectorAll("tbody tr")].map((r) => r.innerText).join(" ")));
      ok("nenhum identificador interno é impresso na tabela", identificadorVazou === false);

      // ---- 4. o motivo é condição ----
      console.log("\n-- confirmar com motivo escrito --");
      await pagina.evaluate(() => {
        const botao = [...document.querySelectorAll("tbody button")].find((b) =>
          b.getAttribute("aria-label") === "Confirmar e-mail de Prova Da Porta");
        if (botao) botao.click();
      });
      await pagina.waitForSelector(".nx-confirm-motivo", { timeout: 20000 });
      ok("o diálogo pede o motivo antes de qualquer escrita", true);
      await pagina.evaluate(() => {
        const alvo = [...document.querySelectorAll(".nx-modal-foot button")].find((b) =>
          b.textContent.trim() === "Confirmar");
        if (alvo) alvo.click();
      });
      await espera(800);
      ok("sem frase o diálogo avisa em vez de gravar", await pagina.evaluate(() =>
        document.body.innerText.includes("Diga o motivo da confirmação.")));
      ok("e nenhuma requisição de escrita foi feita", await pagina.evaluate(() =>
        performance.getEntriesByType("resource").every((r) => !r.name.includes("/confirmar-email"))));

      const escreveu = await escrevaNoCampo(pagina, ".nx-confirm-motivo textarea", MOTIVO, true);
      ok("o motivo foi escrito no campo", escreveu === "escreveu", escreveu);
      await pagina.evaluate(() => {
        const alvo = [...document.querySelectorAll(".nx-modal-foot button")].find((b) =>
          b.textContent.trim() === "Confirmar");
        if (alvo) alvo.click();
      });
      await pagina.waitForFunction(() => !document.querySelector(".nx-modal-overlay"), { timeout: 20000 });
      await semToast(pagina);
      ok("a escrita chegou à API", await pagina.evaluate(() =>
        performance.getEntriesByType("resource").some((r) => r.name.includes("/confirmar-email"))));

      const sumiuFiltrado = await pagina.evaluate(() => document.querySelectorAll("tbody tr").length);
      ok("a linha saiu da fila na tela", sumiuFiltrado === 0, sumiuFiltrado + " linha(s)");
      ok("e a barra diz que não há mais nenhuma pendente neste recorte", await pagina.evaluate(() =>
        document.querySelector(".toolbar-note")?.textContent.trim() === "0 contas"), await pagina.evaluate(() =>
        document.querySelector(".toolbar-note")?.textContent.trim()));
      await pagina.evaluate(() => {
        const limpar = [...document.querySelectorAll("button")].find((b) =>
          b.textContent.trim() === "Limpar filtros");
        if (limpar) limpar.click();
      });
      await espera(1200);
      const nota = await pagina.evaluate(() => document.querySelector(".toolbar-note")?.textContent.trim());
      ok("o total volta a bater com o banco, menos a conta confirmada",
        nota === (pendentesNaFila - 1) + " contas", nota + " · esperado " + (pendentesNaFila - 1) + " contas");

      // ---- 5. o que ficou no banco ----
      console.log("\n-- o que a escrita fez no banco --");
      const confirmada = await prisma.user.findUnique({
        where: { id: criada.id },
        select: { emailVerifiedAt: true },
      });
      ok("a coluna de confirmação foi escrita", confirmada.emailVerifiedAt instanceof Date);
      const linkDepois = await prisma.emailVerificationToken.findUnique({
        where: { id: linkVivo.id },
        select: { usedAt: true },
      });
      ok("o link que ainda estava vivo perdeu o efeito", linkDepois.usedAt instanceof Date);

      const trilha = await prisma.auditLog.findMany({
        where: { action: "admin.email_confirmado", createdAt: { gte: inicioDaProva } },
        orderBy: { createdAt: "desc" },
      });
      ok("a trilha tem exatamente um evento desta prova", trilha.length === 1, trilha.length + " linha(s)");
      const evento = trilha[0] || {};
      const metadata = typeof evento.metadata === "string"
        ? evento.metadata
        : JSON.stringify(evento.metadata || {});
      ok("o evento nasce sem empresa dona (companyId nulo)", evento.companyId === null, String(evento.companyId));
      ok("o endereço aparece mascarado na auditoria", metadata.includes("***"), "mascara aplicada");
      ok("nenhum endereço inteiro é gravado na auditoria",
        metadata.includes("prova.porta." + sufixo + "@") === false);
      ok("o motivo escrito antes do clique está na auditoria",
        metadata.includes("chamado de prova"));

      const trilhaDoTenant = await chame("GET", "/audit?pageSize=100");
      ok("o evento não aparece na trilha da empresa", trilhaDoTenant.status === 200 &&
        (trilhaDoTenant.dados.data || []).every((l) => l.action !== "admin.email_confirmado"),
        trilhaDoTenant.status);

      await vaPara(pagina, "/app/auditoria-plataforma");
      await espereTexto(pagina, "E-mail confirmado pelo administrador da plataforma");

      // ---- 6. confirmar de novo ----
      console.log("\n-- confirmar de novo --");
      const segunda = await chame("POST", "/plataforma/contas/" + criada.id + "/confirmar-email",
        { motivo: "segunda chamada da prova" });
      ok("a rota responde dizendo que nada mudou",
        segunda.status === 200 && segunda.dados.alterado === false, JSON.stringify(segunda.dados));
      ok("a segunda chamada não criou segunda auditoria",
        (await prisma.auditLog.count({
          where: { action: "admin.email_confirmado", createdAt: { gte: inicioDaProva } },
        })) === trilha.length);
      const naoExiste = await chame("POST", "/plataforma/contas/conta-que-nao-existe/confirmar-email",
        { motivo: "prova do 404" });
      ok("uma conta que não existe é um 404 honesto",
        naoExiste.status === 404 && String(naoExiste.dados.message).includes("Conta não encontrada"),
        naoExiste.status + " " + String(naoExiste.dados.message));

      const captura = PILHA.pastaDeCaptura("docs/screenshots");
      await vaPara(pagina, "/app/plataforma-contas");
      await pagina.waitForSelector('input[type="search"]', { timeout: 20000 }).catch(() => {});
      await pagina.screenshot({ path: captura + "/porta-administrativa-de-email-prova.png" }).catch(() => {});
      console.log("  [captura] " + captura + "/porta-administrativa-de-email-prova.png (pasta de prova, fora do repositório)");

      ok("nenhum erro de console ou de página durante a prova", erros.length === 0, erros.slice(0, 2).join(" | "));
    } finally {
      await browser.close().catch(() => {});
    }
  } finally {
    // Devolve o banco exatamente como encontrou: as contas da prova, os eventos e o
    // link. A cadeia de e-mail da conta tem `onDelete: Cascade`.
    await prisma.auditLog.deleteMany({ where: { entityId: { in: criadas } } });
    await prisma.auditLog.deleteMany({
      where: { action: "admin.email_confirmado", createdAt: { gte: inicioDaProva } },
    });
    if (criadas.length) await prisma.user.deleteMany({ where: { id: { in: criadas } } });
    const pendentesDepois = await prisma.user.count({ where: { emailVerifiedAt: null } });
    const eventosDepois = await prisma.auditLog.count({
      where: { action: "admin.email_confirmado", createdAt: { gte: inicioDaProva } },
    });
    console.log(
      "\n[banco] contagem depois: " + pendentesDepois + " conta(s) sem confirmação, " +
        eventosDepois + " evento(s) desta janela · " + criadas.length + " conta(s) de prova apagadas",
    );
    await prisma.$disconnect();
  }

  console.log("\n" + checks + " verificações, " + falhas.length + " falha(s)");
  if (falhas.length) {
    falhas.forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
  console.log("PROVA OK: a porta administrativa de confirmação de e-mail funciona no navegador");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
