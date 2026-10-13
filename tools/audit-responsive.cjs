// Auditoria de overflow horizontal: percorre telas publicas e administrativas
// em larguras moveis e aponta elementos que ultrapassam a viewport.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");
const BASE = "http://localhost:5173";

const WIDTHS = [360, 414, 768];
const PUBLIC = ["/", "/login", "/cadastro", "/recuperar-senha", "/rota-inexistente"];

async function login(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", EMAIL_ADMIN, { delay: 2 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 2 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });
}

(async () => {
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
  });

  for (const w of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: 800 });
    const offenders = async () => page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
          const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(".") : "";
          bad.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (cls ? "." + cls : "") + " [" + Math.round(r.left) + ".." + Math.round(r.right) + "]");
        }
      });
      return { scrollW: document.documentElement.scrollWidth, clientW: vw, bad: bad.slice(0, 12) };
    });

    const pages = [...PUBLIC];
    // Telas administrativas exigem sessao: loga uma vez por largura.
    await login(page);
    for (const p of ["/app", "/app/clientes", "/app/configuracoes", "/app/usuarios", "/app/auditoria"]) pages.push(p);

    for (const p of pages) {
      await page.goto(BASE + p, { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 600));
      const res = await offenders();
      const status = res.scrollW > res.clientW + 1 ? "OVERFLOW" : "ok";
      console.log(w + "px " + p + " -> " + status + " (scrollW=" + res.scrollW + " clientW=" + res.clientW + ")");
      if (res.bad.length) console.log("   ", res.bad.join(" | "));
    }
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
