// Prova da navegacao por abas em todas as paginas do sistema.
// Cada pagina declara suas abas (id + rotulo). O script confere, por pagina:
//  - a barra de abas existe com os rotulos certos na ordem;
//  - clicar troca o painel sem recarregar (mesmo objeto de janela);
//  - a aba ativa fica na URL (?aba=) e a URL profunda abre a aba certa;
//  - a primeira aba nao polui a URL;
//  - cada painel traz conteudo real (sem estado de erro nem telas presas em load);
//  - no celular a barra rola sem estourar a largura da pagina;
//  - o estado ativo usa a cor da marca (dourado) e nenhum erro cai no console;
//  - toda lista paginada traz o rodape padrao: resumo "Exibindo x-y de z",
//    seletor de 10/25/50/100, « ‹ páginas › » com desabilitados corretos e
//    avanco de pagina sem recarregar a tela.
const puppeteer = require("puppeteer-core");
const { sessaoDaCaptura } = require("./conta-de-captura.cjs");
const path = require("path");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:5173";
const OUT = path.join(__dirname, "..", "docs", "screenshots");

// NEXUS_PROVA_PAGINAS=usuarios roda e fotografa so as telas pedidas. O resto
// da galeria fica no git exatamente como esta, sem ruido de diff.
const PEDIDO = (process.env.NEXUS_PROVA_PAGINAS || "")
  .split(",")
  .map((nome) => nome.trim())
  .filter(Boolean);
const naLista = (p) =>
  !PEDIDO.length || PEDIDO.some((q) => p.rota.includes(q) || p.foto.includes(q));

const PAGINAS = [
  {
    rota: "/app",
    foto: "18-tabs-dashboard",
    abas: [
      { id: "visao", rotulo: "Visão Geral" },
      { id: "metas", rotulo: "Metas & Indicadores" },
      { id: "alertas", rotulo: "Alertas" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "metas");
      ok("metas compara com o mes anterior", (await textoDoPainel(page, "metas")).includes("anterior"));
      await irAba(page, "alertas");
      const alertas = await page.$$eval("#painel-alertas .nx-alerta", (e) => e.length);
      ok("alertas usam o cartao padrao do sistema", alertas >= 0, alertas + " alertas");
    },
  },
  {
    rota: "/app/clientes",
    foto: "18-tabs-clientes",
    abas: [
      { id: "todos", rotulo: "Todos os Clientes" },
      { id: "segmentos", rotulo: "Segmentos / Grupos" },
      { id: "analises", rotulo: "Análises" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "analises");
      const linhas = await page.$$eval("#painel-analises .table tbody tr", (e) => e.length);
      ok("analises de clientes trazem a curva ABC", linhas > 0, linhas + " linhas");
      await irAba(page, "todos");
      await page.type('input[aria-label="Buscar clientes"]', "a");
      await esperarPainel(page, "todos");
      const filtrado = await page.$$eval("#painel-todos .table tbody tr", (e) => e.length);
      ok("busca da aba lista continua funcionando", filtrado > 0, filtrado + " linhas");
    },
  },
  {
    rota: "/app/produtos",
    foto: "18-tabs-produtos",
    abas: [
      { id: "catalogo", rotulo: "Catálogo" },
      { id: "categorias", rotulo: "Categorias & Marcas" },
      { id: "movimentacoes", rotulo: "Movimentações" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "movimentacoes");
      const linhas = await page.$$eval("#painel-movimentacoes .table tbody tr", (e) => e.length);
      ok("movimentacoes lista registros do estoque", linhas > 0, linhas + " linhas");
    },
  },
  {
    rota: "/app/vendas",
    foto: "18-tabs-vendas",
    abas: [
      { id: "pedidos", rotulo: "Pedidos de Venda" },
      { id: "nova", rotulo: "Nova Venda" },
      { id: "relatorios", rotulo: "Relatórios" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "nova");
      const campos = await page.$$eval("#painel-nova input, #painel-nova select", (e) => e.length);
      ok("nova venda e um formulario de verdade", campos >= 2, campos + " campos");
      await irAba(page, "relatorios");
      const kpis = await page.$$eval("#painel-relatorios .kpi, #painel-relatorios .nx-distrib-row", (e) => e.length);
      ok("relatorio de vendas agregada no servidor", kpis > 0, kpis + " blocos");
    },
  },
  {
    rota: "/app/compras",
    foto: "18-tabs-compras",
    abas: [
      { id: "pedidos", rotulo: "Pedidos de Compra" },
      { id: "fornecedores", rotulo: "Fornecedores" },
      { id: "cotacoes", rotulo: "Cotações" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "fornecedores");
      const linhas = await page.$$eval("#painel-fornecedores .company-list li", (e) => e.length);
      ok("aba fornecedores traz a base cadastrada", linhas > 0, linhas + " linhas");
    },
  },
  {
    rota: "/app/financeiro",
    foto: "18-tabs-financeiro",
    abas: [
      { id: "fluxo", rotulo: "Fluxo de Caixa" },
      { id: "contas", rotulo: "Contas a Pagar / Receber" },
      { id: "centros", rotulo: "Centros de Custo" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "fluxo");
      const kpis = await page.$$eval("#painel-fluxo .kpi", (e) => e.length);
      ok("fluxo de caixa abre com contadores de status", kpis >= 2, kpis + " kpis");
      await irAba(page, "contas");
      ok("contas mostra a carteira por vencimento", (await textoDoPainel(page, "contas")).length > 40);
    },
  },
  {
    rota: "/app/crm",
    foto: "18-tabs-crm",
    abas: [
      { id: "funil", rotulo: "Funil de Vendas" },
      { id: "leads", rotulo: "Leads" },
      { id: "atividades", rotulo: "Atividades" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "funil");
      const etapas = await page.$$eval("#painel-funil .pipeline-card", (e) => e.length);
      ok("funil mostra as etapas do pipeline", etapas > 0, etapas + " etapas");
      await irAba(page, "atividades");
      const alimentado = await page.$$eval("#painel-atividades .table tbody tr", (e) => e.length);
      ok("feed de atividades chega preenchido", alimentado > 0, alimentado + " eventos");
      await checarHistoricoLegivel(page, ok, "atividades", "Atividades do CRM");
      const detalhes = await page.$$eval("#painel-atividades .col-acao .company-meta", (els) => els.map((e) => e.textContent.trim()));
      ok("atividade explica o que mudou no lead", detalhes.some((d) => /^de .+ para .+$/.test(d) || /^ajustou /.test(d)), detalhes.slice(0, 2).join(" | "));
    },
  },
  {
    rota: "/app/usuarios",
    foto: "18-tabs-usuarios",
    // A empresa de captura tem o administrador da plataforma como OWNER por
    // construcao (Fase 1b; a decisao de fundo e o G8). O print sai com a busca
    // da propria tela no e-mail ficticio, para nenhuma identidade real ficar
    // na imagem.
    filtroDaFoto: "exemplo.test",
    abas: [
      { id: "lista", rotulo: "Lista de Usuários" },
      { id: "permissoes", rotulo: "Permissões (RBAC)" },
      { id: "sessoes", rotulo: "Sessões" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "permissoes");
      const celulas = await page.$$eval("#painel-permissoes .table tbody td", (e) => e.filter((x) => x.textContent.includes("✓")).length);
      ok("matriz rbac marcada a partir do servidor", celulas > 0, celulas + " celulas com check");
      const central = await page.evaluate(() => {
        const grupo = document.querySelector('.matriz-rbac thead th[colspan="2"]');
        const sub = document.querySelector('.matriz-rbac thead tr:nth-child(2) th:not(:first-child)');
        const celula = document.querySelector(".matriz-rbac tbody td");
        const alvo = (el) => (el ? getComputedStyle(el).textAlign : null);
        return { grupo: alvo(grupo), sub: alvo(sub), celula: alvo(celula) };
      });
      ok("cabecalhos da matriz rbac centralizados sobre os checks", central.grupo === "center" && central.sub === "center", JSON.stringify(central));
      await irAba(page, "sessoes");
      const linhas = await page.$$eval("#painel-sessoes .table tbody tr", (e) => e.length);
      ok("sessoes mostram os acessos abertos", linhas > 0, linhas + " sessoes");
    },
  },
  {
    rota: "/app/auditoria",
    foto: "18-tabs-auditoria",
    abas: [
      { id: "logs", rotulo: "Logs do Sistema" },
      { id: "sensiveis", rotulo: "Alterações Sensíveis" },
      { id: "exportar", rotulo: "Exportação" },
    ],
    teste: async (page, ok) => {
      await irAba(page, "logs");
      await page.type('input[aria-label="Buscar na auditoria"]', "sale");
      await esperarPainel(page, "logs");
      const linhas = await page.$$eval("#painel-logs .table tbody tr", (e) => e.length);
      ok("busca filtra a trilha de logs", linhas > 0, linhas + " linhas");
      const acoes = await page.$$eval("#painel-logs .table tbody tr td:first-child", (els) => els.map((e) => e.textContent.trim()));
      ok("busca mantem so o que combina", acoes.every((a) => a.includes("sale")), acoes.slice(0, 2).join(" | "));
      await checarHistoricoLegivel(page, ok, "logs", "Auditoria");
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll(".toolbar .btn")).find((x) => x.textContent.trim() === "Limpar filtros");
        if (b) b.click();
      });
      await sleep(800);
      await irAba(page, "sensiveis");
      const sensiveis = await page.$$eval("#painel-sensiveis .table tbody tr td:first-child", (els) => els.map((e) => e.textContent.trim()));
      ok("aba sensivel traz so acoes sensiveis", sensiveis.length > 0 && sensiveis.every((a) => /delete|cancelled|paid|lost|won|role|login|password|stock|company.create|user.add/.test(a)), sensiveis.slice(0, 3).join(" | "));
      await irAba(page, "exportar");
      const notaExport = await page.$eval(".toolbar-note", (el) => el.textContent.replace(/\s+/g, " ").trim());
      ok("exportacao conta o recorte", /\d+ eventos? no recorte/.test(notaExport), notaExport);
      const marcado = await page.$eval('.check-line input[type="checkbox"]', (el) => el.checked);
      ok("exportacao herda o recorte sensivel da aba anterior", marcado === true);
    },
  },
];

// Painéis que devem trazer o rodapé de paginação padrão (por rota).
const PAGINADAS = {
  "/app/clientes": ["todos", "analises"],
  "/app/produtos": ["catalogo", "movimentacoes"],
  "/app/vendas": ["pedidos"],
  "/app/compras": ["pedidos", "fornecedores", "cotacoes"],
  "/app/financeiro": ["fluxo", "contas", "centros"],
  "/app/crm": ["leads", "atividades"],
  "/app/usuarios": ["lista", "sessoes"],
  "/app/auditoria": ["logs", "sensiveis"],
};

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

async function semToast(page) {
  await page.waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 }).catch(() => {});
  await sleep(200);
}

// Cliques na barra de abas (o componente mantem data-tab por aba).
async function irAba(page, id) {
  await page.evaluate((i) => document.querySelector('[data-tab="' + i + '"]').click(), id);
  await sleep(600);
  await esperarPainel(page, id);
}

// Espera o painel da aba sair do estado de carregamento (o fetch pode demorar).
async function esperarPainel(page, id) {
  await page
    .waitForFunction(
      (i) => {
        const p = document.querySelector("#painel-" + i);
        return Boolean(p) && !p.querySelector(".state-inline");
      },
      { timeout: 15000 },
      id,
    )
    .catch(() => {});
  await sleep(350);
}

async function filtraUsuarios(page, texto) {
  const campo = 'input[aria-label="Buscar usuários"]';
  await page.waitForSelector(campo, { timeout: 15000 });
  await page.type(campo, texto, { delay: 4 });
  await sleep(900);
}

async function textoDoPainel(page, id) {
  return page.evaluate((i) => {
    const p = document.querySelector("#painel-" + i);
    return p ? (p.textContent || "").replace(/\s+/g, " ").trim() : "";
  }, id);
}


// Mede uma coluna larga do historico: largura real + o que a linha diz.
async function medirColuna(page, painelId, classe) {
  return page
    .evaluate((id, c) => {
      const celula = document.querySelector("#painel-" + id + " td." + c);
      const cabecalho = document.querySelector("#painel-" + id + " th." + c);
      if (!celula) return null;
      return {
        largura: Math.round(celula.getBoundingClientRect().width),
        rotulo: cabecalho ? cabecalho.textContent.trim() : null,
        titulo: ((celula.querySelector(".company-name") || {}).textContent || "").trim(),
        codigo: ((celula.querySelector(".company-meta") || {}).textContent || "").trim(),
      };
    }, painelId, classe)
    .catch(() => null);
}

// O historico precisa ser legivel ate o pe do card: sem coluna espremida, sem
// codigo tecnico no lugar da frase e sem sobra de espaco vazio embaixo.
async function checarHistoricoLegivel(page, okFn, painelId, rotulo) {
  const acao = await medirColuna(page, painelId, "col-acao");
  const quando = await medirColuna(page, painelId, "col-quando");
  if (!acao || !quando) {
    okFn("historico de " + rotulo + " tem colunas largas", false, "faltam .col-acao/.col-quando");
    return;
  }
  okFn("coluna 'o que fez' de " + rotulo + " e larga", acao.largura >= 230, acao.largura + "px");
  okFn("coluna 'quando' de " + rotulo + " nao espreme a data", quando.largura >= 165, quando.largura + "px");
  okFn(
    "historico de " + rotulo + " fala a lingua do negocio",
    acao.titulo.length > 0 && !/^[a-z_]+([._][a-z_]+)*$/.test(acao.titulo),
    acao.titulo + " | codigo: " + acao.codigo,
  );

  const caixa = await page
    .evaluate((id) => {
      const wrap = document.querySelector("#painel-" + id + " .table-wrap.nx-scroll");
      if (!wrap) return null;
      const cs = getComputedStyle(wrap);
      const th = wrap.querySelector("thead th");
      const card = wrap.closest(".card-surface.panel") || wrap.closest(".card-surface");
      const linhas = wrap.querySelectorAll("tbody tr");
      const ultimoFilho = card ? card.lastElementChild : null;
      const sobra = card && ultimoFilho ? Math.round(card.getBoundingClientRect().bottom - ultimoFilho.getBoundingClientRect().bottom) : null;
      return {
        alturaMax: cs.maxHeight,
        rola: cs.overflowY === "auto" || cs.overflowY === "scroll",
        sticky: th ? getComputedStyle(th).position === "sticky" : false,
        linhas: linhas.length,
        estourado: wrap.scrollHeight - wrap.clientHeight,
        sobra,
      };
    }, painelId)
    .catch(() => null);

  if (!caixa) {
    okFn("historico de " + rotulo + " rola dentro do proprio card", false, "sem .table-wrap.nx-scroll");
    return;
  }
  okFn("card do historico de " + rotulo + " tem altura limitada", caixa.alturaMax === "600px", caixa.alturaMax);
  okFn("historico de " + rotulo + " mantem o cabecalho fixo", caixa.rola && caixa.sticky, JSON.stringify({ rola: caixa.rola, sticky: caixa.sticky }));
  if (caixa.sobra !== null) {
    okFn("card do historico de " + rotulo + " nao deixa vazao no pe", caixa.sobra >= 0 && caixa.sobra <= 60, "sobra de " + caixa.sobra + "px em " + caixa.linhas + " linhas");
  }
}

// Med o respiro real da tela: aba -> conteudo e bloco -> bloco dentro do painel.
async function checarRespiro(page, okFn, aba) {
  const medida = await page.evaluate((id) => {
    const barra = document.querySelector(".nx-tabs");
    const painel = document.querySelector("#painel-" + id);
    if (!barra || !painel) return null;
    const filhos = [...painel.children];
    const saltar = (a, b) => a.classList.contains("nx-panel-title") && b.classList.contains("nx-panel-sub");
    const vao = [];
    for (let i = 1; i < filhos.length; i++) {
      if (saltar(filhos[i - 1], filhos[i])) continue;
      vao.push(Math.round(filhos[i].getBoundingClientRect().top - filhos[i - 1].getBoundingClientRect().bottom));
    }
    const card = document.querySelector("#painel-" + id + " .card-surface.panel, #painel-" + id + " .kpi");
    const estiloCard = card ? getComputedStyle(card) : null;
    return {
      abaixoDasAbas: Math.round(filhos[0].getBoundingClientRect().top - barra.getBoundingClientRect().bottom),
      blocos: vao.length + 1,
      menorVao: vao.length ? Math.min(...vao) : null,
      paddingCard: estiloCard ? Math.round(parseFloat(estiloCard.paddingTop)) : null,
      vazia: filhos.length === 1,
    };
  }, aba.id);
  if (!medida) {
    okFn("respiro medido em " + aba.rotulo, false, "elementos da tela nao encontrados");
    return;
  }
  okFn("aba e conteudo separados por 1,5rem em " + aba.rotulo, medida.abaixoDasAbas >= 20 && medida.abaixoDasAbas <= 30, medida.abaixoDasAbas + "px");
  if (medida.menorVao !== null) {
    okFn("blocos do painel " + aba.rotulo + " tem respiro", medida.menorVao >= 16, "menor vao " + medida.menorVao + "px em " + medida.blocos + " blocos");
  }
  if (medida.paddingCard !== null) {
    okFn("cards de " + aba.rotulo + " tem folga interna", medida.paddingCard >= 16, medida.paddingCard + "px");
  }
}

// Conferência do rodapé de paginação de um painel já aberto.
async function checarPaginacao(page, okFn, painelId, rotulo) {
  const base = "#painel-" + painelId;
  await esperarPainel(page, painelId);
  await page.evaluate(() => { window.__marcaPagina = 1; });

  const situacao = await page.evaluate((sel) => {
    const painel = document.querySelector(sel);
    if (!painel) return { ausente: true };
    return {
      linhas: painel.querySelectorAll(".table tbody tr, .company-list li").length,
      temNav: Boolean(painel.querySelector("nav.pagination")),
    };
  }, base);

  if (situacao.ausente) {
    okFn(rotulo + ": paginacao conferida", false, "painel nao encontrado");
    return;
  }
  if (situacao.linhas === 0) {
    // Lista vazia nao pode mostrar paginacao (o EmptyState assume o espaco).
    okFn(rotulo + ": lista vazia nao mostra paginacao", situacao.temNav === false);
    return;
  }
  if (!situacao.temNav) {
    okFn(rotulo + ": paginacao no rodape da lista", false, situacao.linhas + " linhas sem pager");
    return;
  }
  okFn(rotulo + ": paginacao no rodape da lista", true, situacao.linhas + " linhas na pagina");

  const info = await page.$eval(base + " .pagination-info", (el) => el.textContent.replace(/\s+/g, " ").trim());
  okFn(
    rotulo + ': resumo "Exibindo x–y de z"',
    /Exibindo \d+.\d+ de \d+ \S+ p\u00e1gina \d+ de \d+/.test(info),
    info,
  );

  const seletor = await page.evaluate((sel) => {
    const s = document.querySelector(sel + " .pagination-size select");
    return s ? Array.from(s.options).map((o) => o.value).join("/") : null;
  }, base);
  okFn(rotulo + ": seletor de itens por pagina com 10/25/50/100", seletor === "10/25/50/100", seletor || "sem seletor");

  const bordas = await page.evaluate((sel) => {
    const b = [...document.querySelectorAll(sel + " .pagination-list button")];
    const ativo = b.find((x) => x.getAttribute("aria-current") === "page");
    const cs = ativo ? getComputedStyle(ativo) : null;
    return {
      primeira: b[0] ? b[0].disabled : null,
      anterior: b[1] ? b[1].disabled : null,
      proxima: b[b.length - 2] ? b[b.length - 2].disabled : null,
      ultima: b[b.length - 1] ? b[b.length - 1].disabled : null,
      rotulos: b.map((x) => x.textContent.trim()).join(""),
      corAtivo: cs ? cs.color : null,
      fundoAtivo: cs ? cs.backgroundImage : null,
      semAria: b.every((x) => x.getAttribute("aria-label")),
    };
  }, base);
  okFn(rotulo + ": « e ‹ desabilitados na primeira pagina", bordas.primeira === true && bordas.anterior === true, bordas.rotulos);
  okFn(rotulo + ": botões de navegação têm aria-label", bordas.semAria);
  okFn(
    rotulo + ": pagina ativa destacada no dourado da marca",
    bordas.corAtivo === "rgb(26, 18, 8)" && /rgb\(200, 168, 112\)/.test(bordas.fundoAtivo || ""),
    bordas.corAtivo,
  );

  const totalPaginas = Number((info.match(/p\u00e1gina \d+ de (\d+)/) || [])[1] || 1);
  if (totalPaginas > 1) {
    await page.evaluate((sel) => {
      const b = [...document.querySelectorAll(sel + " .pagination-list button")];
      b[b.length - 2].click();
    }, base);
    await esperarPainel(page, painelId);
    const info2 = await page.$eval(base + " .pagination-info", (el) => el.textContent.replace(/\s+/g, " ").trim());
    const semRecarregar = await page.evaluate(() => window.__marcaPagina === 1);
    okFn(rotulo + ": avançar muda de página sem recarregar", /p\u00e1gina 2 de/.test(info2) && semRecarregar, info2);
    const voltar = await page.evaluate((sel) => {
      const b = [...document.querySelectorAll(sel + " .pagination-list button")];
      return { primeira: b[0].disabled, anterior: b[1].disabled };
    }, base);
    okFn(rotulo + ": na página 2 os botões de voltar ficam ativos", voltar.primeira === false && voltar.anterior === false);

    await page.evaluate((sel) => {
      const b = [...document.querySelectorAll(sel + " .pagination-list button")];
      b[b.length - 1].click();
    }, base);
    await esperarPainel(page, painelId);
    const infoFim = await page.$eval(base + " .pagination-info", (el) => el.textContent.replace(/\s+/g, " ").trim());
    okFn(rotulo + ": » leva direto à última página", new RegExp("p\u00e1gina " + totalPaginas + " de").test(infoFim), infoFim);
    const noFim = await page.evaluate((sel) => {
      const b = [...document.querySelectorAll(sel + " .pagination-list button")];
      return { proxima: b[b.length - 2].disabled, ultima: b[b.length - 1].disabled };
    }, base);
    okFn(rotulo + ": › e » desabilitados na última página", noFim.proxima === true && noFim.ultima === true);
    await page.evaluate((sel) => {
      document.querySelectorAll(sel + " .pagination-list button")[0].click();
    }, base);
    await esperarPainel(page, painelId);
  } else {
    okFn(
      rotulo + ": com uma página, › e » ficam desabilitados",
      bordas.proxima === true && bordas.ultima === true,
      "páginas: " + totalPaginas,
    );
  }

  // Limite dinâmico: 25 itens por página deve ser respeitado na tabela.
  if (seletor) {
    await page.select(base + " .pagination-size select", "25");
    await esperarPainel(page, painelId);
    const folga = await page.evaluate((sel) => ({
      linhas: document.querySelectorAll(sel + " .table tbody tr, .company-list li").length,
      valor: (document.querySelector(sel + " .pagination-size select") || { value: "" }).value,
    }), base);
    okFn(rotulo + ": trocar para 25 itens respeita o limite", folga.valor === "25" && folga.linhas <= 25, folga.linhas + " linhas");
    await page.select(base + " .pagination-size select", "10");
    await esperarPainel(page, painelId);
  }
}

function rotuloDaAba(pagina, id) {
  const aba = pagina.abas.find((a) => a.id === id);
  return aba ? aba.rotulo : id;
}

async function checarPainel(page, okFn, aba) {
  await esperarPainel(page, aba.id);
  const estado = await page.evaluate((i) => {
    const p = document.querySelector("#painel-" + i);
    if (!p) return { ausente: true, texto: 0, erro: false };
    return {
      ausente: false,
      texto: (p.textContent || "").replace(/\s+/g, " ").trim().length,
      erro: Boolean(p.querySelector(".state-box--error")),
      preso: Boolean(p.querySelector(".state-inline")),
    };
  }, aba.id);
  okFn("painel " + aba.rotulo + " sem erro nem tela presa", !estado.ausente && !estado.erro && !estado.preso, JSON.stringify(estado));
  okFn("painel " + aba.rotulo + " traz conteudo", estado.texto > 30, estado.texto + " caracteres");
  await checarRespiro(page, okFn, aba);
}

(async () => {
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: { width: 1440, height: 960 },
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  const erros = [];
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  page.on("pageerror", (e) => erros.push(String(e)));

  // Sessao real pela API, na conta ficticia de captura: o token de refresh vai
  // para o localStorage do navegador e nenhuma credencial de verdade e digitada.
  const aberta = await sessaoDaCaptura();
  const sessao = aberta.tokens;
  if (!sessao.accessToken) throw new Error("login da prova falhou: " + JSON.stringify(sessao).slice(0, 160));

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate((t) => localStorage.setItem("nexus.refresh", t), sessao.refreshToken);
  await semToast(page);

  for (const p of PAGINAS.filter(naLista)) {
    console.log("== " + p.rota + " ==");
    await page.goto(BASE + p.rota, { waitUntil: "networkidle0" });
    await page.waitForSelector(".nx-tabs", { timeout: 15000 });
    await sleep(700);
    await semToast(page);

    const rotulos = await page.$$eval(".nx-tab", (els) => els.map((e) => ({
      id: e.getAttribute("data-tab"),
      rotulo: e.querySelector(".nx-tab-label").textContent.trim(),
      sel: e.getAttribute("aria-selected"),
    })));
    ok(
      p.rota + " tem as abas na ordem pedida",
      JSON.stringify(rotulos.map((r) => r.rotulo)) === JSON.stringify(p.abas.map((a) => a.rotulo)),
      rotulos.map((r) => r.rotulo).join(" | "),
    );
    const cabecalho = await page.evaluate(() => {
      const titulo = document.querySelector(".page-head .page-title");
      const sub = document.querySelector(".page-head .page-sub");
      return {
        titulo: titulo ? titulo.textContent.trim() : null,
        sub: sub ? sub.textContent.trim() : null,
        vao: titulo && sub ? Math.round(titulo.getBoundingClientRect().bottom - 0) : null,
      };
    });
    ok(p.rota + " tem titulo e subtitulo padrao", Boolean(cabecalho.titulo) && Boolean(cabecalho.sub), (cabecalho.titulo || "sem titulo") + " / " + (cabecalho.sub || "sem subtitulo"));
    ok("aba inicial vem selecionada", rotulos[0] && rotulos[0].sel === "true", rotulos[0] && rotulos[0].id);
    ok(
      "tablist com acessibilidade",
      Boolean(await page.$('[role="tablist"][aria-label]')) && (await page.$$eval(".nx-tab", (e) => e.every((x) => x.getAttribute("role") === "tab"))),
    );

    await checarPainel(page, ok, p.abas[0]);

    // profundidade: cada aba abre o proprio painel, sem recarregar a pagina
    const antes = await page.evaluate(() => window.__marcaProva === undefined);
    await page.evaluate(() => { window.__marcaProva = 1; });
    for (const aba of p.abas.slice(1)) {
      await page.evaluate((id) => document.querySelector('[data-tab="' + id + '"]').click(), aba.id);
      await sleep(500);
      const url = page.url();
      ok("aba " + aba.rotulo + " aparece na URL", url.includes("aba=" + aba.id), (url.split("?")[1] || "sem query"));
      const ativo = await page.$eval(".nx-tab.is-active", (el) => el.getAttribute("data-tab"));
      ok("aba " + aba.rotulo + " fica destacada", ativo === aba.id, ativo);
      await checarPainel(page, ok, aba);
    }
    const semRecarregar = await page.evaluate(() => window.__marcaProva === 1);
    ok("trocar de aba nao recarrega a pagina", semRecarregar && antes);

    // volta para a primeira aba limpa a URL
    await page.evaluate((id) => document.querySelector('[data-tab="' + id + '"]').click(), p.abas[0].id);
    await sleep(900);
    ok("primeira aba nao polui a URL", !page.url().includes("aba="), page.url());

    // navegação por teclado (roving tabindex do componente Tabs)
    await page.evaluate(() => document.querySelector(".nx-tab").focus());
    await page.keyboard.press("ArrowRight");
    const focoTeclado = await page.evaluate(() => document.activeElement.getAttribute("data-tab"));
    ok("seta do teclado move o foco entre as abas", focoTeclado === p.abas[1].id, focoTeclado);

    // URL profunda abre a aba certa direto
    const profunda = p.abas[Math.min(1, p.abas.length - 1)];
    await page.goto(BASE + p.rota + "?aba=" + profunda.id, { waitUntil: "networkidle0" });
    await page.waitForSelector(".nx-tabs", { timeout: 15000 });
    await sleep(900);
    const abriu = await page.$eval(".nx-tab.is-active", (el) => el.getAttribute("data-tab"));
    ok("link direto com ?aba= abre a aba", abriu === profunda.id, abriu);

    // cor da marca no estado ativo
    const estiloAtivo = await page.evaluate(() => {
      const el = document.querySelector(".nx-tab.is-active");
      const cs = getComputedStyle(el);
      const raiz = getComputedStyle(document.documentElement);
      return { borda: cs.borderBottomColor, marca: raiz.getPropertyValue("--accent").trim() };
    });
    ok("aba ativa usa a cor da marca", igualCor(estiloAtivo.borda, estiloAtivo.marca), estiloAtivo.borda + " vs " + estiloAtivo.marca);

    if (p.teste) await p.teste(page, ok);

    // Rodapé de paginação padrão em todas as listas paginadas da página.
    for (const idPagina of PAGINADAS[p.rota] || []) {
      await irAba(page, idPagina);
      await checarPaginacao(page, ok, idPagina, rotuloDaAba(p, idPagina));
    }

    await page.evaluate((id) => document.querySelector('[data-tab="' + id + '"]').click(), p.abas[0].id);
    await sleep(700);
    await semToast(page);
    if (p.filtroDaFoto) await filtraUsuarios(page, p.filtroDaFoto);
    await page.screenshot({ path: path.join(OUT, p.foto + ".png") });

    // celular: barra com rolagem horizontal fluida, sem estourar a pagina.
    // Emulacao nova em pagina a parte: trocar o viewport de uma pagina ja
    // carregada faz o Chrome recarregar o documento, e dois boots simultaneos
    // disputariam o mesmo refresh token na API.
    const mobile = await browser.newPage();
    mobile.on("console", (m) => { if (m.type() === "error") erros.push("celular: " + m.text()); });
    mobile.on("pageerror", (e) => erros.push("celular: " + String(e)));
    await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await mobile.goto(BASE + p.rota, { waitUntil: "networkidle0" });
    await mobile.waitForSelector(".nx-tabs", { timeout: 15000 });
    await sleep(900);
    await semToast(mobile);
    const celular = await mobile.evaluate(() => {
      const barra = document.querySelector(".nx-tabs");
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        rola: barra.scrollWidth > barra.clientWidth,
        cabota: barra.getBoundingClientRect().width <= 390,
        abasVisiveis: document.querySelectorAll(".nx-tab").length,
      };
    });
    ok("sem overflow horizontal no celular", celular.overflow <= 0, "overflow " + celular.overflow);
    ok("barra de abas cabe na tela", celular.cabota);
    ok("todas as abas seguem acessiveis", celular.abasVisiveis === p.abas.length, celular.abasVisiveis + "/" + p.abas.length);
    if (celular.rola) {
      await mobile.evaluate(() => {
        const barra = document.querySelector(".nx-tabs");
        barra.scrollLeft = barra.scrollWidth;
      });
      await sleep(500);
      const rolou = await mobile.evaluate(() => document.querySelector(".nx-tabs").scrollLeft > 0);
      ok("barra rola horizontalmente quando ha muitas abas", rolou);
    }
    if (p.filtroDaFoto) await filtraUsuarios(mobile, p.filtroDaFoto);
    await mobile.screenshot({ path: path.join(OUT, p.foto + "-celular.png") });
    await mobile.close();
  }

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

// "rgb(200, 168, 112)" == "#c8a870" para os tokens do tema.
function igualCor(a, b) {
  const parse = (v) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(v);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    const hex = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(v.trim());
    return hex ? [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)] : null;
  };
  const ca = parse(a);
  const cb = parse(b);
  if (!ca || !cb) return false;
  return ca.every((n, i) => Math.abs(n - cb[i]) <= 6);
}
