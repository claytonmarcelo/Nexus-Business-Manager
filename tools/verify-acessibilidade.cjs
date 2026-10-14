// F5, item 7: acessibilidade minima medida no navegador, nao declarada no papel.
//
// As cinco coisas que o item pede, cada uma com numero:
//   1. ROTULO — todo controle visivel (botao, link, campo, aba, item de menu) tem
//      de ter um nome acessivel. aria-label, aria-labelledby, label[for], label
//      envolvendo o campo, texto do proprio controle, alt de icone, value de
//      submit: essa e a ordem da casa. placeholder NAO vale como rotulo (e dica
//      que some quando a pessoa digita), entao ele e contado a parte e reportado;
//   2. FOCO VISIVEL — a pessoa atravessa a tela com Tab, de verdade, e cada
//      elemento parado pelo teclado tem de mostrar anel (outline ou box-shadow).
//      Foco que desaparece e foco perdido;
//   3. NAVEGACAO POR TECLADO — Enter ativa o que esta focado: um link da barra
//      troca de rota, Enter/Space numa aba seleciona a aba, Escape fecha o que
//      tem de fechar;
//   4. ALVO DE TOQUE — em 360 x 640, com a gaveta aberta, os controles principais
//      medem no minimo 44 x 44 px de area sensivel, que e o numero pedido;
//   5. MOVIMENTO REDUZIDO — com prefers-reduced-motion: reduce, nenhuma animacao
//      ou transicao continua girando. Antes de medir o reduce, a prova confere que
//      com no-preference existe animacao: sem isso a assercao seria verdadeira por
//      vacua.
//
// Tres leituras deste instrumento foram corrigidas em 2026-10-14, e as tres
// andam na direcao de medir a verdade, nao de passar:
//   a) AREA SENSIVEL, NAO A CAIXA VISIVEL — o que o dedo acerta e a area que o
//      navegador entrega ao controle, e uma camada ::before/::after posicionada
//      com `inset` negativo aumenta essa area sem aumentar o desenho. A casa ja
//      usa isso de proposito no alternador de tema (components.css:103-111, que
//      registra "desenho de 54x27 preservado, area sensivel de 54x45"). Medir so
//      a caixa pintada diria que aquele controle e um alvo de 27 px quando o
//      dedo pega 45. A leitura agora une a caixa do elemento com a dos
//      pseudo-elementos posicionados. Nada mais ganhou area por pseudo: todos os
//      outros controles foram crescidos de verdade, na própria caixa.
//   b) FOCO FORA DA JANELA — o teste antigo exigia que o elemento focado
//      CABEINTE na janela. Um painel de aba focalizavel (tabIndex 0, para quem
//      navega pelo teclado poder rolar o conteudo) e mais alto que a tela por
//      natureza, e essa assercao nao poderia ser verdadeira para ele. O que
//      importa e o contrario: o foco nao pode parar em coisa que nao esta na
//      frente da pessoa. Agora a prova pede intersecao com a janela, e continua
//      reprovando o elemento invisivel, o deslocado para fora e o de tamanho zero.
//
//   c) O ROTULO QUE ENVOLVE TAMBEM E ALVO — a caixa de uma caixa de selecao ou de
//      um radio e pequena por natureza (17 px), mas quem toca na palavra ao lado
//      aciona o campo: o <label> envolve o controle e o navegador entrega o
//      clique a ele. Medir so os 17 px do quadrado diria que a linha inteira de
//      "Botão de WhatsApp ativo" e um alvo de 17 px, o que nao e verdade. A
//      leitura une o campo ao <label> ancestral quando existe esse envolvimento.
//
// O piso de 44 px e do toque. Em 1440 x 900, com mouse, a exigencia minima da
// casa e o piso AA da WCAG 2.2 (24 px), medido na mesma varredura; a passada de
// 360 continua cobrando os 44 do item 7, sem concessao.
//
// Roda no servidor de desenvolvimento (5173) com a conta ficticia da casa, e so
// contra o banco de prova: conferirServidorDeProva() abre a corrida. A unica linha
// que esta prova escreve e a pilula da grade do mes (ver PilulaDaGrade abaixo): ela
// cria o compromisso, mede, e apaga no fim, com a contagem impressa antes e depois.
// Sem essa pilula a grade do mes poderia ser varrida vazia e a prova diria "ok" sem
// ter medido nada. Nenhuma senha e impressa aqui, em hipotese alguma.
const os = require("os");
const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const BASE = "http://localhost:5173";
const API = (process.env.NEXUS_API || "http://localhost:3001") + "/api";
const ALVO_DE_TOQUE = 44;
const ALVO_DE_TECLA = 24;

// As telas da casa, na ordem do menu. Os nomes das publicas sao os enderecos que
// quem nao tem sessao usa.
const TELAS = [
  ["/", "vitrine"],
  ["/login", "entrada"],
  ["/cadastro", "cadastro"],
  ["/recuperar-senha", "recuperacao"],
  ["/verificar-e-mail", "link de confirmacao"],
  ["/app", "Dashboard"],
  ["/app/clientes", "Clientes"],
  ["/app/produtos", "Produtos"],
  ["/app/vendas", "Vendas"],
  ["/app/ordens-de-servico", "Ordens de servico"],
  ["/app/compras", "Compras"],
  ["/app/financeiro", "Financeiro"],
  ["/app/cobrancas", "Cobrancas"],
  ["/app/crm", "CRM"],
  ["/app/agenda", "Agenda"],
  ["/app/usuarios", "Usuarios"],
  ["/app/auditoria", "Auditoria"],
  ["/app/configuracoes", "Configuracoes"],
  ["/app/notificacoes", "Notificacoes"],
  ["/app/cms", "Editor da vitrine"],
  ["/app/rotinas", "Rotinas"],
  ["/app/auditoria-plataforma", "Auditoria da plataforma"],
];

// As quatro telas em que a caminhada de Tab acontece: uma publica simples, a
// entrada, o painel e uma tela de tabela com acoes. Caminhar as 22 telas com o
// teclado nao acrescentaria informacao nova e custaria dez minutos.
const TELAS_DE_TAB = ["/", "/login", "/app", "/app/vendas"];

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

// ------------------------------------------------------------- varreduras na pagina

// Nome acessivel de um elemento, na ordem que a casa aceita como rotulo.
function varraAcessibilidade({ minimoToque }) {
  const SELETOR = [
    "button",
    "a[href]",
    "input",
    "select",
    "textarea",
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="switch"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="combobox"]',
    '[role="searchbox"]',
    '[role="slider"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  function textoDe(el) {
    return (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  }
  function porId(id) {
    const alvo = document.getElementById(id);
    return alvo ? textoDe(alvo) : "";
  }
  function rotuloDe(el) {
    const aria = (el.getAttribute("aria-label") || "").trim();
    if (aria) return { nome: aria, fonte: "aria-label" };
    const citado = (el.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .map(porId)
      .filter(Boolean)
      .join(" ")
      .trim();
    if (citado) return { nome: citado, fonte: "aria-labelledby" };
    if (el.labels && el.labels.length) {
      const nome = Array.from(el.labels).map(textoDe).filter(Boolean).join(" ").trim();
      if (nome) return { nome, fonte: "label" };
    }
    const envolvente = el.closest("label");
    if (envolvente) {
      const nome = textoDe(envolvente);
      if (nome) return { nome, fonte: "label envolvendo" };
    }
    const tipo = (el.getAttribute("type") || "").toLowerCase();
    if (el.tagName === "INPUT" && (tipo === "submit" || tipo === "button" || tipo === "reset")) {
      const nome = (el.value || "").trim();
      if (nome) return { nome, fonte: "value" };
    }
    const imagem = el.querySelector && el.querySelector("img[alt]:not([alt='']), svg[title]");
    if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA" && el.tagName !== "SELECT") {
      const proprio = textoDe(el);
      if (proprio) return { nome: proprio, fonte: "texto" };
      if (imagem) {
        const nome = (imagem.getAttribute("alt") || imagem.getAttribute("title") || "").trim();
        if (nome) return { nome, fonte: "alt" };
      }
    } else {
      const proprio = textoDe(el);
      if (proprio) return { nome: proprio, fonte: "texto" };
    }
    const titulo = (el.getAttribute("title") || "").trim();
    if (titulo) return { nome: titulo, fonte: "title" };
    const dica = (el.getAttribute("placeholder") || "").trim();
    if (dica) return { nome: dica, fonte: "placeholder" };
    return { nome: "", fonte: "" };
  }

  function caminho(el) {
    const partes = [];
    let atual = el;
    for (let i = 0; i < 3 && atual && atual !== document.body; i++) {
      let nome = atual.tagName.toLowerCase();
      const classe = typeof atual.className === "string" ? atual.className.trim().split(/\s+/)[0] : "";
      if (classe) nome += "." + classe.slice(0, 34);
      if (atual.id) nome += "#" + atual.id.slice(0, 20);
      partes.unshift(nome);
      atual = atual.parentElement;
    }
    return partes.join(" > ");
  }

  function visivel(el) {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    if (el.type === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // Um link perdido dentro de um paragrafo nao e um controle principal: a WCAG
  // isenta o link que esta dentro de texto corrido. Botao, campo, aba, item de
  // menu e paginacao nao tem isencao nenhuma.
  //
  // A isencao e do texto corrido, e nao do container. Enquanto ela foi escrita como
  // "qualquer <a> sem classe dentro de td ou li", a linha da Agenda ficou invisivel:
  // o calendario entrega o compromisso como <a> sem classe dentro de uma celula, a
  // prova nao a contou como controle, e ai nem o piso de 44 px dela era cobrado nem o
  // caminho equivalente dela valia para a grade do mes. Agora o link so e texto
  // corrida quando existe palavra ao redor dele; se ele ocupa a celula ou o item
  // inteiro, ele e o proprio controle da linha e responde pelo piso.
  function dentroDeTexto(el) {
    if (el.tagName !== "A") return false;
    if (el.className) return false;
    const caixa = el.closest("p, blockquote, li, td, th, .nexus-footer, .error-actions");
    if (!caixa) return false;
    if (
      caixa.tagName === "P" ||
      caixa.tagName === "BLOCKQUOTE" ||
      caixa.classList.contains("nexus-footer") ||
      caixa.classList.contains("error-actions")
    ) {
      return true;
    }
    const textoDaCaixa = textoDe(caixa);
    const textoDoLink = textoDe(el);
    return textoDaCaixa.replace(textoDoLink, "").trim().length > 0;
  }

  // Area sensivel do controle: a caixa dele, acrescida do <label> que o envolve
  // e das camadas ::before/::after posicionadas para fora dela (inset negativo).
  // E o que o dedo pega, nao o que o olho ve. Sem nada disso, o numero e a caixa
  // de sempre.
  function areaSensivel(el) {
    const caixas = [el.getBoundingClientRect()];
    if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
      const envolvente = el.closest("label");
      if (envolvente) caixas.push(envolvente.getBoundingClientRect());
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const r of caixas) {
      x0 = Math.min(x0, r.left);
      y0 = Math.min(y0, r.top);
      x1 = Math.max(x1, r.right);
      y1 = Math.max(y1, r.bottom);
    }
    for (const camada of ["::before", "::after"]) {
      const s = getComputedStyle(el, camada);
      if (!s.content || s.content === "none" || s.content === "normal") continue;
      if (s.position !== "absolute" && s.position !== "fixed") continue;
      if (s.display === "none" || s.visibility === "hidden") continue;
      const topo = parseFloat(s.top);
      const base = parseFloat(s.bottom);
      const esq = parseFloat(s.left);
      const dir = parseFloat(s.right);
      const r = caixas[0];
      if (Number.isFinite(topo)) y0 = Math.min(y0, r.top + topo);
      if (Number.isFinite(base)) y1 = Math.max(y1, r.bottom - base);
      if (Number.isFinite(esq)) x0 = Math.min(x0, r.left + esq);
      if (Number.isFinite(dir)) x1 = Math.max(x1, r.right - dir);
    }
    return { largura: Math.round(x1 - x0), altura: Math.round(y1 - y0) };
  }

  const controles = [];
  const semRotulo = [];
  const soPlaceholder = [];
  const soTitle = [];
  const alvosPequenos = [];
  // Nome sem o horario da frente e sem os glifos do calendario ("08:00 ↻ Titulo"
  // e "↻ Titulo" viram o mesmo "titulo"). E o que permite conferir se a pilula de
  // uma grade e o mesmo compromisso que a linha de uma lista.
  function nuclearDe(nome) {
    return nome
      .toLowerCase()
      .replace(/^\s*[0-9]{1,2}:[0-9]{2}\s*/, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  for (const el of document.querySelectorAll(SELETOR)) {
    if (!visivel(el)) continue;
    const { nome, fonte } = rotuloDe(el);
    const area = areaSensivel(el);
    const registro = {
      caminho: caminho(el),
      tag: el.tagName.toLowerCase(),
      tipo: el.getAttribute("type") || "",
      papel: el.getAttribute("role") || "",
      nome,
      nuclear: nuclearDe(nome),
      fonte,
      largura: area.largura,
      altura: area.altura,
      principal: !dentroDeTexto(el),
      desabilitado: el.disabled === true || el.getAttribute("aria-disabled") === "true",
      // A pilula do compromisso na grade do mes: sete colunas de ~48 px em 360,
      // largura que o autor nao pode esticar sem quebrar a semana. E o unico caso
      // para o qual a prova aceita caminho equivalente (ver adiante).
      celulaDeGrade: Boolean(el.classList && el.classList.contains("fc-daygrid-event")),
    };
    controles.push(registro);
    if (!nome) semRotulo.push(registro);
    else if (fonte === "placeholder") soPlaceholder.push(registro);
    else if (fonte === "title") soTitle.push(registro);
    if (registro.principal && !registro.desabilitado) {
      if (area.largura < minimoToque || area.altura < minimoToque) alvosPequenos.push(registro);
    }
  }
  return {
    total: controles.length,
    // Nomes dos alvos que JA medem o piso pedido: a lista da Agenda entrega por
    // aqui o caminho equivalente que a grade do mes nao consegue entregar. O filtro
    // de tamanho e o que faz esta lista valer alguma coisa - sem ele todo controle
    // nomeado entraria, a pilula curta se encontraria nela mesma, e a excecao de
    // caminho equivalente seria aprovada por ela mesma.
    alvosGrandes: controles
      .filter(
        (c) =>
          c.principal &&
          !c.desabilitado &&
          c.nuclear &&
          c.largura >= minimoToque &&
          c.altura >= minimoToque,
      )
      .map((c) => c.nuclear),
    semRotulo,
    soPlaceholder,
    soTitle,
    alvosPequenos,
    enderecos: document.location.pathname,
  };
}

// O que esta focado agora, e se o teclado consegue ver o foco.
function leOFoco() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const texto = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim();
  return {
    chave:
      el.tagName.toLowerCase() +
      "." +
      (typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "") +
      "|" +
      texto.slice(0, 24),
    descricao:
      el.tagName.toLowerCase() +
      (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/)[0] : "") +
      (texto ? " \"" + texto.slice(0, 24) + "\"" : ""),
    anel:
      (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) ||
      (s.boxShadow !== "none" && s.boxShadow !== ""),
    outline: s.outlineStyle + " " + s.outlineWidth,
    sombra: s.boxShadow === "none" ? "" : s.boxShadow.slice(0, 30),
    visivel: r.width > 0 && r.height > 0,
    // Intersecao com a janela, nao "cabe inteiro": o painel de aba focalizavel e
    // mais alto que a tela por natureza, e o que nao pode e o foco parar em algo
    // que a pessoa nao esta vendo.
    dentroDaJanela:
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.top < document.documentElement.clientHeight &&
      r.right > 0 &&
      r.left < document.documentElement.clientWidth,
  };
}

// Elementos que animam, e quanto. A mesma leitura com e sem a preferencia ligada.
function leMovimento() {
  const animados = [];
  for (const el of document.querySelectorAll("body *")) {
    const s = getComputedStyle(el);
    const nome = s.animationName;
    const duracao = s.animationDuration;
    const transicao = s.transitionProperty;
    const duracaoT = s.transitionDuration;
    if (nome === "none" && (transicao === "none" || duracaoT === "0s")) continue;
    const seg = (v) => {
      const n = parseFloat(v);
      if (!Number.isFinite(n)) return 0;
      return v.indexOf("ms") > -1 ? n / 1000 : n;
    };
    animados.push({
      tag: el.tagName.toLowerCase(),
      classe: typeof el.className === "string" ? el.className.trim().split(/\s+/)[0].slice(0, 28) : "",
      animacao: seg(duracao),
      transicao: seg(duracaoT),
      nome,
    });
    if (animados.length > 400) break;
  }
  return {
    total: animados.length,
    girando: animados.filter((a) => a.animacao > 0.002).length,
    transicionando: animados.filter((a) => a.transicao > 0.002).length,
    rolagemSuave: getComputedStyle(document.documentElement).scrollBehavior,
    exemplo: animados.slice(0, 6),
  };
}

// ------------------------------------------------------------- navegacao da prova

async function abra(browser, { largura = 1440, altura = 900 } = {}) {
  const pagina = await browser.newPage();
  await pagina.setViewport({ width: largura, height: altura });
  return pagina;
}

async function vaPara(pagina, caminho, { pronto } = {}) {
  await pagina.goto(BASE + caminho, { waitUntil: "networkidle0", timeout: 60000 });
  if (pronto) {
    await pagina.waitForSelector(pronto, { timeout: 25000 });
  } else {
    await pagina.waitForFunction(
      () => document.body && (document.body.innerText || "").trim().length > 20,
      { timeout: 25000 },
    );
  }
  await espera(700);
}

async function caminhaComTab(pagina, limite = 60) {
  await pagina.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });
  const paradas = [];
  const vistas = new Set();
  let primeira = null;
  for (let i = 0; i < limite; i++) {
    await pagina.keyboard.press("Tab");
    const atual = await pagina.evaluate(leOFoco);
    if (!atual) break;
    if (i === 0) primeira = atual.chave;
    else if (atual.chave === primeira) break;
    if (vistas.has(atual.chave) && atual.chave !== primeira) break;
    vistas.add(atual.chave);
    paradas.push(atual);
  }
  return paradas;
}

function agrupe(lista) {
  const mapa = new Map();
  for (const item of lista) {
    const chave = item.caminho;
    const atual = mapa.get(chave) || { ocorrencias: 0, menor: item, exemplos: [] };
    atual.ocorrencias += 1;
    if (atual.exemplos.length < 3) atual.exemplos.push(item.nome || item.tipo || "(sem nome)");
    if ((item.largura * item.altura) < (atual.menor.largura * atual.menor.altura)) atual.menor = item;
    mapa.set(chave, atual);
  }
  return [...mapa.values()].sort((a, b) => b.ocorrencias - a.ocorrencias);
}

// --------------------------------------------------------------- pilula da grade
//
// A grade do mes so diz alguma coisa sobre alvo de toque se houver compromisso
// dentro dela, e o banco de prova recomeca limpo a cada `npm run db:prova`. Uma
// varredura que nao encontra pilula nenhuma passa de verde sem ter medido nada - o
// pior tipo de ok. Entao a prova cria a sua: um compromisso num dia do mes que
// ainda nao tem nenhum (para nao empilhar e fazer aparecer o "+N mais", que e outro
// controle), mede, e apaga no fim. O nome e fixo, e o que deixa a corrida seguinte
// consertar a anterior se esta cair no meio.
const TITULO_DA_PILULA = "Pilula acessivel";

async function tokenDaProva() {
  const corpo = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, password: SENHA_ADMIN }),
  }).then((r) => r.json().catch(() => ({})));
  if (!corpo || !corpo.accessToken) {
    throw new Error("a prova nao conseguiu entrar na API para criar a pilula da grade");
  }
  return corpo.accessToken;
}

async function eventosDaJanela(token, de, ate) {
  const url = API + "/agenda/events?from=" + de.toISOString() + "&to=" + ate.toISOString();
  const corpo = await fetch(url, { headers: { authorization: "Bearer " + token } }).then((r) => r.json());
  return Array.isArray(corpo) ? corpo : corpo.data || [];
}

function janelaDoMes() {
  const agora = new Date();
  return {
    de: new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0),
    ate: new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59),
    ano: agora.getFullYear(),
    mes: agora.getMonth(),
  };
}

async function criaPilulaDaGrade() {
  const token = await tokenDaProva();
  const { de, ate, ano, mes } = janelaDoMes();
  const cabecalho = { authorization: "Bearer " + token };
  const sobras = (await eventosDaJanela(token, de, ate)).filter((e) => e.title === TITULO_DA_PILULA);
  for (const sobra of sobras) {
    await fetch(API + "/agenda/events/" + sobra.id, { method: "DELETE", headers: cabecalho });
  }
  const antes = await eventosDaJanela(token, de, ate);
  const ocupados = new Set(antes.map((e) => new Date(e.startAt).getDate()));
  let dia = 1;
  while (ocupados.has(dia) && dia < 28) dia += 1;
  const criado = await fetch(API + "/agenda/events", {
    method: "POST",
    headers: Object.assign({ "content-type": "application/json" }, cabecalho),
    body: JSON.stringify({
      title: TITULO_DA_PILULA,
      type: "OTHER",
      startAt: new Date(ano, mes, dia, 9, 30, 0).toISOString(),
      endAt: new Date(ano, mes, dia, 10, 0, 0).toISOString(),
      allDay: false,
      recorrencia: "NONE",
    }),
  }).then((r) => r.json());
  const id = criado && (criado.id || (criado.data && criado.data.id));
  if (!id) throw new Error("a API nao devolveu o compromisso criado pela prova");
  const depois = await eventosDaJanela(token, de, ate);
  console.log(
    "  [dado] pilula da grade criada no dia " + dia + " | compromissos do mes: " +
      antes.length + " -> " + depois.length +
      (sobras.length ? " (mais " + sobras.length + " sobra(s) de corrida anterior apagada(s))" : ""),
  );
  return { token, id, antes: antes.length, depois: depois.length, dia };
}

async function apagaPilulaDaGrade(pilula) {
  const { de, ate } = janelaDoMes();
  const r = await fetch(API + "/agenda/events/" + pilula.id, {
    method: "DELETE",
    headers: { authorization: "Bearer " + pilula.token },
  });
  const agora = await eventosDaJanela(pilula.token, de, ate);
  const sobra = agora.filter((e) => e.title === TITULO_DA_PILULA).length;
  console.log(
    "  [dado] pilula apagada (http " + r.status + ") | compromissos do mes: " + pilula.depois +
      " -> " + agora.length + " | voltou ao total de antes? " + (agora.length === pilula.antes) +
      " | sobras com o nome da pilula: " + sobra,
  );
}

async function main() {
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), "nexus-a11y-")),
    defaultViewport: { width: 1440, height: 900 },
  });

  // Sessao montada uma vez: o refresh token fica no perfil do navegador, e cada
  // pagina nova renova sozinha como faz no uso de verdade.
  {
    const semeadura = await abra(browser);
    await vaPara(semeadura, "/login", { pronto: "input[type=email]" });
    await semeadura.type("input[type=email]", EMAIL_ADMIN, { delay: 2 });
    await semeadura.type("input[type=password]", SENHA_ADMIN, { delay: 2 });
    await semeadura.click(".neu-btn");
    await semeadura.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 30000 });
    await semeadura.close();
  }

  const resumo = {
    controles: 0,
    semRotulo: [],
    soPlaceholder: [],
    soTitle: [],
    alvos360: [],
    alvosDesktop: [],
  };

  // A pilula da grade entra antes de qualquer varredura: a tela da Agenda e lida
  // quatro vezes nesta corrida (1440, 360, e a grade em 360), e todas veem o mesmo
  // estado que uma pessoa com compromissos agendados veria.
  let pilula = null;
  try {
    pilula = await criaPilulaDaGrade();
  } catch (e) {
    ok("a prova conseguiu criar a pilula que a grade do mes mede", false, e.message);
  }

  console.log("== 1) rotulo e alvo de toque, tela por tela ==");
  for (const [caminho, quem] of TELAS) {
    const pagina = await abra(browser);
    await vaPara(pagina, caminho);

    // Desktop e mouse: aqui o piso cobrado e o AA da WCAG 2.2 (24 px). Os 44 do
    // item 7 sao do toque, e dao a segunda passada logo abaixo, em 360 x 640.
    const desktop = await pagina.evaluate(varraAcessibilidade, { minimoToque: ALVO_DE_TECLA });
    resumo.controles += desktop.total;
    resumo.semRotulo.push(...desktop.semRotulo.map((r) => ({ ...r, tela: quem })));
    resumo.soPlaceholder.push(...desktop.soPlaceholder.map((r) => ({ ...r, tela: quem })));
    resumo.soTitle.push(...desktop.soTitle.map((r) => ({ ...r, tela: quem })));
    resumo.alvosDesktop.push(...desktop.alvosPequenos.map((r) => ({ ...r, tela: quem })));

    // 360 x 640: a barra lateral vira gaveta, entao ela e aberta antes de medir —
    // item de menu escondido nao e alvo que a pessoa toca, e item visivel pequeno e.
    //
    // A tela e montada de novo nesta largura em vez de so redimensionada. Redimensionar
    // mede o app que nasceu em 1440 e se ajustou depois, e isso nao existe no celular de
    // ninguem: quem abre o painel no telefone monta a tela de telefones, com a view que o
    // componente escolhe na primeira renderizacao. Foi assim que a Agenda virou prova de
    // mentiroso - ela passou a abrir na lista do mes em 360, e a varredura antiga,
    // redimensionada, continuou medindo a grade de sete colunas que o telefone nao mostra.
    await pagina.setViewport({ width: 360, height: 640 });
    await vaPara(pagina, caminho);
    if (caminho.startsWith("/app")) {
      const tog = await pagina.$(".admin-toggle");
      if (tog) {
        await tog.click();
        await espera(350);
      }
    }
    const mobile = await pagina.evaluate(varraAcessibilidade, { minimoToque: ALVO_DE_TOQUE });
    resumo.alvos360.push(...mobile.alvosPequenos.map((r) => ({ ...r, tela: quem })));

    console.log(
      "  varre " + quem.padEnd(24) + " " + String(desktop.total).padStart(4) + " controles, " +
        String(mobile.total).padStart(4) + " em 360 | sem rotulo " + desktop.semRotulo.length +
        " | alvo curto 360 " + mobile.alvosPequenos.length,
    );

    // A segunda cara da Agenda em 360. Em 2026-10-14 a tela passou a abrir na
    // lista do mes (e e ela que a varredura de cima mede), mas a grade continua a
    // um toque do botao "Mês" — medir so a cara padrao seria o jeito silencioso de
    // nao medir a grade. Aqui a WCAG 2.5.8 tem uma saida legitima, a excecao de
    // caminho equivalente: "o alvo esta disponivel por um link ou controle
    // equivalente na mesma pagina, de pelo menos 24 x 24". A prova nao aceita a
    // excecao declarada, ela confere: cada pilula curta da grade tem de reaparecer
    // na lista desta mesma tela num controle que mede o piso pedido. Pilula sem
    // equivalente continua contando como alvo curto, e reprova.
    if (caminho === "/app/agenda") {
      const abriuGrade = await pagina.evaluate(() => {
        const botao = document.querySelector(".fc-dayGridMonth-button");
        if (!botao) return false;
        botao.click();
        return true;
      });
      await espera(800);
      if (!abriuGrade) {
        ok("a grade do mes abre pelo botao da barra em 360", false, "botao nao encontrado");
      } else {
        const grade = await pagina.evaluate(varraAcessibilidade, { minimoToque: ALVO_DE_TOQUE });
        const naGrade = grade.alvosPequenos.filter((r) => r.celulaDeGrade);
        const foraDaGrade = grade.alvosPequenos.filter((r) => !r.celulaDeGrade);
        const grandes = new Set(mobile.alvosGrandes);
        const cobertas = naGrade.filter((r) => grandes.has(r.nuclear));
        const descobertas = naGrade.filter((r) => !grandes.has(r.nuclear));
        // Sem esta linha a checagem de cima seria falsa de novo do outro lado: se a
        // grade nao tem pilula nenhuma, "0 sem equivalente" e um ok que nao mediu
        // nada. A pilula criada no comeco da corrida tem de estar aqui para medir.
        const pilulaNaGrade = pilula
          ? grade.alvosPequenos.some((r) => r.celulaDeGrade && r.nuclear === "pilula acessivel") ||
            grade.alvosGrandes.includes("pilula acessivel")
          : false;
        ok(
          "a grade do mes em 360 tinha a pilula criada pela prova para ser medida",
          pilulaNaGrade,
          naGrade.length + " pilula(s) curta(s) na grade",
        );
        if (process.env.NEXUS_DEBUG_EQUIVALENTE) {
          console.log("    [debug] lista: " + JSON.stringify([...grandes].slice(0, 20)));
          console.log("    [debug] grade curta: " + JSON.stringify(naGrade.map((r) => [r.nuclear, r.nome])));
          console.log("    [debug] grade total=" + grade.total + " grandes=" + grade.alvosGrandes.length);
        }
        resumo.semRotulo.push(...grade.semRotulo.map((r) => ({ ...r, tela: quem + " (grade)" })));
        resumo.soPlaceholder.push(...grade.soPlaceholder.map((r) => ({ ...r, tela: quem + " (grade)" })));
        resumo.soTitle.push(...grade.soTitle.map((r) => ({ ...r, tela: quem + " (grade)" })));
        resumo.alvos360.push(
          ...foraDaGrade.map((r) => ({ ...r, tela: quem + " (grade)" })),
          ...descobertas.map((r) => ({ ...r, tela: quem + " (grade)" })),
        );
        console.log(
          "  varre " + (quem + " (grade)").padEnd(24) + "     - controles, " +
            String(grade.total).padStart(4) + " em 360 | sem rotulo " + grade.semRotulo.length +
            " | alvo curto 360 " + grade.alvosPequenos.length,
        );
        ok(
          "na grade do mes em 360 cada pilula curta tem caminho equivalente de " + ALVO_DE_TOQUE +
            " px na lista da mesma tela",
          descobertas.length === 0,
          cobertas.length + " cobertas pela lista, " + descobertas.length + " sem equivalente",
        );
        for (const r of descobertas.slice(0, 8)) {
          console.log("    - pilula sem equivalente: \"" + (r.nome || "").slice(0, 30) + "\" mede " + r.largura + "x" + r.altura);
        }
      }
    }

    await pagina.close();
  }

  // A casa devolve o que emprestou. Se a corrida cair antes desta linha, a pilula
  // fica no banco de prova - e a proxima corrida apaga a sobra antes de criar a
  // sua, que e para isso que o nome dela e fixo.
  if (pilula) {
    try {
      await apagaPilulaDaGrade(pilula);
    } catch (e) {
      ok("a prova conseguiu apagar a pilula que criou", false, e.message);
    }
  }

  const gruposSemRotulo = agrupe(resumo.semRotulo);
  ok(
    "nenhum controle visivel ficou sem nome acessivel",
    resumo.semRotulo.length === 0,
    resumo.semRotulo.length + " em " + resumo.controles + " controles",
  );
  for (const g of gruposSemRotulo) {
    console.log("    - " + g.menor.caminho + " | " + g.ocorrencias + "x | telas: " + g.exemplos.join(", "));
  }
  const gruposPlaceholder = agrupe(resumo.soPlaceholder);
  ok(
    "nenhum controle depende do placeholder como unico rotulo",
    resumo.soPlaceholder.length === 0,
    resumo.soPlaceholder.length + " controle(s)",
  );
  for (const g of gruposPlaceholder) {
    console.log("    - " + g.menor.caminho + " | \"" + g.menor.nome.slice(0, 30) + "\" | " + g.ocorrencias + "x");
  }
  const gruposTitle = agrupe(resumo.soTitle);
  ok(
    "nenhum controle depende do title como unico rotulo",
    resumo.soTitle.length === 0,
    resumo.soTitle.length + " controle(s)",
  );
  for (const g of gruposTitle) {
    console.log("    - " + g.menor.caminho + " | \"" + g.menor.nome.slice(0, 30) + "\" | " + g.ocorrencias + "x");
  }

  const grupos360 = agrupe(resumo.alvos360);
  ok(
    "em 360 x 640 todo controle principal mede " + ALVO_DE_TOQUE + " px de area sensivel",
    resumo.alvos360.length === 0,
    resumo.alvos360.length + " alvo(s) curto(s) em " + resumo.controles + " controles",
  );
  // A lista sai inteira, sem corte: esconder o decimo quinto grupo seria o
  // jeito silencioso de nao corrigir o decimo quinto grupo.
  for (const g of grupos360) {
    console.log(
      "    - " + g.menor.caminho + " mede " + g.menor.largura + "x" + g.menor.altura + " | " +
        g.ocorrencias + "x | ex: \"" + (g.menor.nome || "").slice(0, 24) + "\"",
    );
  }
  const gruposDesktop = agrupe(resumo.alvosDesktop);
  ok(
    "em 1440 x 900, com mouse, todo controle principal mede " + ALVO_DE_TECLA + " px (piso AA)",
    resumo.alvosDesktop.length === 0,
    resumo.alvosDesktop.length + " alvo(s) curto(s)",
  );
  for (const g of gruposDesktop) {
    console.log(
      "    - " + g.menor.caminho + " mede " + g.menor.largura + "x" + g.menor.altura + " | " +
        g.ocorrencias + "x | ex: \"" + (g.menor.nome || "").slice(0, 24) + "\"",
    );
  }

  console.log("== 2) foco visivel: a travessia com Tab ==");
  const semAnel = [];
  const foraDaJanela = [];
  let paradasTotais = 0;
  for (const caminho of TELAS_DE_TAB) {
    const pagina = await abra(browser);
    await vaPara(pagina, caminho);
    const paradas = await caminhaComTab(pagina);
    paradasTotais += paradas.length;
    for (const p of paradas) {
      if (!p.anel) semAnel.push({ tela: caminho, ...p });
      if (!p.dentroDaJanela) foraDaJanela.push({ tela: caminho, ...p });
    }
    console.log(
      "  tab    " + caminho.padEnd(24) + " " + String(paradas.length).padStart(3) + " paradas, " +
        paradas.filter((p) => !p.anel).length + " sem anel",
    );
    await pagina.close();
  }
  ok("a travessia por teclado parou em controles de verdade", paradasTotais >= 20, paradasTotais + " paradas");
  const aneis = agrupe(semAnel.map((s) => ({ caminho: s.tela + " :: " + s.descricao })));
  ok("todo elemento parado pelo teclado mostra anel de foco", semAnel.length === 0, semAnel.length + " sem anel");
  for (const g of aneis.slice(0, 12)) console.log("    - " + g.menor.caminho);
  const vis = agrupe(foraDaJanela.map((s) => ({ caminho: s.tela + " :: " + s.descricao })));
  ok("o foco nunca para em elemento invisivel ou fora da janela", foraDaJanela.length === 0, foraDaJanela.length + " caso(s)");
  for (const g of vis.slice(0, 8)) console.log("    - " + g.menor.caminho);

  console.log("== 3) navegação por teclado: Enter faz o que o controle promete ==");
  {
    const pagina = await abra(browser);
    await vaPara(pagina, "/app", { pronto: ".admin-nav-item" });
    await pagina.evaluate(() => document.querySelectorAll(".admin-nav-item")[1].focus());
    const focado = await pagina.evaluate(() => (document.activeElement.textContent || "").trim());
    await pagina.keyboard.press("Enter");
    await pagina.waitForFunction(() => location.pathname !== "/app", { timeout: 20000 }).catch(() => undefined);
    await espera(600);
    const paraOndeFoi = await pagina.evaluate(() => location.pathname);
    ok("Enter num item de menu focado troca de rota", paraOndeFoi !== "/app", focado + " -> " + paraOndeFoi);
    await pagina.close();
  }
  {
    const pagina = await abra(browser, { largura: 360, altura: 640 });
    await vaPara(pagina, "/app", { pronto: ".admin-toggle" });
    await pagina.click(".admin-toggle");
    await espera(400);
    const abertaAntes = await pagina.evaluate(() =>
      document.querySelector(".admin-shell").classList.contains("is-sidebar-open"),
    );
    await pagina.keyboard.press("Escape");
    await espera(500);
    const abertaDepois = await pagina.evaluate(() =>
      document.querySelector(".admin-shell").classList.contains("is-sidebar-open"),
    );
    ok("Escape fecha a gaveta aberta pelo teclado", abertaAntes === true && abertaDepois === false,
      String(abertaAntes) + " -> " + String(abertaDepois));
    await pagina.close();
  }
  {
    const pagina = await abra(browser);
    await vaPara(pagina, "/app/configuracoes", { pronto: ".nx-tab" });
    const quantas = await pagina.evaluate(() => document.querySelectorAll(".nx-tab").length);
    await pagina.evaluate(() => {
      const abas = document.querySelectorAll(".nx-tab");
      (abas[1] || abas[0]).focus();
    });
    await pagina.keyboard.press("Enter");
    await espera(500);
    const selecionada = await pagina.evaluate(() => {
      const ativa = document.querySelector('.nx-tab[aria-selected="true"]');
      return ativa ? (ativa.textContent || "").trim() : "";
    });
    ok("Enter/Space numa aba seleciona a aba", quantas >= 2 && selecionada.length > 0,
      quantas + " abas, ativa: \"" + selecionada.slice(0, 30) + "\"");
    await pagina.close();
  }
  {
    const pagina = await abra(browser);
    await vaPara(pagina, "/app/clientes", { pronto: "button" });
    const alvos = await pagina.evaluate(() => {
      const b = Array.from(document.querySelectorAll(".admin-content button")).find(
        (x) => /novo|cadastrar|adicionar/i.test((x.innerText || "").trim()),
      );
      if (!b) return null;
      b.focus();
      return (b.innerText || "").trim();
    });
    ok("a tela tem um botao de criar para acionar pelo teclado", Boolean(alvos), alvos || "nenhum");
    if (alvos) {
      await pagina.keyboard.press("Enter");
      await pagina.waitForSelector(".nx-modal", { timeout: 10000 }).catch(() => undefined);
      const modal = await pagina.evaluate(() => {
        const m = document.querySelector(".nx-modal");
        return m ? { rotulo: (m.getAttribute("aria-label") || m.getAttribute("aria-labelledby") || "").trim(), titulo: (m.querySelector("h2,h3,.nx-modal-titulo") || {}).textContent || "" } : null;
      });
      ok("Enter abriu o dialog pelo teclado", Boolean(modal), modal ? String(modal.titulo || modal.rotulo).trim().slice(0, 40) : "nada");
      await pagina.keyboard.press("Escape");
      await espera(500);
      const fechado = await pagina.evaluate(() => document.querySelector(".nx-modal") === null);
      ok("Escape fecha o dialog aberto pelo teclado", fechado, String(fechado));
    }
    await pagina.close();
  }

  console.log("== 4) prefers-reduced-motion ==");
  for (const caminho of ["/", "/app"]) {
    const pagina = await abra(browser);
    await vaPara(pagina, caminho);
    const normal = await pagina.evaluate(leMovimento);
    await pagina.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await espera(300);
    const reduzido = await pagina.evaluate(leMovimento);
    ok(
      "com no-preference a tela " + caminho + " tem animacao para medir",
      normal.total > 0,
      normal.total + " nos animados, " + normal.girando + " girando, " + normal.transicionando + " transicionando",
    );
    ok(
      "com reduce a tela " + caminho + " para de se mexer",
      reduzido.girando === 0 && reduzido.transicionando === 0,
      reduzido.girando + " girando, " + reduzido.transicionando + " transicionando",
    );
    ok("com reduce a rolagem suave tambem desliga", reduzido.rolagemSuave !== "smooth", reduzido.rolagemSuave);
    medida("no-preference em " + caminho, JSON.stringify(normal.exemplo.slice(0, 3)));
    await pagina.close();
  }

  console.log("");
  console.log("telas varridas: " + TELAS.length + " | controles lidos: " + resumo.controles);
  console.log(verificacoes + " verificacoes, " + falhas + " falhas");
  await browser.close();
  if (falhas) {
    console.log("falhou: acessibilidade minima da F5");
    process.exit(1);
  }
  console.log("ok: rotulo, foco, teclado, alvo de toque e movimento reduzido medidos no navegador");
}

main().catch((e) => {
  console.error("falha: " + (e && e.message ? e.message : e));
  process.exit(1);
});
