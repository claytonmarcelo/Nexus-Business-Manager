// Prova do modal compartilhado: anatomia, textos padrao, Esc, guarda de
// descarte, foco inicial, trava de scroll e empilhamento de modais.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const path = require("path");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");
const BASE = "http://localhost:5173";
const OUT = path.join(__dirname, "..", "docs", "screenshots");
const falhas = [];
const checks = [];
function ok(nome, valor) {
  checks.push((valor ? "OK   " : "FALHA") + " " + nome + " -> " + String(valor));
  if (!valor) falhas.push(nome);
}

(async () => {
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("nexus.remember.email"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", EMAIL_ADMIN, { delay: 3 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 3 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });

  await page.goto(BASE + "/app/clientes", { waitUntil: "networkidle0" });
  await page.waitForSelector(".page-head");

  const abrirCliente = async () => {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".page-head .btn-brand")].find((x) => x.textContent === "Novo cliente");
      b.click();
    });
    await page.waitForSelector(".nx-modal", { timeout: 8000 });
    await sleep(350);
  };
  const modalPresente = () => page.evaluate(() => Boolean(document.querySelector(".nx-modal")));

  await abrirCliente();
  await page.screenshot({ path: path.join(OUT, "15-modal-cliente-dark.png") });

  const estrutura = await page.evaluate(() => {
    const m = document.querySelector(".nx-modal");
    const head = m.querySelector(".nx-modal-head");
    const title = m.querySelector(".nx-modal-title");
    const close = m.querySelector(".nx-modal-close");
    const body = m.querySelector(".nx-modal-body");
    const foot = m.querySelector(".nx-modal-foot");
    const btns = [...foot.querySelectorAll("button")].map((b) => b.textContent.trim());
    const style = getComputedStyle(m);
    return {
      temHead: Boolean(head), temBody: Boolean(body), temFoot: Boolean(foot),
      titulo: title.textContent.trim(), rotulo: m.getAttribute("aria-label"),
      labelledby: title.id === m.getAttribute("aria-labelledby"),
      fechar: close.getAttribute("aria-label"),
      botoes: btns.join(" | "),
      fundo: style.backgroundColor, raio: style.borderRadius,
      scrollPreso: getComputedStyle(document.body).overflow,
      focoDentro: m.contains(document.activeElement),
      dica: foot.querySelector(".nx-modal-hint").textContent.trim(),
      obrigatorios: [...m.querySelectorAll(".field-label")].filter((l) => l.textContent.includes("*")).length,
      overlay: getComputedStyle(document.querySelector(".nx-modal-overlay")).backdropFilter,
    };
  });
  ok("titulo do modal = Novo cliente", estrutura.titulo === "Novo cliente");
  ok("aria-labelledby aponta para o titulo", estrutura.labelledby === true);
  ok("botao fechar acessivel", estrutura.fechar === "Fechar janela");
  ok("rodape com Cancelar | Salvar", estrutura.botoes === "Cancelar | Salvar");
  ok("dica de campos obrigatorios", estrutura.dica === "Os campos marcados com * são obrigatórios.");
  ok("campo obrigatorio marcado com *", estrutura.obrigatorios >= 1);
  ok("anatomia head/body/foot", estrutura.temHead && estrutura.temBody && estrutura.temFoot);
  ok("foco inicial dentro do modal", estrutura.focoDentro === true);
  ok("scroll da pagina travado", estrutura.scrollPreso === "hidden");
  ok("overlay com blur", String(estrutura.overlay).includes("blur"));
  ok("raio de 16px (radius-lg)", estrutura.raio === "16px");
  console.log(JSON.stringify(estrutura, null, 2));

  // Esc fecha modal limpo
  await page.keyboard.press("Escape");
  await sleep(300);
  ok("Esc fecha modal sem alteracoes", (await modalPresente()) === false);
  ok("scroll liberado apos fechar", await page.evaluate(() => getComputedStyle(document.body).overflow !== "hidden"));

  // Esc com edicao pendente pede confirmacao de descarte (SweetAlert2, nunca nativo)
  await abrirCliente();
  await page.type(".nx-modal .input", "Prova Modal", { delay: 4 });
  await page.keyboard.press("Escape");
  await page.waitForSelector(".swal2-container", { timeout: 6000 });
  await sleep(300);
  const swal = await page.evaluate(() => {
    const c = document.querySelector(".swal2-popup");
    return {
      titulo: c.querySelector(".swal2-title").textContent.trim(),
      texto: (c.querySelector(".swal2-html-container") || { textContent: "" }).textContent.trim(),
      botoes: [...c.querySelectorAll("button")].map((b) => b.textContent.trim()).join(" | "),
      modalAindaAberto: Boolean(document.querySelector(".nx-modal")),
    };
  });
  console.log(JSON.stringify(swal, null, 2));
  ok("aviso de descarte com titulo coerente", swal.titulo === "Descartar alterações?");
  ok("modal continua aberto ate decidir", swal.modalAindaAberto === true);
  ok("botao de descartar presente", swal.botoes.includes("Descartar"));
  await page.screenshot({ path: path.join(OUT, "15-modal-descarte.png") });

  // Cancelar no aviso mantem a edicao; depois descartar de fato.
  await page.click(".swal2-cancel");
  await sleep(250);
  ok("cancelar preserva o formulario", await page.evaluate(() => {
    const i = document.querySelector(".nx-modal .input");
    return Boolean(i) && i.value === "Prova Modal";
  }));

  // Tema claro: mesmos componentes, tokens trocados
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, "15-modal-cliente-light.png") });
  const claro = await page.evaluate(() => {
    const m = document.querySelector(".nx-modal");
    const cs = getComputedStyle(m);
    return {
      theme: document.documentElement.getAttribute("data-theme"),
      fundo: cs.backgroundColor, cor: cs.color,
      foot: getComputedStyle(m.querySelector(".nx-modal-foot")).backgroundColor,
    };
  });
  console.log("tema claro:", JSON.stringify(claro));
  ok("modal se adapta ao tema claro", claro.theme === "light" && claro.fundo === "rgb(251, 248, 243)");

  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".nx-modal-foot button")].find((x) => x.textContent.trim() === "Cancelar");
    b.click();
  });
  await page.waitForSelector(".swal2-container", { timeout: 5000 });
  await page.click(".swal2-confirm");
  await sleep(400);
  ok("descartar pelo rodape fecha o modal", (await modalPresente()) === false);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));

  // clicando no overlay tambem fecha (sem edicoes)
  await abrirCliente();
  await page.mouse.click(40, 40);
  await sleep(300);
  ok("clique no overlay fecha o modal", (await modalPresente()) === false);

  // Modais empilhados: lista de fornecedores + cadastro por cima
  await page.goto(BASE + "/app/compras", { waitUntil: "networkidle0" });
  await page.waitForSelector(".page-head");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".page-head .btn-ghost")].find((x) => x.textContent === "Fornecedores");
    b.click();
  });
  await page.waitForSelector(".nx-modal", { timeout: 8000 });
  await sleep(400);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".nx-modal button")].find((x) => x.textContent.trim() === "Novo fornecedor");
    b.click();
  });
  await page.waitForFunction(() => document.querySelectorAll(".nx-modal").length === 2, { timeout: 8000 });
  await sleep(400);
  const pilha = await page.evaluate(() => {
    const overlays = [...document.querySelectorAll(".nx-modal-overlay")];
    const titulos = [...document.querySelectorAll(".nx-modal-title")].map((h) => h.textContent.trim());
    const topo = overlays[overlays.length - 1];
    return {
      quantidade: overlays.length,
      titulos: titulos.join(" + "),
      zIndexTopo: getComputedStyle(topo).zIndex,
      rotulos: [...topo.querySelectorAll(".field-label")].map((l) => l.textContent.trim()).join(", "),
      focoNoTopo: topo.contains(document.activeElement),
    };
  });
  console.log(JSON.stringify(pilha, null, 2));
  ok("dois modais abertos", pilha.quantidade === 2);
  ok("modal do topo empilhado acima (z-index 90)", pilha.zIndexTopo === "90");
  ok("rotulos obrigatorios coerentes", pilha.rotulos.startsWith("Nome *"));
  await page.screenshot({ path: path.join(OUT, "15-modal-fornecedores.png") });

  await page.keyboard.press("Escape");
  await sleep(350);
  ok("Esc fecha apenas o modal do topo", await page.evaluate(() => document.querySelectorAll(".nx-modal").length === 1));
  await page.keyboard.press("Escape");
  await sleep(350);
  ok("Esc fecha o segundo modal", (await modalPresente()) === false);
  ok("scroll devolvido apos fechar tudo", await page.evaluate(() => getComputedStyle(document.body).overflow !== "hidden"));

  console.log(String.fromCharCode(10) + checks.join(String.fromCharCode(10)));
  console.log("erros de console:", erros.length ? erros.join(" | ") : "nenhum");
  console.log(falhas.length ? "FALHAS: " + falhas.join(", ") : "TODAS AS CHECAGENS PASSARAM");
  await browser.close();
  process.exit(falhas.length || erros.length ? 1 : 0);
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
