// F6 (T5.1) — régua da topologia Docker: o banco não publica porta, a API não publica porta,
// e a única porta que existe no host é a do painel.
//
// Duas metades, e é preciso ler as duas:
//  A) estática — roda em qualquer máquina com o Docker CLI instalado. Lê o que o compose
//     declara (`docker compose config --format json`), os Dockerfiles e o .dockerignore. É a
//     parte que não depende de pilha de pé.
//  B) execução — só com a pilha de pé. Pergunta ao Docker quais portas aquele stack publicou
//     e bate no painel pela porta publicada, atravessando o proxy até o health da API. Se a
//     pilha não estiver lá, a ferramenta encerra dizendo qual comando falta, em vez de fechar
//     verde com a metade que rodou.
//
// Nenhum segredo é impresso aqui. O JSON do `compose config` contém valores de ambiente
// resolvidos, então este arquivo só imprime NOMES de serviço, chaves e números de porta —
// nunca o conteúdo de uma variável (regra §4 do contrato).
//
// O helper da pilha de prova entra nesta ferramenta por um motivo real: as portas que a
// topologia de produção não pode calçar são exatamente as duas casas medidas por ele — a do
// dono (dev) e a da prova. Ele é a fonte desses números, não este arquivo.

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { CASA, PROVA } = require("./pilha-de-prova.cjs");

const RAIZ = path.resolve(__dirname, "..");
let feitas = 0;
let falhas = 0;

function confere(sim, oQueDeVeria, detalhe) {
  if (sim) {
    feitas++;
    console.log("  ok  " + oQueDeVeria);
    return;
  }
  falhas++;
  console.log("  FALHA  " + oQueDeVeria + (detalhe === undefined ? "" : " | medido: " + String(detalhe).slice(0, 120)));
}

function portaDe(url) {
  return Number(new URL(url).port);
}
const PORTAS_DA_CASA = [portaDe(CASA.web), portaDe(CASA.api), portaDe(PROVA.web), portaDe(PROVA.api)];

function roda(cmd, args) {
  return execFileSync(cmd, args, { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

// baixa() é node:http com agent: false, e não fetch nativo, por um motivo medido nesta máquina:
// o undici do `fetch` deixa um socket keep-alive vivo quando o processo chama process.exit(), e o
// Node do Windows derruba o processo depois da última linha impressa —
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" com código de saída 127. Uma régua que
// mede "0 falhas" e devolve 127 é pior que uma régua vermelha: o portão não sabe em quem acreditar.
// Com agent: false a conexão é descartada antes de o processo encerrar.
function baixa(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { agent: false, timeout: 10000 }, (res) => {
      let corpo = "";
      res.setEncoding("utf8");
      res.on("data", (pedaco) => (corpo += pedaco));
      res.on("end", () => resolve({ codigo: res.statusCode, texto: corpo }));
    });
    req.on("timeout", () => req.destroy(new Error("a porta publicada nao respondeu em 10 s: " + url)));
    req.on("error", reject);
  });
}

async function main() {
  console.log("A) o que o compose declara, lido do proprio Docker");

  let pilha = null;
  let erroDoConfig = "";
  try {
    pilha = JSON.parse(roda("docker", ["compose", "config", "--format", "json"]));
  } catch (e) {
    // O compose responde com a lista de variáveis obrigatórias que faltam. Nomes, nunca valores.
    erroDoConfig = String(e.stdout || e.stderr || e.message).replace(/\r?\n/g, " / ").slice(0, 300);
  }

  if (!pilha) {
    confere(false, "docker compose config aceita o arquivo (as obrigatorias do .env estao preenchidas)", erroDoConfig);
    console.log("");
    console.log("FALHOU: " + falhas + " falha(s) em " + (feitas + falhas) + " verificacoes");
    console.log("Se a causa for o .env ausente: copie .env.docker.example para .env e preencha. Nenhuma credencial vai para o git.");
    process.exit(1);
  }

  const servicos = pilha.services || {};
  const nomes = Object.keys(servicos).sort();
  confere(nomes.join(",") === "api,migracoes,mysql,web", "a pilha tem os quatro servicos declarados (mysql, migracoes, api, web)", nomes.join(","));

  function portasPublicadas(servico) {
    const lista = (servico && servico.ports) || [];
    const saida = [];
    for (const p of lista) {
      if (typeof p === "string") {
        const pedacos = p.split(":");
        saida.push(Number(pedacos.length > 1 ? pedacos[pedacos.length - 2] : pedacos[0]));
      } else if (p && p.published !== undefined) {
        saida.push(Number(p.published));
      }
    }
    return saida.filter((n) => Number.isFinite(n) && n > 0);
  }

  const portasMysql = portasPublicadas(servicos.mysql);
  const portasApi = portasPublicadas(servicos.api);
  const portasWeb = portasPublicadas(servicos.web);

  confere(portasMysql.length === 0, "o mysql da pilha NAO publica porta nenhuma no host (nem 3306 nem outra)", JSON.stringify(portasMysql));
  confere(portasApi.length === 0, "a API nao publica porta no host: todo trafego dela entra pelo painel", JSON.stringify(portasApi));
  confere(portasWeb.length === 1, "o painel publica uma unica porta", JSON.stringify(portasWeb));

  const pisadas = PORTAS_DA_CASA.filter((p) => portasWeb.includes(p)).concat(portasWeb.filter((p) => p === 3306 || p === 80));
  confere(pisadas.length === 0, "a porta publicada nao calca as portas da casa real, da pilha de prova, nem o 80/3306 do host", JSON.stringify(pisadas));

  const imagemApi = fs.readFileSync(path.join(RAIZ, "Dockerfile.api"), "utf8");
  const imagemPainel = fs.readFileSync(path.join(RAIZ, "Dockerfile.web"), "utf8");
  const etapaServindo = imagemPainel.split(/FROM nginx/)[1] || "";
  const ignorados = fs
    .readFileSync(path.join(RAIZ, ".dockerignore"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  confere(/USER node/.test(imagemApi), "a imagem da API roda como usuario sem privilegio");
  confere(!/USER root/.test(imagemApi), "a imagem da API nao volta a ser root na etapa final");
  confere(/HEALTHCHECK/.test(imagemApi) && /HEALTHCHECK/.test(imagemPainel), "as duas imagens tem healthcheck proprio");
  confere(
    etapaServindo !== "" && !/npm|node_modules|COPY apps/.test(etapaServindo),
    "a imagem do painel e so nginx com o dist: nem Node, nem node_modules, nem fonte",
    etapaServindo.slice(0, 60)
  );
  for (const padrao of ["**/node_modules", "**/dist", ".env", "CREDENCIAIS.md", "docs", "tools"]) {
    confere(ignorados.includes(padrao), ".dockerignore deixa " + padrao + " fora do contexto de build", ignorados.join(" "));
  }

  const conf = fs.existsSync(path.join(RAIZ, "deploy", "nginx-painel.conf"))
    ? fs.readFileSync(path.join(RAIZ, "deploy", "nginx-painel.conf"), "utf8")
    : "";
  confere(conf !== "", "a configuracao do nginx existe e e um arquivo só", "deploy/nginx-painel.conf");
  confere(/proxy_pass http:\/\/api:3001/.test(conf), "o painel fala /api com a API pela rede interna, na mesma origem");
  confere(/client_max_body_size 1m/.test(conf), "o limite de corpo do nginx e o mesmo BODY_LIMIT_BYTES da API (1 MiB)");
  confere(/try_files \$uri \$uri\/ \/index\.html/.test(conf), "as rotas do painel tem fallback de SPA, senao o F5 em /app/clientes da 404");

  console.log("");
  console.log("B) a pilha de pe: o que o Docker publicou de verdade");

  let estado = "";
  try {
    estado = roda("docker", ["compose", "ps", "--format", "json"]);
  } catch {
    estado = "";
  }
  const linhas = estado
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (linhas.length === 0) {
    console.log("");
    console.log("NAO VERIFICADO: a pilha nao esta de pe. Rode `npm run docker:subir` (build + up) e reexecute esta ferramenta.");
    console.log(falhas === 0 ? "parte A: " + feitas + " verificacoes, 0 falhas" : "FALHOU: " + falhas + " falha(s) em " + (feitas + falhas) + " verificacoes");
    process.exit(2);
  }

  const porServico = {};
  for (const l of linhas) porServico[String(l.Service || l.Name || "").replace(/^.*_/g, "") || l.Name] = l;

  for (const nome of ["mysql", "api", "web"]) {
    const s = porServico[nome] || linhas.find((l) => String(l.Name || "").includes(nome));
    confere(!!s, "o servico " + nome + " esta na pilha", s ? String(s.Name) : "ausente");
    if (!s) continue;
    const estadoDoServico = String(s.Health || s.Status || "");
    confere(/healthy|running/i.test(estadoDoServico), "o servico " + nome + " passou no healthcheck", estadoDoServico);
  }

  const publicados = linhas.flatMap((l) => (l.Publishers || []).map((p) => Number(p.published || p.PublishedPort) || 0));
  confere(!publicados.includes(3306), "nenhum container desta pilha publica 3306 no host", JSON.stringify(publicados));
  confere(publicados.every((p) => !PORTAS_DA_CASA.includes(p)), "nenhuma porta publicada pertence a uma janela da casa", JSON.stringify(publicados));

  const portaDoPainel = portasWeb[0];
  try {
    const painel = await baixa("http://127.0.0.1:" + portaDoPainel + "/");
    confere(painel.codigo === 200 && /<div id="root">/.test(painel.texto), "o painel responde na porta publicada com o HTML do build", painel.codigo + " | " + painel.texto.length + " bytes");
    const saude = await baixa("http://127.0.0.1:" + portaDoPainel + "/api/health");
    let corpo = {};
    try {
      corpo = JSON.parse(saude.texto);
    } catch {
      corpo = {};
    }
    confere(saude.codigo === 200 && corpo.status === "ok" && corpo.db === "up", "a trilha inteira funciona pela unica porta publicada: painel -> nginx -> api -> mysql", saude.codigo + " | " + saude.texto);
  } catch (e) {
    confere(false, "o painel respondeu na porta publicada", String(e.message).slice(0, 120));
  }

  console.log("");
  console.log(falhas === 0 ? "ok: " + feitas + " verificacoes, 0 falhas" : "FALHOU: " + falhas + " falha(s) em " + (feitas + falhas) + " verificacoes");
  process.exit(falhas === 0 ? 0 : 1);
}

void main();
