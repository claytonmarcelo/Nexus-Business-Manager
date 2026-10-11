// Prova da vitrine montada pelo CMS: o conteúdo que a API serve é o conteúdo
// que aparece na tela, a paleta do editor pinta a página, as seções só entram
// quando existe cadastro, o aviso de cookies e o WhatsApp obedecem à
// configuração, os textos legais respeitam a publicação e o modo manutenção
// fecha o site com relógio, código de pulso e porta de volta.
//
// Tudo que a prova grava é marcado como "de exemplo" e é desfeito no fim: a
// vitrine volta a mostrar o padrão do produto (sem depoimento, sem métrica, sem
// banner inventados) antes do último screenshot.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.NEXUS_WEB || "http://localhost:5173";
const API = (process.env.NEXUS_API || "http://localhost:3001") + "/api";
const SHOTS = "docs/screenshots";

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
async function chame(metodo, caminho, corpo) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
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
  return { status: res.status, dados };
}

// ---------------------------------------------------------------- conteúdo
// Paleta diferente do padrão de propósito: se a tela continuar com as cores
// antigas, a prova pega que o editor não chegou na vitrine.
const CONFIG_PROVA = {
  headline: "Gestão empresarial com a cara do seu negócio",
  subheadline:
    "Herói, capacidades, depoimentos, métricas e dúvidas vêm do banco nesta página. " +
    "Trocar texto no editor troca a vitrine inteira, sem deploy.",
  cores: {
    fundo: "#101820",
    painel: "#1b2430",
    texto: "#f4f1ea",
    textoSuave: "#9aa5b1",
    marca: "#b8763f",
    destaque: "#d9a441",
    borda: "#2b3646",
  },
  hero: {
    eyebrow: "ERP SaaS · Multiempresa",
    ctaPrimario: "Entrar no sistema",
    rotaPrimario: "/login",
    ctaSecundario: "Criar minha empresa",
    rotaSecundario: "/cadastro",
    imagemUrl: "",
    overlay: 0.4,
    desfoque: 0,
  },
  seo: {
    titulo: "Nexus Business Manager — vitrine montada pelo CMS",
    descricao:
      "Página pública construída a partir do conteúdo cadastrado no CMS: herói, capacidades, " +
      "depoimentos, métricas, dúvidas e textos legais.",
    palavrasChave: "erp, multiempresa, vendas, estoque, financeiro",
    ogTitulo: "Nexus Business Manager",
    ogDescricao: "Gestão empresarial com a cara do seu negócio.",
    ogImagem: BASE + "/favicon-512.png",
    twitterCard: "summary_large_image",
    canonica: BASE + "/",
    robots: "index,follow",
  },
  whatsapp: {
    ativo: true,
    numero: "+55 11 90000-0000",
    mensagem: "Olá! Quero conhecer o Nexus Business Manager.",
    rotulo: "Falar no WhatsApp",
    posicao: "esquerda",
  },
  contact: {
    email: "contato@nexusbusiness.com.br",
    telefone: "(11) 4000-0000",
    endereco: "Rua das Indústrias, 120 — São Paulo/SP",
    horario: "Segunda a sexta, 9h às 18h",
  },
  social: {
    redes: [{ rede: "linkedin", rotulo: "LinkedIn", url: "https://example.org/linkedin" }],
  },
};

// Espelho dos *_PADRAO de apps/api/src/modules/cms/cms.service.ts. A prova
// termina aqui, e não no "estado anterior", porque o estado anterior pode ser
// texto deixado pela suíte de testes — e um print da vitrine jamais pode sair
// com "Headline auditado para o teste".
const CONFIG_PADRAO_PRODUTO = {
  headline: "Gestão empresarial com precisão e elegância",
  subheadline:
    "Clientes, produtos, vendas, estoque, finanças, CRM e agenda em um só lugar — um ambiente seguro, responsivo e com identidade própria, do balcão à nuvem.",
  cores: {
    fundo: "#0b0d10",
    painel: "#171b22",
    texto: "#f2ece4",
    textoSuave: "#a7adba",
    marca: "#c8a870",
    destaque: "#b05050",
    borda: "#2a313c",
  },
  hero: {
    eyebrow: "ERP SaaS multiempresa",
    ctaPrimario: "Acessar sistema",
    rotaPrimario: "/login",
    ctaSecundario: "Criar minha empresa",
    rotaSecundario: "/cadastro",
    imagemUrl: "",
    overlay: 0.55,
    desfoque: 0,
  },
  seo: {
    titulo: "Nexus Business Manager — ERP SaaS multiempresa",
    descricao:
      "Clientes, produtos, vendas, estoque, finanças, CRM e agenda em um só lugar, com isolamento por empresa e trilha de auditoria.",
    palavrasChave: "erp, saas, multiempresa, gestão empresarial, vendas, estoque, financeiro, crm",
    ogTitulo: "Nexus Business Manager",
    ogDescricao: "Gestão empresarial com precisão e elegância.",
    ogImagem: "",
    twitterCard: "summary_large_image",
    canonica: "",
    robots: "index, follow",
  },
  whatsapp: {
    ativo: false,
    numero: "",
    mensagem: "Olá! Quero conhecer o Nexus Business Manager.",
    rotulo: "Fale no WhatsApp",
    posicao: "direita",
  },
  contact: { email: "", telefone: "", endereco: "", horario: "" },
  social: { redes: [] },
  // Padrão do produto sem segredo pendurado: o pulso deixa de existir quando a
  // prova termina, senão ficaria um código válido parado no banco.
  manutencao: {
    ativa: false,
    mensagem: "Estamos ajustando o Nexus Business Manager. Voltamos em instantes.",
    previsao: "",
    previsaoEm: null,
    tokenPulso: "",
    ipsPermitidos: [],
  },
};

const ITENS_PROVA = [
  {
    kind: "FEATURE",
    title: "Capacidade de exemplo 1",
    body: "Espaço reservado: as capacidades reais entram pelo editor do CMS.",
    meta: { icone: "◈", rota: "/login" },
    order: 1,
  },
  {
    kind: "FEATURE",
    title: "Capacidade de exemplo 2",
    body: "Nenhum número de vitrine é inventado aqui.",
    meta: { icone: "▣" },
    order: 2,
  },
  {
    kind: "FEATURE",
    title: "Capacidade de exemplo 3",
    body: "Com conteúdo vazio a grade volta às quatro capacidades do produto.",
    meta: { icone: "❐" },
    order: 3,
  },
  {
    kind: "BANNER",
    title: "Destaque de exemplo",
    body: "Os banners publicados aparecem nesta faixa.",
    link: "/login",
    order: 1,
  },
  {
    kind: "TESTIMONIAL",
    title: "Depoimento de exemplo",
    body: "Espaço reservado: os depoimentos entram pelo CMS quando existirem.",
    author: "Conteúdo de exemplo",
    role: "Papel de exemplo",
    meta: { estrelas: 5, empresa: "Empresa de exemplo" },
    order: 1,
  },
  {
    kind: "METRIC",
    title: "Métrica de exemplo",
    body: "O formato vem do cadastro: moeda, número, porcentagem ou texto.",
    meta: { valor: 1234.5, formato: "moeda" },
    order: 1,
  },
  {
    kind: "FAQ",
    title: "Como o conteúdo chega na página?",
    body: "O site lê /api/public/landing, que devolve o que foi publicado no CMS.",
    order: 1,
  },
  {
    kind: "FAQ",
    title: "Dá para esconder uma seção?",
    body: "Basta desativar o item no editor: a âncora some do cabeçalho junto.",
    order: 2,
  },
];

const TERMOS_PROVA =
  "Termos de uso de exemplo da prova automatizada.\n\n" +
  "Este texto é escrito pelo script tools/verify-landing-cms.cjs para provar que a " +
  "página de documentos legais lê o que o CMS publica. No fim da prova o documento " +
  "volta ao estado anterior.";

async function captura(page, nome, largura = 1440, altura = 900) {
  await page.setViewport({ width: largura, height: altura, deviceScaleFactor: 1 });
  await espera(900);
  await page.screenshot({ path: `${SHOTS}/${nome}` });
  console.log("  [foto] " + nome);
}

async function abreVitrine(browser, { tema = "dark", limparStorage = true, ignorarErro = null } = {}) {
  const page = await browser.newPage();
  const erros = [];
  const anota = (texto) => {
    // A própria prova provoca chamadas que devem falhar (503 em modo
    // manutenção). Erro esperado não é defeito, mas só sai da conta quando o
    // padrão é declarado aqui — o resto continua valendo como falha.
    if (ignorarErro && ignorarErro.test(texto)) return;
    erros.push(texto);
  };
  page.on("console", (msg) => {
    if (msg.type() === "error") anota(msg.text());
  });
  page.on("pageerror", (err) => anota(String(err.message)));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  if (limparStorage) {
    await page.evaluate(() => {
      localStorage.removeItem("nexus.cookies-aviso");
      localStorage.removeItem("nexus.theme");
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: "networkidle0" });
  }
  if (tema === "light") {
    await page.evaluate(() => localStorage.setItem("nexus.theme", "light"));
    await page.reload({ waitUntil: "networkidle0" });
  }
  await page.waitForSelector(".landing", { timeout: 15000 });
  await espera(1100);
  return { page, erros };
}

// Remove os itens que esta prova cria, título por título, e devolve quantos
// foram removidos nesta passada. Serve para três momentos — antes, depois e no
// finally — porque item de exemplo pendurado na vitrine real é o pior efeito
// colateral de uma corrida quebrada no meio.
const TITULOS_DE_PROVA = ITENS_PROVA.map((item) => item.title);

async function limparItensDeProva(momento) {
  let removidos = 0;
  for (const kind of ["BANNER", "FEATURE", "TESTIMONIAL", "METRIC", "FAQ"]) {
    const lista = await chame("GET", "/cms/items?kind=" + kind);
    const dados = Array.isArray(lista.dados?.data) ? lista.dados.data : [];
    for (const item of dados) {
      if (!TITULOS_DE_PROVA.includes(item.title)) continue;
      const apagado = await chame("DELETE", "/cms/items/" + item.id);
      if (apagado.status === 200) {
        removidos += 1;
        console.log("  [limpeza " + momento + "] removido: " + item.title);
      } else {
        ok("remover item pendurado (" + item.title + ")", false, "HTTP " + apagado.status);
      }
    }
  }
  return removidos;
}

(async () => {
  // ---- sessão de administração -------------------------------------------
  const login = await chame("POST", "/auth/login", { email: EMAIL_ADMIN, password: SENHA_ADMIN });
  if (login.status !== 200 || !login.dados.accessToken) {
    console.error("login do administrador falhou: " + login.status + " " + JSON.stringify(login.dados));
    process.exit(2);
  }
  token = login.dados.accessToken;
  console.log("== 0) Estado antes da prova ==");
  // Higiene primeiro: se uma corrida anterior quebrou no meio, sobra item de
  // exemplo no banco e a vitrine aparece duplicada — os checks passariam por
  // acaso e o print sairia errado. Remover antes também deixa a prova idempotente.
  await limparItensDeProva("antes da prova");
  const configAntes = await chame("GET", "/cms/config");
  ok("config atual lida antes de mexer", configAntes.status === 200, "HTTP " + configAntes.status);
  const legaisAntes = await chame("GET", "/cms/legal");
  const termosAntes = (legaisAntes.dados.data || []).find((d) => d.kind === "TERMS");

  // ---- grava o conteúdo de prova -----------------------------------------
  const salvo = await chame("PATCH", "/cms/config", CONFIG_PROVA);
  ok("PATCH /cms/config aceito", salvo.status === 200, "HTTP " + salvo.status);

  const ids = [];
  for (const item of ITENS_PROVA) {
    const criado = await chame("POST", "/cms/items", item);
    if (criado.status === 201) ids.push(criado.dados.id);
    else ok("criar item " + item.kind, false, "HTTP " + criado.status + " " + JSON.stringify(criado.dados));
  }
  ok("itens de exemplo criados (" + ids.length + ")", ids.length === ITENS_PROVA.length);

  const publicado = await chame("PUT", "/cms/legal/TERMS", {
    title: "Termos de uso",
    content: TERMOS_PROVA,
    published: true,
  });
  ok("TERMOS publicado pelo CMS", publicado.status === 200 && publicado.dados.published === true);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    // ============================================================== 1) VITRINE
    const { page, erros } = await abreVitrine(browser);

    console.log("== 1) O texto do banco é o texto da tela ==");
    const titulo = await page.$eval(".landing-title", (el) => el.textContent.trim());
    ok("h1 é a headline do CMS", titulo === CONFIG_PROVA.headline, titulo);
    const sub = await page.$eval(".landing-subtitle", (el) => el.textContent.trim());
    ok("subtítulo é a subheadline do CMS", sub === CONFIG_PROVA.subheadline, sub.slice(0, 40));
    const eyebrow = await page.$(".landing-eyebrow");
    ok("eyebrow do herói aparece", Boolean(eyebrow));
    const cta = await page.$$eval(".landing-cta-row a", (els) =>
      els.map((e) => ({ texto: e.textContent.trim(), href: e.getAttribute("href") })),
    );
    ok("dois chamados do herói", cta.length === 2, cta.map((c) => c.texto).join(" | "));
    ok(
      "chamados apontam para /login e /cadastro",
      cta[0]?.href === "/login" && cta[1]?.href === "/cadastro",
      cta.map((c) => c.href).join(", "),
    );
    const emblema = await page.$(".landing-logo");
    ok("sem imagem cadastrada, o emblema animado continua", Boolean(emblema));
    ok("sem imagem, não existe camada de fundo", (await page.$(".landing-hero-bg")) === null);

    console.log("== 2) Paleta do editor pinta a vitrine ==");
    const vars = await page.evaluate(() => {
      const st = getComputedStyle(document.querySelector(".landing"));
      return {
        fundo: st.getPropertyValue("--bg").trim(),
        painel: st.getPropertyValue("--surface").trim(),
        texto: st.getPropertyValue("--text").trim(),
        accent: st.getPropertyValue("--accent").trim(),
        borda: st.getPropertyValue("--border").trim(),
      };
    });
    ok("--bg recebe a cor de fundo do CMS", vars.fundo === CONFIG_PROVA.cores.fundo, vars.fundo);
    ok("--surface recebe o painel", vars.painel === CONFIG_PROVA.cores.painel, vars.painel);
    ok("--text recebe o texto", vars.texto === CONFIG_PROVA.cores.texto, vars.texto);
    ok("--accent recebe o destaque", vars.accent === CONFIG_PROVA.cores.destaque, vars.accent);
    ok("--border recebe a borda", vars.borda === CONFIG_PROVA.cores.borda, vars.borda);

    console.log("== 3) Âncoras só para seção que existe ==");
    const ancora = await page.$$eval(".landing-nav a", (els) =>
      els.map((e) => ({ texto: e.textContent.trim(), href: e.getAttribute("href") })),
    );
    const esperadas = ["#recursos", "#sobre", "#depoimentos", "#faqs", "#contato"];
    ok(
      "cinco âncoras: recursos, sobre, depoimentos, dúvidas, contato",
      esperadas.every((h) => ancora.some((a) => a.href === h)),
      ancora.map((a) => a.href).join(" "),
    );
    ok("nada de âncora 'Preços' inventada", !ancora.some((a) => /preco/i.test(a.href + a.texto)));
    const idsReais = await page.evaluate(() =>
      ["recursos", "sobre", "depoimentos", "faqs", "contato"].map((id) =>
        Boolean(document.getElementById(id)),
      ),
    );
    ok("cada âncora aponta para uma seção na página", idsReais.every(Boolean), idsReais.join(","));

    console.log("== 4) Capacidades, destaques e métricas vindos do CMS ==");
    const cards = await page.$$eval("#recursos .feature-card h3", (els) => els.map((e) => e.textContent.trim()));
    ok("três capacidades cadastradas viram três cartões", cards.length === 3, cards.join(" | "));
    ok("cartões são os do CMS, não os fixos do código", cards[0] === "Capacidade de exemplo 1", cards[0]);
    const glifo = await page.$eval("#recursos .feature-icon", (el) => el.textContent.trim());
    ok("meta.icone usado no cartão", glifo === "◈", glifo);
    const linkCap = await page.$eval("#recursos .feature-link", (el) => el.getAttribute("href"));
    ok("meta.rota vira link na capacidade", linkCap === "/login", linkCap);
    const banners = await page.$$eval(".landing-banner h3", (els) => els.map((e) => e.textContent.trim()));
    ok("faixa de destaque com o banner publicado", banners.length === 1, banners.join(" | "));
    // O Intl do navegador separa "R$" do número com espaço indivisível (U+00A0);
    // a comparação normaliza o espaço, mas o texto na tela é o formatado.
    const metrica = await page.$eval(".landing-metricas strong", (el) => el.textContent.trim());
    ok(
      "métrica em formato moeda sai formatada em pt-BR",
      metrica.replace(/\u00a0/g, " ") === "R$ 1.234,50",
      JSON.stringify(metrica),
    );

    console.log("== 5) Depoimento, FAQ e contato ==");
    const estrelas = await page.$eval(".landing-estrelas", (el) => el.getAttribute("aria-label"));
    ok("estrelas do depoimento viram nota legível", estrelas === "5 de 5", estrelas);
    const autor = await page.$eval(".landing-depoimento figcaption strong", (el) => el.textContent.trim());
    ok("autor do depoimento", autor === "Conteúdo de exemplo", autor);
    const empresa = await page.$eval(".landing-depoimento figcaption span", (el) => el.textContent.trim());
    ok("empresa vem de meta", empresa.includes("Empresa de exemplo"), empresa);
    const faqs = await page.$$eval(".landing-faqs details", (els) => els.map((e) => ({
      aberto: e.open,
      titulo: e.querySelector("summary").textContent.trim(),
    })));
    ok("duas perguntas cadastradas", faqs.length === 2, faqs.map((f) => f.aberto).join(","));
    ok("primeira pergunta já aberta", faqs[0].aberto === true);
    ok("segunda fechada antes do clique", faqs[1].aberto === false);
    await page.click(".landing-faqs details:nth-of-type(2) summary");
    await espera(250);
    const abriu = await page.$eval(".landing-faqs details:nth-of-type(2)", (el) => el.open);
    ok("clique expande a resposta", abriu === true);
    const mail = await page.$eval('.landing-contato a[href^="mailto:"]', (el) => el.getAttribute("href"));
    ok("e-mail vira mailto", mail === "mailto:contato@nexusbusiness.com.br", mail);
    const tel = await page.$eval('.landing-contato a[href^="tel:"]', (el) => el.getAttribute("href"));
    ok("telefone vira tel só com dígitos", tel === "tel:1140000000", tel);
    const endereco = await page.evaluate(() => {
      const par = Array.from(document.querySelectorAll(".landing-contato-lista > div")).find(
        (d) => d.querySelector("dt")?.textContent.trim() === "Endereço",
      );
      return par?.querySelector("dd")?.textContent.trim() || "";
    });
    ok("endereço cadastrado aparece", endereco.includes("São Paulo"), endereco);
    const rede = await page.$eval(".landing-redes a", (el) => ({
      href: el.getAttribute("href"),
      target: el.target,
      rel: el.rel,
    }));
    ok("rede social abre em nova aba com rel", rede.target === "_blank" && /noopener/.test(rede.rel), rede.href);

    console.log("== 6) WhatsApp e aviso de cookies ==");
    const zap = await page.$eval(".landing-whatsapp", (el) => el.getAttribute("href"));
    ok("botão flutuante leva ao wa.me com o número", zap.startsWith("https://wa.me/5511900000000?text="), zap.slice(0, 44));
    const ladoZap = await page.$eval(".landing-whatsapp", (el) => el.className);
    ok("posição esquerda respeitada", /is-esquerda/.test(ladoZap), ladoZap);
    const cookies = await page.$(".landing-cookies");
    ok("aviso de cookies aparece na primeira visita", Boolean(cookies));
    const linkCookie = await page.$('.landing-cookies a[href="/legal/privacidade"]');
    ok("link de privacidade só aparece se o texto estiver publicado", linkCookie === null);
    await page.click(".landing-cookies button");
    await espera(300);
    ok("aviso some depois do Entendi", (await page.$(".landing-cookies")) === null);
    const guardado = await page.evaluate(() => localStorage.getItem("nexus.cookies-aviso"));
    ok("escolha fica gravada no navegador", guardado === "ciente", String(guardado));
    await page.reload({ waitUntil: "networkidle0" });
    await espera(900);
    ok("depois do reload o aviso não volta", (await page.$(".landing-cookies")) === null);

    console.log("== 7) SEO do documento vem do banco ==");
    const seoTela = await page.evaluate(() => ({
      titulo: document.title,
      descricao: document.querySelector('meta[name="description"]')?.content || "",
      robots: document.querySelector('meta[name="robots"]')?.content || "",
      ogImage: document.querySelector('meta[property="og:image"]')?.content || "",
      twitter: document.querySelector('meta[name="twitter:card"]')?.content || "",
      canonica: document.querySelector('link[rel="canonical"]')?.href || "",
    }));
    ok("document.title é o título do CMS", seoTela.titulo === CONFIG_PROVA.seo.titulo, seoTela.titulo.slice(0, 40));
    ok("meta description preenchida", seoTela.descricao === CONFIG_PROVA.seo.descricao, seoTela.descricao.slice(0, 32));
    ok("robots do cadastro", seoTela.robots === "index,follow", seoTela.robots);
    ok("og:image é a imagem cadastrada", seoTela.ogImage === CONFIG_PROVA.seo.ogImagem, seoTela.ogImage);
    ok("twitter:card cadastrado", seoTela.twitter === "summary_large_image", seoTela.twitter);
    ok("canonical aponta para a vitrine", seoTela.canonica === BASE + "/", seoTela.canonica);

    console.log("== 8) Herói com imagem, overlay e desfoque ==");
    const comImagem = await chame("PATCH", "/cms/config", {
      hero: { ...CONFIG_PROVA.hero, imagemUrl: BASE + "/favicon-512.png", overlay: 0.65, desfoque: 6 },
    });
    ok("config de imagem aceita", comImagem.status === 200, "HTTP " + comImagem.status);
    await page.reload({ waitUntil: "networkidle0" });
    await espera(1000);
    const camadas = await page.evaluate(() => {
      const fundo = document.querySelector(".landing-hero-bg");
      const veu = document.querySelector(".landing-hero-veil");
      const interno = document.querySelector(".landing-hero-inner");
      return {
        temFundo: Boolean(fundo),
        filtro: fundo ? getComputedStyle(fundo).filter : "",
        opacity: veu ? Number(getComputedStyle(veu).opacity) : -1,
        fundoZ: interno ? getComputedStyle(interno).zIndex : "",
        temEmblema: Boolean(document.querySelector(".landing-logo")),
      };
    });
    ok("camada de imagem entra com a URL cadastrada", camadas.temFundo);
    ok("desfoque aplicado só na camada de fundo", /blur\(6px\)/.test(camadas.filtro), camadas.filtro);
    ok("véu usa o overlay configurado", Math.abs(camadas.opacity - 0.65) < 0.02, String(camadas.opacity));
    ok("com imagem o emblema animado sai de cena", camadas.temEmblema === false);
    await chame("PATCH", "/cms/config", { hero: { ...CONFIG_PROVA.hero, imagemUrl: "" } });
    await page.reload({ waitUntil: "networkidle0" });
    await espera(900);
    ok("voltando sem imagem, o emblema volta", (await page.$(".landing-logo")) !== null);

    console.log("== 9) Documento legal publicado ==");
    const linkTermos = await page.$('.landing-footer-legais a[href="/legal/termos"]');
    ok("rodapé lista o termo publicado", linkTermos !== null);
    await page.click('.landing-footer-legais a[href="/legal/termos"]');
    await page.waitForSelector(".landing-legal article", { timeout: 12000 });
    await espera(700);
    const legal = await page.evaluate(() => ({
      url: window.location.pathname,
      h1: document.querySelector(".landing-legal h1")?.textContent.trim() || "",
      paragrafos: document.querySelectorAll(".landing-legal p").length,
      texto: document.querySelector(".landing-legal p")?.textContent.trim().slice(0, 40) || "",
    }));
    ok("URL amigável do documento", legal.url === "/legal/termos", legal.url);
    ok("título vem do banco", legal.h1 === "Termos de uso", legal.h1);
    ok("texto publicado dividido em parágrafos", legal.paragrafos >= 2, String(legal.paragrafos));
    ok("primeiro parágrafo é o que foi gravado", legal.texto.startsWith("Termos de uso de exemplo"), legal.texto);
    await captura(page, "19-legal-termos.png");
    await page.goBack();
    await page.waitForSelector(".landing", { timeout: 12000 });
    await espera(800);
    const caminhoFalso = await page.evaluate(() => window.location.origin + "/legal/nao-existe");
    await page.goto(caminhoFalso, { waitUntil: "networkidle0" });
    await espera(700);
    const erroLegal = await page.$eval(".state-box--error .state-desc", (el) => el.textContent.trim());
    ok("slug desconhecido diz que não existe", /não existe/i.test(erroLegal), erroLegal);

    console.log("== 10) Layout nos três tamanhos ==");
    await page.goto(BASE + "/", { waitUntil: "networkidle0" });
    await espera(900);
    for (const [largura, altura, nome] of [
      [1440, 900, "desktop"],
      [768, 1024, "tablet"],
      [390, 844, "celular"],
    ]) {
      await page.setViewport({ width: largura, height: altura, deviceScaleFactor: 1 });
      await espera(700);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      ok("sem arrasto horizontal em " + nome, overflow <= 1, "excesso " + overflow + "px");
    }
    const navNoCelular = await page.evaluate(() => {
      const nav = document.querySelector(".landing-nav");
      return nav ? getComputedStyle(nav).display : "ausente";
    });
    ok("no celular as âncoras recolhem", navNoCelular === "none", navNoCelular);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await espera(600);

    console.log("== 11) Vitrine nos dois temas ==");
    await captura(page, "19-landing-cms-dark.png");
    await page.evaluate(() => localStorage.setItem("nexus.theme", "light"));
    await page.reload({ waitUntil: "networkidle0" });
    await espera(1100);
    const claro = await page.evaluate(() => ({
      tema: document.documentElement.getAttribute("data-theme"),
      fundo: getComputedStyle(document.querySelector(".landing")).getPropertyValue("--bg").trim(),
    }));
    ok("tema claro escolhido pelo visitante", claro.tema === "light", claro.tema);
    ok("a paleta do CMS continua mandando na vitrine", claro.fundo === CONFIG_PROVA.cores.fundo, claro.fundo);
    await captura(page, "19-landing-cms-claro.png");
    await page.evaluate(() => {
      localStorage.removeItem("nexus.theme");
      localStorage.removeItem("nexus.cookies-aviso");
    });
    await page.reload({ waitUntil: "networkidle0" });
    await espera(900);
    await page.click(".landing-cookies button");
    await espera(300);
    await captura(page, "19-landing-cms-celular.png", 390, 844);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    ok("nenhum erro de console na vitrine", erros.length === 0, erros.slice(0, 2).join(" | "));
    await page.close();

    // ========================================================== 2) MANUTENÇÃO
    console.log("== 12) Modo manutenção ==");
    const previsao = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    const liga = await chame("PATCH", "/cms/config", {
      manutencao: {
        ativa: true,
        mensagem: "Estamos ajustando a vitrine. Voltamos em instantes.",
        previsao: "Previsão de volta",
        previsaoEm: previsao,
      },
    });
    ok("manutenção ligada pela API", liga.status === 200 && liga.dados.manutencao.ativa === true);

    const bloqueada = await chame("GET", "/clients");
    ok("rota de negócio devolve 503", bloqueada.status === 503, "HTTP " + bloqueada.status);
    ok(
      "503 traz mensagem e previsão",
      bloqueada.dados.message === "Estamos ajustando a vitrine. Voltamos em instantes." &&
        bloqueada.dados.previsaoEm === previsao,
      JSON.stringify(bloqueada.dados).slice(0, 80),
    );
    const publicaLivre = await chame("GET", "/public/landing");
    ok("/api/public continua aberto", publicaLivre.status === 200, "HTTP " + publicaLivre.status);
    const editorLivre = await chame("GET", "/cms/config");
    ok("/api/cms continua aberto (é por ali que se desliga)", editorLivre.status === 200, "HTTP " + editorLivre.status);
    const healthLivre = await fetch(API + "/health");
    ok("/api/health continua aberto", healthLivre.status === 200, "HTTP " + healthLivre.status);

    const { page: mpage, erros: mErros } = await abreVitrine(browser, { ignorarErro: /503/ });
    const telaManutencao = await mpage.evaluate(() => ({
      card: Boolean(document.querySelector(".manutencao-card")),
      titulo: document.querySelector(".manutencao-card h1")?.textContent.trim() || "",
      msg: document.querySelector(".manutencao-msg")?.textContent.trim() || "",
      relogio: document.querySelector(".manutencao-relogio strong")?.textContent.trim() || "",
      temCampo: Boolean(document.querySelector("#nx-pulso")),
      temVitrine: Boolean(document.querySelector(".landing-features")),
    }));
    ok("visitante vê a tela de manutenção", telaManutencao.card);
    ok("título da tela", telaManutencao.titulo === "Estamos ajustando o sistema", telaManutencao.titulo);
    ok("mensagem é a cadastrada", telaManutencao.msg.startsWith("Estamos ajustando a vitrine"), telaManutencao.msg);
    ok(
      "relógio conta regressiva em minutos e segundos",
      /^\d+h \d{2}min \d{2}s$|^\d{2}min \d{2}s$/.test(telaManutencao.relogio),
      telaManutencao.relogio,
    );
    ok("campo do código de pulso existe", telaManutencao.temCampo);
    ok("a vitrine não aparece por baixo", telaManutencao.temVitrine === false);
    await captura(mpage, "19-manutencao.png");

    await mpage.type("#nx-pulso", "000000000000000000");
    await mpage.click(".manutencao-bypass button[type=submit]");
    await espera(900);
    const negado = await mpage.$eval(".manutencao-erro", (el) => el.textContent.trim()).catch(() => "");
    ok("código errado avisa sem abrir o site", /não confere/i.test(negado), negado);
    ok("e a vitrine continua escondida", (await mpage.$(".landing-features")) === null);

    const novoPulso = await chame("POST", "/cms/maintenance/token");
    ok("token gerado com 18 caracteres", novoPulso.status === 200 && /^[0-9a-f]{18}$/.test(novoPulso.dados.token), novoPulso.dados.token);
    // O campo é controlado pelo React: escrever em el.value por fora não dispara
    // onChange e o estado continua com o código errado (a tentativa anterior
    // ficava colada no começo do texto novo). O setter nativo + input event é o
    // jeito de digitar num controlado sem depender de seleção de mouse.
    await mpage.evaluate((valor) => {
      const campo = document.querySelector("#nx-pulso");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(campo, valor);
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    }, novoPulso.dados.token);
    const valorCampo = await mpage.$eval("#nx-pulso", (el) => el.value);
    ok("o campo contém apenas o código novo", valorCampo === novoPulso.dados.token, valorCampo);
    await mpage.click(".manutencao-bypass button[type=submit]");
    const voltou = await mpage
      .waitForSelector(".landing-features", { timeout: 12000 })
      .then(() => true)
      .catch(() => false);
    await espera(400);
    // Se não voltar, o motivo mais útil é o aviso que ficou na tela (código
    // recusado, IP fora da lista) — sem isso a prova só diz "deu timeout".
    const motivo = voltou
      ? ""
      : await mpage.$eval(".manutencao-erro", (el) => el.textContent.trim()).catch(() => "sem aviso na tela");
    ok("código certo devolve a vitrine na mesma aba", voltou && (await mpage.$(".manutencao-card")) === null, motivo);
    const pulsoGuardado = await mpage.evaluate(() => {
      const chaves = Object.keys(sessionStorage);
      return { tem: chaves.some((k) => k.indexOf("nexus.pulso") >= 0), n: chaves.length };
    });
    ok("o pulso fica na aba, não no disco", pulsoGuardado.tem, chaves2Texto(pulsoGuardado.n));
    await mpage.reload({ waitUntil: "networkidle0" });
    await espera(900);
    ok("no reload da mesma aba o site continua aberto", (await mpage.$(".landing-features")) !== null);

    // O header enviado pelo navegador tem de liberar a API de negócio também.
    const chamadaAutenticada = await mpage.evaluate(async () => {
      const r = await fetch("/api/clients?pageSize=1", { headers: { "X-Nexus-Pulse": "SEM_TOKEN" } });
      return r.status;
    });
    ok("chamada de negócio com pulso errado no navegador cai em 503", chamadaAutenticada === 503, String(chamadaAutenticada));

    const liberadaPeloHeader = await fetch(API + "/clients", {
      headers: { Authorization: "Bearer " + token, "X-Nexus-Pulse": novoPulso.dados.token },
    });
    ok("com o pulso a API de negócio atende", liberadaPeloHeader.status === 200, "HTTP " + liberadaPeloHeader.status);

    ok("nenhum erro de console na manutenção", mErros.length === 0, mErros.slice(0, 2).join(" | "));
    await mpage.close();

    // ============================================================= 3) VOLTA
    console.log("== 13) Restauração do estado da vitrine ==");
    const desliga = await chame("PATCH", "/cms/config", {
      manutencao: { ativa: false, mensagem: "Voltamos em breve.", previsao: "", previsaoEm: null },
    });
    ok("manutenção desligada", desliga.status === 200 && desliga.dados.manutencao.ativa === false);

    await limparItensDeProva("fim da prova");
    ok("nenhum item de exemplo sobra na vitrine", (await limparItensDeProva("conferência")) === 0);

    await chame("PUT", "/cms/legal/TERMS", {
      title: termosAntes?.title || "Termos de uso",
      content: termosAntes?.content || "",
      published: Boolean(termosAntes?.published),
    });
    // Devolve ao padrão do produto (e não ao "estado antes", que pode ser
    // sobra da suíte de testes) antes do último screenshot.
    const restaura = await chame("PATCH", "/cms/config", CONFIG_PADRAO_PRODUTO);
    ok("config volta ao padrão do produto", restaura.status === 200, "HTTP " + restaura.status);
    const publicoDepois = await chame("GET", "/public/landing");
    ok(
      "a vitrine pública lê o padrão restaurado",
      publicoDepois.dados.headline === CONFIG_PADRAO_PRODUTO.headline &&
        publicoDepois.dados.cores.fundo === CONFIG_PADRAO_PRODUTO.cores.fundo,
      String(publicoDepois.dados.headline).slice(0, 40),
    );
    ok(
      "nenhum segredo de manutenção sobra ligado",
      publicoDepois.dados.manutencao.ativa === false,
      JSON.stringify(publicoDepois.dados.manutencao).slice(0, 60),
    );

    const { page: fpage, erros: fErros } = await abreVitrine(browser);
    const vazio = await fpage.evaluate(() => ({
      features: document.querySelectorAll("#recursos .feature-card").length,
      primeiro: document.querySelector("#recursos .feature-card h3")?.textContent.trim() || "",
      banners: document.querySelectorAll(".landing-banner").length,
      depoimentos: document.querySelectorAll(".landing-depoimento").length,
      metricas: document.querySelectorAll(".landing-metricas li").length,
      faqs: document.querySelectorAll(".landing-faqs details").length,
      nav: Array.from(document.querySelectorAll(".landing-nav a")).map((a) => a.getAttribute("href")),
      zap: Boolean(document.querySelector(".landing-whatsapp")),
      h1: document.querySelector(".landing-title")?.textContent.trim() || "",
    }));
    ok("sem capacidades no banco voltam as quatro do produto", vazio.features === 4, String(vazio.features));
    ok("e a primeira é a de segurança", vazio.primeiro === "Segurança em primeiro lugar", vazio.primeiro);
    ok("nenhum banner de exemplo sobrou", vazio.banners === 0);
    ok("nenhum depoimento inventado", vazio.depoimentos === 0);
    ok("nenhuma métrica inventada", vazio.metricas === 0);
    ok("nenhuma FAQ de exemplo", vazio.faqs === 0);
    ok(
      "âncoras encolhem para o que existe (recursos e sobre; contato padrão vazio)",
      vazio.nav.length === 2 && vazio.nav.join(",") === "#recursos,#sobre",
      vazio.nav.join(" "),
    );
    ok("WhatsApp some com o canal desligado", vazio.zap === false);
    ok("herói volta ao texto padrão", vazio.h1 === CONFIG_PADRAO_PRODUTO.headline, vazio.h1.slice(0, 40));
    ok("nenhum erro de console na vitrine restaurada", fErros.length === 0, fErros.slice(0, 2).join(" | "));
    await fpage.evaluate(() => {
      const b = document.querySelector(".landing-cookies button");
      if (b) b.click();
    });
    await espera(500);
    await captura(fpage, "01-landing.png");
    await fpage.close();
  } finally {
    await browser.close();
    // Última linha de defesa: se a prova quebrar no meio, o site não fica em
    // manutenção, não fica com conteúdo de exemplo e não fica com pulso pendurado.
    await limparItensDeProva("finally");
    try {
      await chame("PUT", "/cms/legal/TERMS", {
        title: termosAntes?.title || "Termos de uso",
        content: termosAntes?.content || "",
        published: Boolean(termosAntes?.published),
      });
    } catch {
      /* sem documento anterior para restaurar */
    }
    const limpa = await chame("PATCH", "/cms/config", CONFIG_PADRAO_PRODUTO);
    console.log(
      "estado final: config=" +
        (limpa.status === 200 ? "padrão restaurado" : "HTTP " + limpa.status) +
        ", manutenção ativa=" + (limpa.dados?.manutencao?.ativa ?? "?"),
    );
  }

  console.log("\n" + checks + " checagens, " + falhas.length + " falhas.");
  if (falhas.length > 0) {
    console.log(falhas.map((f) => " - " + f).join("\n"));
    process.exit(1);
  }
})().catch((err) => {
  console.error("prova interrompida:", err);
  process.exit(1);
});

function chaves2Texto(n) {
  return n + " chave(s) de sessão";
}
