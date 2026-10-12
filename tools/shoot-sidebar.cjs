const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", EMAIL_ADMIN);
  await page.type("input[type=password]", SENHA_ADMIN);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await page.waitForSelector(".kpi-grid", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: "docs/screenshots/03-dashboard.png" });
  await browser.close();
  console.log("ok");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
