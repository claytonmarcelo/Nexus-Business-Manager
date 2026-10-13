// Prova de uso real do modulo Agenda: cria compromisso simples e recorrente pelo
// modal, confere o calendario em mes/semana/lista, muda estado, filtra, edita,
// exclui e fecha no celular. Nenhuma caixa de dialogo nativa e usada.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const path = require("path");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const BASE = "http://localhost:5173";
const OUT = path.join(__dirname, "..", "docs", "screenshots");
const sufixo = Date.now().toString().slice(-6);
const SIMPLES = "Degustacao " + sufixo;
const SERIE = "Manutencao " + sufixo;
const AGORA = new Date();
const ANO = AGORA.getFullYear();
const MES = AGORA.getMonth() + 1;
const dois = (n) => String(n).padStart(2, "0");
const diaMes = (n) => ANO + "-" + dois(MES) + "-" + dois(n);
const DIA_SIMPLES = 15;
const DIA_SERIE = 3;

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// As notificacoes cobrem o cabecalho na foto: espera sumirem.
async function semToast(page) {
  await page.waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 }).catch(() => {});
  await sleep(250);
}

// React so percebe mudanca de value feita pelo setter nativo do campo.
async function setReactValue(page, seletor, valor) {
  await page.evaluate((sel, v) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error("campo nao encontrado: " + sel);
    const proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype
      : el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, seletor, valor);
}

const texto = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => null);

async function toast(page, esperado) {
  return page.waitForFunction((t) => {
    const n = document.querySelector(".toast-message");
    return Boolean(n) && n.textContent.includes(t);
  }, { timeout: 8000 }, esperado).then(() => true).catch(() => false);
}

// SweetAlert2 deixa um botao oculto no DOM: só clica o que esta visivel.
async function confirmarSwal(page, esperado) {
  const viu = await page.waitForFunction((t) => {
    const caixa = document.querySelector(".swal2-popup");
    const botao = document.querySelector(".swal2-confirm");
    return Boolean(caixa && botao && botao.offsetParent !== null && caixa.textContent.includes(t));
  }, { timeout: 6000 }, esperado).then(() => true).catch(() => false);
  if (viu) {
    await page.evaluate(() => {
      const b = document.querySelector(".swal2-confirm");
      if (b && b.offsetParent !== null) b.click();
    });
    await sleep(600);
  }
  return viu;
}

const kpis = (page) => page.$$eval(".kpi", (els) => els.map((el) => ({
  rotulo: el.querySelector(".kpi-label").textContent.trim(),
  valor: el.querySelector(".kpi-value").textContent.trim(),
  dica: (el.querySelector(".kpi-hint") || {}).textContent || "",
})));

// Estado do calendario lido da tela: quantas celulas cada titulo ocupa.
const titulosNoCalendario = (page) => page.$$eval(".fc-event", (els) => els.map((el) => ({
  titulo: (el.querySelector(".fc-event-title") || el).textContent.replace(/\s+/g, " ").trim(),
  serie: el.classList.contains("is-serie"),
  cores: Array.from(el.classList).filter((c) => ["is-meeting", "is-delivery", "is-follow", "is-other", "is-done", "is-cancelled"].includes(c)),
})));

// A prova cria dados de verdade. Antes de comecar, apaga pelo API o que as
// rodadas anteriores deixaram no mes, para as contagens valerem.
async function limparSobras() {
  const login = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, password: SENHA_ADMIN }),
  }).then((r) => r.json());
  const token = login.accessToken;
  if (!token) throw new Error("login da limpeza falhou");
  const de = new Date(); de.setDate(1); de.setHours(0, 0, 0, 0);
  const ate = new Date(de.getFullYear(), de.getMonth() + 1, 0, 23, 59, 59);
  const url = "http://localhost:3001/api/agenda/events?from=" + de.toISOString() + "&to=" + ate.toISOString();
  const linhas = await fetch(url, { headers: { authorization: "Bearer " + token } }).then((r) => r.json());
  const regex = /^(Degustacao|Manutencao) [0-9]+$/;
  const mestres = new Set((linhas.data || linhas || []).filter((e) => regex.test(e.title)).map((e) => e.masterId));
  for (const id of mestres) {
    await fetch("http://localhost:3001/api/agenda/events/" + id, { method: "DELETE", headers: { authorization: "Bearer " + token } });
  }
  console.log("limpeza: " + mestres.size + " cadastro(s) de rodadas anteriores removidos");
}

(async () => {
  await limparSobras();
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });
  const erros = [];
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  page.on("pageerror", (e) => erros.push(String(e)));

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("input[type=email]", EMAIL_ADMIN, { delay: 3 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 3 });
  await page.click("button[type=submit]");
  await page.waitForSelector(".admin-sidebar", { timeout: 12000 });
  await semToast(page);

  console.log("== Entrada na Agenda ==");
  const temItem = await page.$$eval(".admin-nav-item", (els) => els.some((e) => e.textContent.includes("Agenda")));
  ok("menu lateral traz Agenda", temItem);
  await page.evaluate(() => {
    const item = Array.from(document.querySelectorAll(".admin-nav-item")).find((e) => e.textContent.includes("Agenda"));
    item.click();
  });
  await page.waitForSelector(".fc", { timeout: 12000 });
  await sleep(900);
  ok("url da agenda", page.url().includes("/app/agenda"), page.url());
  ok("titulo da pagina", (await texto(page, ".page-title")) === "Agenda");
  ok("calendario FullCalendar montado", Boolean(await page.$(".fc-dayGridMonth-button")));
  const cabecalho = await texto(page, ".fc .fc-toolbar-title");
  ok("cabecalho em portugues", /[A-Za-zÀ-ÿ]+ de /u.test(cabecalho || ""), cabecalho);
  const primeiros = await page.$$eval(".fc-col-header-cell", (els) => els.map((e) => e.textContent.trim().slice(0, 3)));
  ok("semana comeca na segunda", (primeiros[0] || "").toLowerCase().startsWith("seg"), primeiros.join(","));
  const botoes = await page.$$eval(".fc .fc-button", (els) => els.map((e) => e.textContent.trim()));
  ok("visoes Mes, Semana e Lista", ["Mês", "Semana", "Lista"].every((b) => botoes.includes(b)), botoes.join("/"));
  ok("botao Hoje presente", botoes.includes("Hoje"));

  console.log("== KPIs e estrutura da tela ==");
  const cartões = await kpis(page);
  ok("quatro KPIs", cartões.length === 4, cartões.map((k) => k.rotulo).join("/"));
  ok("KPIs da agenda", cartões.map((k) => k.rotulo).join("|") === "No período|Agendados|Concluídos|Cancelados");
  ok("rodape explica a serie recorrente", (await texto(page, ".agenda-surface + .form-note") || "").includes("↻"));
  ok("busca e filtros presentes", Boolean(await page.$('input[type=search][aria-label="Buscar compromisso"]')) && Boolean(await page.$('select[aria-label="Filtrar por tipo"]')));

  console.log("== Cadastro de compromisso simples ==");
  const antesSimples = (await titulosNoCalendario(page)).length;
  await page.evaluate(() => document.querySelector(".page-head .btn-brand").click());
  await page.waitForSelector(".nx-modal", { timeout: 5000 });
  ok("modal de novo compromisso abre", (await texto(page, ".nx-modal-title")) === "Novo compromisso", await texto(page, ".nx-modal-title"));
  ok("foco cai no titulo", await page.evaluate(() => document.activeElement && document.activeElement.id === "evento-title"));
  ok("recorrencia comeca desligada", await page.$eval("#evento-recorrencia", (el) => el.value === "NONE"));
  ok("campo repetir ate fica desabilitado sem serie", await page.$eval("#evento-ate", (el) => el.disabled === true));
  await page.type("#evento-title", SIMPLES, { delay: 4 });
  await setReactValue(page, "#evento-type", "DELIVERY");
  await setReactValue(page, "#evento-start", diaMes(DIA_SIMPLES) + "T10:00");
  await setReactValue(page, "#evento-end", diaMes(DIA_SIMPLES) + "T12:30");
  await page.type("#evento-local", "Salão nobre", { delay: 2 });
  await page.type("#evento-desc", "Levar amostras e contrato assinado.", { delay: 2 });
  await page.screenshot({ path: path.join(OUT, "17-agenda-novo-compromisso.png") });
  await page.evaluate(() => document.querySelector(".nx-modal-foot .btn-brand").click());
  ok("toast de cadastro", await toast(page, "Compromisso cadastrado"));
  await semToast(page);
  const depoisSimples = await titulosNoCalendario(page);
  const linhaSimples = depoisSimples.find((e) => e.titulo.includes(SIMPLES));
  ok("compromisso aparece no calendario", Boolean(linhaSimples));
  ok("total do calendario subiu", depoisSimples.length === antesSimples + 1, antesSimples + " -> " + depoisSimples.length);
  ok("cor do tipo entrega aplicada", (linhaSimples?.cores || []).includes("is-delivery"), (linhaSimples?.cores || []).join(","));
  ok("nao marcado como serie", !(linhaSimples?.serie ?? true));
  const celulas = await page.$$eval(".fc-daygrid-day-frame", (els) => els.length);
  ok("grade do mes montada", celulas >= 28, celulas + " celulas");

  console.log("== Recorrencia semanal ==");
  const dicaAntes = (await kpis(page)).find((k) => k.rotulo === "No período").dica;
  const contaDica = (t) => { const m = /([0-9]+)[ ]*s[ée]rie/.exec(t); return m ? Number(m[1]) : 0; };
  await page.evaluate(() => document.querySelector(".page-head .btn-brand").click());
  await page.waitForSelector(".nx-modal", { timeout: 5000 });
  await page.type("#evento-title", SERIE, { delay: 4 });
  await setReactValue(page, "#evento-type", "FOLLOW_UP");
  await setReactValue(page, "#evento-start", diaMes(DIA_SERIE) + "T08:00");
  await setReactValue(page, "#evento-recorrencia", "WEEKLY");
  ok("habilita o campo repetir ate", await page.$eval("#evento-ate", (el) => el.disabled === false));
  await setReactValue(page, "#evento-ate", diaMes(28));
  const dica = await texto(page, ".nx-modal .form-note");
  ok("dica explica a serie no formulario", (dica || "").includes("toda semana no mesmo dia") && (dica || "").includes("série inteira"), dica);
  await page.screenshot({ path: path.join(OUT, "17-agenda-recorrencia.png") });
  await page.evaluate(() => document.querySelector(".nx-modal-foot .btn-brand").click());
  ok("toast avisa da serie", await toast(page, "série"));
  await semToast(page);
  const comSerie = await titulosNoCalendario(page);
  const linhasSerie = comSerie.filter((e) => e.titulo.includes(SERIE));
  ok("série vira varias datas no mes", linhasSerie.length >= 4, linhasSerie.length + " datas");
  ok("cada data carrega o marcador de serie", linhasSerie.every((e) => e.serie && e.titulo.startsWith("↻")), linhasSerie[0]?.titulo);
  const kpiSerie = (await kpis(page)).find((k) => k.rotulo === "No período");
  ok("KPI conta a serie uma vez, nao as quatro datas", contaDica(kpiSerie.dica) === contaDica(dicaAntes) + 1, dicaAntes.trim() + " -> " + kpiSerie.dica.trim());

  console.log("== Detalhe do compromisso ==");
  const clicarEvento = async (titulo) => page.evaluate((t) => {
    const el = Array.from(document.querySelectorAll(".fc-event")).find((e) => e.textContent.includes(t));
    if (el) el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return Boolean(el);
  }, titulo);
  ok("evento clicavel na grade", await clicarEvento(SIMPLES));
  await page.waitForSelector(".nx-modal .kv", { timeout: 6000 });
  const detalhe = await texto(page, ".nx-modal .kv");
  ok("detalhe mostra quando e duracao", detalhe.includes("15/") && detalhe.includes("10:00") && detalhe.includes("150 minutos"), detalhe.slice(0, 90));
  ok("detalhe mostra local e responsavel", detalhe.includes("Salão nobre") && detalhe.includes("Administrador"));
  ok("detalhe traz as anotacoes", detalhe.includes("Levar amostras"));
  ok("subtitulo com estado e tipo", (await texto(page, ".nx-modal-sub")).includes("Agendado"), await texto(page, ".nx-modal-sub"));
  await page.screenshot({ path: path.join(OUT, "17-agenda-detalhe.png") });

  console.log("== Concluir pelo modal de detalhe ==");
  const kpiAntes = (await kpis(page)).find((k) => k.rotulo === "Concluídos").valor;
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll(".agenda-acoes .btn")).find((x) => x.textContent.trim() === "Concluir");
    if (b) b.click();
  });
  ok("confirmacao pedida no SweetAlert2", await confirmarSwal(page, "Marcar"));
  ok("toast de conclusao", await toast(page, "concluído"));
  await semToast(page);
  const kpiDepois = (await kpis(page)).find((k) => k.rotulo === "Concluídos").valor;
  ok("KPI de concluidos somou", Number(kpiDepois) === Number(kpiAntes) + 1, kpiAntes + " -> " + kpiDepois);
  const marcado = (await titulosNoCalendario(page)).find((e) => e.titulo.includes(SIMPLES));
  ok("compromisso concluido muda de aparencia", (marcado?.cores || []).includes("is-done"), (marcado?.cores || []).join(","));

  console.log("== Detalhe de uma ocorrencia da serie ==");
  await clicarEvento(SERIE);
  await page.waitForSelector(".nx-modal .kv", { timeout: 6000 });
  const detalheSerie = await texto(page, ".nx-modal .kv");
  ok("mostra a recorrencia e a data da serie", /semanalmente/.test(detalheSerie) && /data \d+ da s[ée]rie/.test(detalheSerie), detalheSerie.slice(0, 160));
  ok("avisa que o estado vale para a serie", ((await texto(page, ".agenda-acoes")) || "").includes("todas as datas desta série"));
  ok("subtitulo marca a serie", (await texto(page, ".nx-modal-sub")).includes("semanalmente"), await texto(page, ".nx-modal-sub"));
  await page.keyboard.press("Escape");
  await sleep(500);
  ok("Esc fecha o detalhe", !(await page.$(".nx-modal")));

  console.log("== Filtros ==");
  await setReactValue(page, 'select[aria-label="Filtrar por tipo"]', "DELIVERY");
  await sleep(900);
  const soEntregas = await titulosNoCalendario(page);
  ok("filtro por tipo mostra so entregas", soEntregas.length > 0 && soEntregas.every((e) => e.cores.includes("is-delivery")), soEntregas.map((e) => e.titulo).join(" | "));
  await setReactValue(page, 'input[type=search]', SERIE);
  await sleep(900);
  ok("busca por titulo combinada ao tipo esvazia", (await titulosNoCalendario(page)).length === 0);
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll(".toolbar .btn")).find((x) => x.textContent.trim() === "Limpar filtros");
    b.click();
  });
  await sleep(900);
  ok("limpar filtros volta tudo", (await titulosNoCalendario(page)).length >= 5, (await titulosNoCalendario(page)).length + " eventos");
  await setReactValue(page, 'input[type=search]', SERIE);
  await sleep(900);
  const achou = await titulosNoCalendario(page);
  ok("busca acha as datas da serie", achou.length >= 4 && achou.every((e) => e.titulo.includes(SERIE)), achou.length + " datas");
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll(".toolbar .btn")).find((x) => x.textContent.trim() === "Limpar filtros");
    b.click();
  });
  await sleep(900);

  console.log("== Visoes semana e lista ==");
  await page.evaluate(() => document.querySelector(".fc-timeGridWeek-button").click());
  await sleep(900);
  ok("visao semana renderiza grade horaria", Boolean(await page.$(".fc-timeGridWeek-view")) && Boolean(await page.$(".fc-scrollgrid")));
  ok("compromissos aparecem na semana", (await titulosNoCalendario(page)).length >= 1);
  await page.evaluate(() => document.querySelector(".fc-listWeek-button").click());
  await sleep(900);
  ok("visao lista renderiza", Boolean(await page.$(".fc-listWeek-view")) || Boolean(await page.$(".fc-list")));
  // A visao Lista e semanal: o compromisso do dia 15 nao cai na semana de hoje,
  // mas a serie (3, 10, 17, 24) cai. Le a hora e o titulo de cada linha.
  const linhasLista = await page.$$eval(".fc-list-event", (els) => els.map((el) => ({
    hora: (el.querySelector(".fc-list-event-time") || {}).textContent || "",
    titulo: (el.querySelector(".fc-list-event-title") || el).textContent.replace(/\s+/g, " ").trim(),
  })));
  const diasLista = await page.$$eval(".fc-list-day-text, .fc-list-day-side-text", (els) => els.map((e) => e.textContent.trim()));
  ok("lista mostra hora e titulo de cada linha", linhasLista.some((l) => l.titulo.includes(SERIE) && /[0-9]{1,2}:[0-9]{2}/.test(l.hora)), JSON.stringify(linhasLista[0]));
  ok("lista agrupa as linhas por data", diasLista.length >= 1, diasLista.slice(0, 2).join(" | "));
  await page.screenshot({ path: path.join(OUT, "17-agenda-lista.png") });
  await page.evaluate(() => document.querySelector(".fc-dayGridMonth-button").click());
  await sleep(900);
  ok("volta para a visao mes", Boolean(await page.$(".fc-dayGridMonth-view")));

  console.log("== Edicao em serie ==");
  const seriesAntesDaEdicao = contaDica((await kpis(page)).find((k) => k.rotulo === "No per" + "íodo").dica);
  await clicarEvento(SIMPLES);
  await page.waitForSelector(".nx-modal", { timeout: 6000 });
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll(".nx-modal-foot .btn")).find((x) => x.textContent.trim() === "Editar dados");
    b.click();
  });
  await page.waitForSelector("#evento-title", { timeout: 6000 });
  const tituloModal = await texto(page, ".nx-modal-title");
  const tituloCampo = await page.$eval("#evento-title", (el) => el.value);
  ok("modal de edicao abre com o titulo certo", tituloModal === "Editar compromisso", String(tituloModal));
  ok("modal de edicao vem preenchido", tituloCampo === SIMPLES, tituloCampo);
  ok("edicao mantem o tipo gravado", await page.$eval("#evento-type", (el) => el.value === "DELIVERY"));
  const horarioEsperado = diaMes(DIA_SIMPLES) + "T10:00";
  const valorInicio = await page.$eval("#evento-start", (el) => el.value);
  ok("edicao mantem o horario gravado", valorInicio === horarioEsperado, valorInicio + " x " + horarioEsperado);
  ok("edicao avisa que serie inteira", (await texto(page, ".nx-modal-sub")).includes("série inteira"), await texto(page, ".nx-modal-sub"));
  await setReactValue(page, "#evento-title", SIMPLES + " confirmada");
  await setReactValue(page, "#evento-recorrencia", "MONTHLY");
  ok("dica mensal aparece na edicao", (await texto(page, ".nx-modal .form-note")).includes("todo mês no mesmo dia"));
  await page.evaluate(() => document.querySelector(".nx-modal-foot .btn-brand").click());
  ok("toast de atualizacao", await toast(page, "Compromisso atualizado"));
  await semToast(page);
  const editado = await titulosNoCalendario(page);
  ok("titulo novo no calendario", editado.some((e) => e.titulo.includes("confirmada")));
  ok("marcador de serie surgiu depois de tornar mensal", editado.some((e) => e.titulo.includes("confirmada") && e.serie && e.titulo.startsWith("↻")));
  const kpiEditado = (await kpis(page)).find((k) => k.rotulo === "No per" + "íodo").dica;
  ok("KPI de series contou a nova serie", contaDica(kpiEditado) === seriesAntesDaEdicao + 1, seriesAntesDaEdicao + " -> " + kpiEditado.trim());

  await semToast(page);
  await page.screenshot({ path: path.join(OUT, "17-agenda.png") });

  console.log("== Exclusao com confirmacao ==");
  const antesExcluir = (await titulosNoCalendario(page)).length;
  await clicarEvento(SIMPLES);
  await page.waitForSelector(".nx-modal", { timeout: 6000 });
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll(".nx-modal-foot .btn")).find((x) => x.textContent.trim() === "Excluir");
    b.click();
  });
  ok("confirmacao de exclusao e perigosa", await confirmarSwal(page, "Não dá para desfazer"));
  ok("toast de exclusao", await toast(page, "Compromisso excluído"));
  await semToast(page);
  const depoisExcluir = (await titulosNoCalendario(page)).length;
  ok("compromisso sumiu do calendario", depoisExcluir === antesExcluir - 1, antesExcluir + " -> " + depoisExcluir);
  ok("nada sobra do titulo excluido", !(await titulosNoCalendario(page)).some((e) => e.titulo.includes(SIMPLES)));

  console.log("== Exclusao da serie inteira ==");
  const datasDaSerie = (await titulosNoCalendario(page)).filter((e) => e.titulo.includes(SERIE)).length;
  ok("a serie tem varias datas antes de excluir", datasDaSerie >= 4, datasDaSerie + " datas");
  await clicarEvento(SERIE);
  await page.waitForSelector(".nx-modal", { timeout: 6000 });
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll(".nx-modal-foot .btn")).find((x) => x.textContent.trim() === "Excluir");
    b.click();
  });
  ok("confirmacao avisa que e a serie inteira", await confirmarSwal(page, "apaga a s"));
  await semToast(page);
  const sobras = (await titulosNoCalendario(page)).filter((e) => e.titulo.includes(SERIE)).length;
  ok("excluir o cadastro apaga todas as datas", sobras === 0, datasDaSerie + " -> " + sobras);
  ok("KPI volta a contar zero series", contaDica((await kpis(page)).find((k) => k.rotulo.startsWith("No per")).dica) === 0, (await kpis(page)).find((k) => k.rotulo.startsWith("No per")).dica.trim());

  console.log("== Celular ==");
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto(BASE + "/app/agenda", { waitUntil: "networkidle0" });
  await page.waitForSelector(".fc", { timeout: 12000 });
  await sleep(1200);
  await semToast(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("sem overflow horizontal no celular", overflow <= 0, "overflow " + overflow);
  ok("calendario cabe na tela", await page.$eval(".agenda-surface", (el) => el.getBoundingClientRect().width <= 390));
  ok("KPIs empilham em coluna no celular", (await page.$$eval(".kpi", (els) => els[0].getBoundingClientRect().top !== els[1].getBoundingClientRect().top)));
  ok("filtros continuam acessiveis", Boolean(await page.$('input[type=search][aria-label="Buscar compromisso"]')));
  await page.screenshot({ path: path.join(OUT, "17-agenda-celular.png") });

  console.log("== Tema claro ==");
  await page.setViewport({ width: 1440, height: 960, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
  await sleep(400);
  await page.goto(BASE + "/app/agenda", { waitUntil: "networkidle0" });
  await page.waitForSelector(".fc", { timeout: 12000 });
  await semToast(page);
  await page.evaluate(() => document.querySelector(".theme-switch").click());
  await sleep(700);
  const claro = await page.evaluate(() => {
    const fc = document.querySelector(".fc");
    const cs = getComputedStyle(fc);
    const dia = document.querySelector(".fc-day-today");
    return {
      tema: document.documentElement.getAttribute("data-theme"),
      pagina: cs.getPropertyValue("--fc-page-bg-color").trim(),
      borda: cs.getPropertyValue("--fc-border-color").trim(),
      texto: getComputedStyle(fc).color,
      hoje: dia ? getComputedStyle(dia).backgroundColor : "",
    };
  });
  ok("tema claro aplicado", claro.tema === "light", claro.tema);
  // O fundo do calendario tem que ser a superficie creme do tema, nao branco
  // puro (regra da identidade: secoes 14 e 65).
  const canais = (t) => {
    const hex = /^#([0-9a-f]{6})$/i.exec((t || "").trim());
    if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
    const rgb = /([0-9]{1,3})[^0-9]+([0-9]{1,3})[^0-9]+([0-9]{1,3})/.exec(t || "");
    return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
  };
  const c = canais(claro.pagina);
  ok("calendario herda a superficie clara do tema", Boolean(c) && c.every((v) => v >= 230 && v < 255), claro.pagina + " " + JSON.stringify(c));
  ok("fundo do calendario nao e branco puro", Boolean(c) && !(c[0] === 255 && c[1] === 255 && c[2] === 255), claro.pagina);
  ok("hoje continua destacado no claro", claro.hoje && !claro.hoje.includes("rgba(0, 0, 0, 0)"), claro.hoje);
  await page.screenshot({ path: path.join(OUT, "17-agenda-tema-claro.png") });
  await page.evaluate(() => document.querySelector(".theme-switch").click());

  console.log("== Console ==");
  ok("nenhum erro de console", erros.length === 0, erros.slice(0, 3).join(" || "));

  await browser.close();
  console.log("\nchecagens: " + checks);
  if (falhas.length) {
    console.log("FALHAS (" + falhas.length + "):");
    falhas.forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
  console.log("TODAS AS CHECAGENS PASSARAM");
})().catch((err) => {
  console.error("ERRO NA PROVA:", err);
  process.exit(1);
});
