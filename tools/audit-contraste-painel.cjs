// Auditoria de contraste do painel (F5, item N7).
//
// Percorre as 17 telas do painel nos dois temas e nas duas janelas que o prompt
// pede (360 x 640 e 1366 x 768), mede a razao de contraste WCAG de todo texto
// visivel contra o fundo realmente composto por tras dele, e aponta quem fica
// abaixo de 4,5:1 — 3:1 para texto grande, que e a regra da WCAG para 24px ou
// 18,66px em negrito.
//
// A medida acontece no navegador de verdade porque so o navegador resolve a
// cascata: um contraste calculado no papel nao vale como evidencia. Onde o texto
// e um degradê (color: transparent com background-clip: text), a medida usa a
// parada do degradê mais proxima do fundo — a pior situacao real daquela escrita.
//
// Roda com a conta ficticia do banco de prova (tools/senha-admin.cjs). Nenhuma
// senha e impressa em hipotese alguma.
const fs = require("fs");
const os = require("os");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const BASE = "http://localhost:5173";
const TEMAS = ["dark", "light"];
const JANELAS = [
  { rotulo: "1366x768", width: 1366, height: 768 },
  { rotulo: "360x640", width: 360, height: 640 },
];

// As 17 telas do painel, na ordem do menu lateral. /app e o Dashboard.
const TELAS = [
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
  ["/app/cms", "Editor da vitrine"],
  ["/app/notificacoes", "Notificacoes"],
  ["/app/rotinas", "Rotinas"],
  ["/app/auditoria-plataforma", "Auditoria da plataforma"],
];

// Roda dentro da pagina. Devolve { medidos, degrade, ruins: [...] }.
function medeContraste() {
  const ALVO_NORMAL = 4.5;
  const ALVO_GRANDE = 3.0;

  function cor(texto) {
    if (!texto) return null;
    const t = String(texto).trim();
    const m = t.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const partes = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
      const a = partes.length > 3 ? partes[3] : 1;
      return {
        r: partes[0] || 0,
        g: partes[1] || 0,
        b: partes[2] || 0,
        a: Number.isFinite(a) ? a : 1,
      };
    }
    const hex = t.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
      const n = parseInt(h.slice(0, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
    }
    return null;
  }

  // Compoe uma cor translucida sobre o fundo de baixo, do jeito que a tela faz.
  function compoe(cima, baixo) {
    if (!cima) return baixo;
    if (cima.a >= 1) return cima;
    if (!baixo) return { r: cima.r, g: cima.g, b: cima.b, a: 1 };
    const a = cima.a;
    return {
      r: Math.round(cima.r * a + baixo.r * (1 - a)),
      g: Math.round(cima.g * a + baixo.g * (1 - a)),
      b: Math.round(cima.b * a + baixo.b * (1 - a)),
      a: 1,
    };
  }

  // Tira do texto tudo que esta dentro de color-mix(...): la dentro mora um rgb()
  // com alpha, e cont-lo como se fosse uma parada opaca da faixa inventaria um
  // fundo que nao existe na tela.
  function semCorMisturada(texto) {
    let saida = "";
    let i = 0;
    while (i < texto.length) {
      const resto = texto.slice(i);
      if (/^color-mix\(/i.test(resto)) {
        let abre = 1;
        let j = i + "color-mix".length + 1;
        while (j < texto.length && abre > 0) {
          if (texto[j] === "(") abre++;
          if (texto[j] === ")") abre--;
          j++;
        }
        i = j;
        saida += " ";
        continue;
      }
      saida += texto[i];
      i++;
    }
    return saida;
  }

  function paradasDeGradiente(texto) {
    if (!/gradient\(/i.test(texto || "")) return [];
    const out = [];
    // No valor computado o navegador ja resolveu var() e os hex em rgb()/rgba(),
    // entao e so isso que uma parada de faixa pode ser.
    const re = /rgba?\([^)]+\)/gi;
    let m;
    while ((m = re.exec(semCorMisturada(texto)))) {
      const c = cor(m[0]);
      if (c) out.push(c);
    }
    return out;
  }

  // O fundo atras de uma escrita nem sempre e um so: um botao com degradê mostra
  // uma faixa de cores por tras do texto, e o que vale para a WCAG e a pior
  // combinacao possivel. Devolve todas as superficies compostas desta cadeia.
  function fundosDe(el, estiloDoNo) {
    const camadas = [];
    let atual = el;
    while (atual && camadas.length < 12) {
      camadas.push(atual);
      atual = atual.parentElement;
    }
    function aPartirDe(i) {
      if (i >= camadas.length) {
        // Fim da cadeia: vale o token de fundo da casa, que e o que a pessoa ve.
        const token = cor(getComputedStyle(document.documentElement).getPropertyValue("--bg"));
        return [token || { r: 0, g: 0, b: 0, a: 1 }];
      }
      const st = i === 0 ? estiloDoNo : getComputedStyle(camadas[i]);
      const solido = cor(st.backgroundColor);
      // Degradê recortado no texto (background-clip: text) e a propria letra, nao
      // uma superficie: ele nao pode ser contado como fundo de si mesmo.
      const recorte = /text/i.test(String(st.webkitBackgroundClip || st.backgroundClip || ""));
      const degradas = recorte ? [] : paradasDeGradiente(st.backgroundImage);
      const abaixo = aPartirDe(i + 1);
      const out = [];
      if (solido && solido.a > 0) for (const b of abaixo) out.push(compoe(solido, b));
      for (const d of degradas) for (const b of abaixo) out.push(compoe(d, b));
      if (out.length === 0) return abaixo;
      return out.slice(0, 24);
    }
    return aPartirDe(0);
  }

  // Texto em degradê (color: transparent + background-clip: text): a escrita e o
  // background-image do proprio no, entao a medida usa as paradas dele.
  function frentesPossiveis(s, tinta) {
    if (tinta && tinta.a > 0) return [tinta];
    return paradasDeGradiente(s.backgroundImage);
  }

  function luminancia(c) {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function razao(fundo, frente) {
    const a = luminancia(fundo);
    const b = luminancia(frente);
    const maior = Math.max(a, b);
    const menor = Math.min(a, b);
    return (maior + 0.05) / (menor + 0.05);
  }

  function visivel(el) {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    // Fora da janela nao e o que a pessoa esta vendo neste tamanho de tela.
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false;
    return true;
  }

  function caminho(el) {
    const partes = [];
    let atual = el;
    for (let i = 0; i < 3 && atual && atual !== document.body; i++) {
      let nome = atual.tagName.toLowerCase();
      const classe = typeof atual.className === "string" ? atual.className.trim().split(/\s+/)[0] : "";
      if (classe) nome += "." + classe.slice(0, 40);
      partes.unshift(nome);
      atual = atual.parentElement;
    }
    return partes.join(" > ");
  }

  function rgba(c) {
    return "rgb(" + c.r + ", " + c.g + ", " + c.b + ")";
  }

  // Componente inativo nao e texto que a pessoa precise ler: a WCAG 1.4.3 isenta
  // expressamente a escrita que faz parte de um componente de interface inativo
  // ("Text that is part of an inactive user interface component"). Um botao
  // desabilitado vem com opacidade 0,55 e cor propria do Bootstrap, e medir
  // aquilo contra o degrade do botao daria um numero que nenhuma pessoa ve como
  // conteudo. Ele sai da conta e entra no contador a parte do relatorio.
  function inativo(el) {
    if (el.disabled === true) return true;
    if (el.getAttribute && el.getAttribute("aria-disabled") === "true") return true;
    if (el.closest && el.closest("fieldset:disabled, [aria-disabled=\"true\"]")) return true;
    const classes = typeof el.className === "string" ? el.className : "";
    return /(^|\s)disabled(\s|$)/.test(classes);
  }

  const ruins = [];
  let medidos = 0;
  let degrade = 0;
  let inativos = 0;
  const vistos = new Set();

  for (const el of document.querySelectorAll("body *")) {
    if (/^(script|style|svg|path|noscript|link|meta)$/.test(el.tagName.toLowerCase())) continue;
    // So o texto direto do no: o mesmo texto de um pai seria medido de novo.
    const texto = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (!texto) continue;
    if (!visivel(el)) continue;
    if (inativo(el)) {
      inativos++;
      continue;
    }

    const s = getComputedStyle(el);
    const tamanho = parseFloat(s.fontSize) || 16;
    const peso = parseInt(s.fontWeight, 10) || 400;
    const grande = tamanho >= 24 || (tamanho >= 18.66 && peso >= 700);
    const alvo = grande ? ALVO_GRANDE : ALVO_NORMAL;

    const tinta = cor(s.color);
    const frentes = frentesPossiveis(s, tinta);
    if (frentes.length === 0) continue; // sem cor e sem degradê: nao e texto visivel
    const fundos = fundosDe(el, s);
    let tipo = "cor";
    if (!tinta || tinta.a === 0) {
      degrade++;
      tipo = "degrada";
    }
    // Pior caso: a menor razao entre qualquer tinta possivel e qualquer fundo
    // possivel desta cadeia. E a situacao real em que a pessoa consegue menos ler.
    let pior = null;
    for (const f of frentes) {
      for (const bd of fundos) {
        const frente = compoe(f, bd);
        const r = razao(bd, frente);
        if (!pior || r < pior.r) pior = { r, frente, fundo: bd };
      }
    }
    const r = pior.r;
    const frente = pior.frente;
    const fundo = pior.fundo;
    medidos++;
    if (r >= alvo) continue;

    const classes = typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "";
    const chave = classes + "|" + rgba(frente) + "|" + rgba(fundo) + "|" + tipo;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    ruins.push({
      chave,
      classes,
      caminho: caminho(el),
      tipo,
      texto: texto.slice(0, 60),
      tamanho: Math.round(tamanho * 10) / 10,
      peso,
      alvo,
      razao: Math.round(r * 100) / 100,
      frente: rgba(frente),
      fundo: rgba(fundo),
    });
  }
  return {
    medidos,
    degrade,
    inativos,
    ruins,
    tema: document.documentElement.getAttribute("data-theme"),
    bsTema: document.documentElement.getAttribute("data-bs-theme"),
  };
}

async function visita(browser, janela, tema, caminho) {
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e.message).slice(0, 120)));
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("nexus.theme", t);
    } catch {
      /* noop */
    }
  }, tema);
  await page.setViewport({ width: janela.width, height: janela.height });
  await page.goto(BASE + caminho, { waitUntil: "networkidle0", timeout: 45000 });
  // Da tempo para tabelas e graficos terminarem de pintar depois da renovacao
  // de sessao que todo carregamento faz.
  await new Promise((r) => setTimeout(r, 1200));
  const dentro = await page.evaluate(() => location.pathname.startsWith("/app"));
  if (!dentro) {
    await page.close();
    return { falha: "a tela nao abriu (sessao recusada)", caminho, tema, janela: janela.rotulo };
  }
  const atributos = await page.evaluate(() => ({
    tema: document.documentElement.getAttribute("data-theme"),
    bs: document.documentElement.getAttribute("data-bs-theme"),
  }));
  const resultado = await page.evaluate(medeContraste);
  await page.close();
  return {
    caminho,
    tema,
    janela: janela.rotulo,
    medidos: resultado.medidos,
    degrade: resultado.degrade,
    inativos: resultado.inativos,
    ruins: resultado.ruins,
    atributos,
    erros,
  };
}

(async () => {
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1366, height: 768 },
  });

  // Sessao montada uma sola vez: o refresh token fica no perfil do navegador e
  // cada pagina nova renova sozinha, como faz no uso de verdade.
  const semeadura = await browser.newPage();
  await semeadura.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await semeadura.waitForSelector("input[type=email]");
  await semeadura.type("input[type=email]", EMAIL_ADMIN, { delay: 2 });
  await semeadura.type("input[type=password]", SENHA_ADMIN, { delay: 2 });
  await semeadura.click(".neu-btn");
  await semeadura.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 25000 });
  await semeadura.close();

  let totalMedidos = 0;
  let totalInativos = 0;
  let totalDegradê = 0;
  const detalhes = [];
  // Contagem global: o mesmo par frente/fundo se repete em dezenas de nos, e e o
  // padrao que precisa de token corrigido, nao o no isolado.
  const padroes = new Map();

  for (const janela of JANELAS) {
    for (const tema of TEMAS) {
      for (const [caminho] of TELAS) {
        const r = await visita(browser, janela, tema, caminho);
        if (r.falha) {
          console.log("FALHA " + r.janela + " " + tema + " " + caminho + " :: " + r.falha);
          continue;
        }
        totalMedidos += r.medidos;
        totalInativos += r.inativos;
        totalDegradê += r.degrade;
        detalhes.push(r);
        const sincronia = r.atributos.tema === r.atributos.bs ? "ok" : "DESINCRONIZADO";
        console.log(
          "mede  " +
            r.janela.padEnd(8) +
            " " +
            tema.padEnd(5) +
            " " +
            caminho.padEnd(28) +
            String(r.medidos).padStart(5) +
            " textos, " +
            String(r.ruins.length).padStart(3) +
            " abaixo do alvo | atributos " +
            r.atributos.tema +
            "/" +
            r.atributos.bs +
            " " +
            sincronia +
            (r.erros.length ? " | erros: " + r.erros.join("; ") : ""),
        );
        for (const ruim of r.ruins) {
          const atual = padroes.get(ruim.chave) || {
            ocorrencias: 0,
            pior: Infinity,
            tema,
            tipo: ruim.tipo,
            classes: ruim.classes,
            frente: ruim.frente,
            fundo: ruim.fundo,
            tamanho: ruim.tamanho,
            peso: ruim.peso,
            alvo: ruim.alvo,
            exemplos: new Set(),
            telas: new Set(),
          };
          atual.ocorrencias += 1;
          atual.pior = Math.min(atual.pior, ruim.razao);
          if (atual.exemplos.size < 2) atual.exemplos.add(ruim.texto);
          atual.telas.add(caminho);
          padroes.set(ruim.chave, atual);
        }
      }
    }
  }

  await browser.close();

  const lista = [...padroes.values()].sort((a, b) => a.pior - b.pior);
  const totalRuins = lista.reduce((s, p) => s + p.ocorrencias, 0);

  console.log("");
  console.log("===== PADROES ABAIXO DO ALVO (" + lista.length + " pares de cor) =====");
  for (const p of lista) {
    console.log(
      p.pior.toFixed(2) +
        ":1 (alvo " +
        p.alvo +
        ") " +
        p.tema +
        " " +
        (p.tipo === "degrada" ? "DEGRADA " : "") +
        p.tamanho +
        "px/" +
        p.peso +
        "  ." +
        (p.classes || "(sem classe)") +
        "  frente " +
        p.frente +
        " sobre " +
        p.fundo +
        " | " +
        p.ocorrencias +
        " ocorrencia(s) em " +
        p.telas.size +
        " tela(s)" +
        " | ex: " +
        [...p.exemplos].join(" / "),
    );
  }

  console.log("");
  console.log("telas medidas: " + detalhes.length + " de " + JANELAS.length * TEMAS.length * TELAS.length);
  console.log("textos medidos: " + totalMedidos + " (sendo " + totalDegradê + " em degradê)");
  console.log("isentos por componente inativo (WCAG 1.4.3): " + totalInativos + " no(s)");
  console.log("abaixo do alvo: " + totalRuins + " nos, em " + lista.length + " pares de cor");

    fs.writeFileSync(
    path.join(os.tmpdir(), "contraste-detalhe.json"),
    JSON.stringify(detalhes, null, 1),
    "utf8",
  );
  console.log("detalhe por tela: contraste-detalhe.json");

  console.log(totalRuins === 0 ? "ok: todo texto do painel tem contraste >= 4,5:1" : "ha texto abaixo do alvo");
  if (totalRuins > 0) process.exitCode = 1;
})().catch((e) => {
  console.error("falha:", e.message);
  process.exit(1);
});
