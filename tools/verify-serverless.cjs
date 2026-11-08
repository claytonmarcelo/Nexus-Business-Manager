// Prova do caminho serverless: o `api/[...path].ts` que a Vercel executa
// respondendo de verdade.
//
// O que esta prova mede, e por que ela existe:
//   - o projeto anterior na Vercel foi removido por não funcionar por completo;
//     a causa era o `/api` cair na função errada, sem API e sem banco;
//   - aqui o handler real sobe num servidor HTTP local (o runtime da Vercel
//     entrega o mesmo par requisição/resposta do node) e responde de verdade.
//
// O que ela prova, item a item:
//   1. `/api/health` responde 200 e o banco responde — a Function monta o app e
//      fala com o banco, não só com o roteador;
//   2. uma rota que não existe responde 404 no formato do app (`NOT_FOUND`) —
//      quem respondeu foi o app, não um proxy;
//   3. `POST /api/auth/login` sem corpo responde 400 de validação — o parser de
//      corpo customizado sobrevive ao caminho cru da Function;
//   4. `GET /api/clients` sem sessão responde 401 — o gate de autenticação
//      está armado antes das rotas;
//   5. a resposta traz os cabeçalhos de segurança do helmet — os escudos
//      valem neste caminho também.
//
// A prova roda contra o BANCO DE PROVA (`DATABASE_URL_TESTE`), nunca contra o
// banco de desenvolvimento (decisão D6). Ela não escreve nada: as quatro
// requisições são de leitura e de recusa.
//
// Uso: node tools/verify-serverless.cjs

const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");
const CLI_TSX = path.join(RAIZ, "node_modules", "tsx", "dist", "cli.mjs");

function pedido(porta, metodo, caminho, corpo) {
  return new Promise((resolvePedido, rejectPedido) => {
    const dados = corpo === undefined ? null : Buffer.from(JSON.stringify(corpo));
    const req = http.request(
      {
        host: "127.0.0.1",
        port: porta,
        method: metodo,
        path: caminho,
        headers: dados
          ? { "content-type": "application/json", "content-length": dados.length }
          : {},
      },
      (res) => {
        const pedacos = [];
        res.on("data", (p) => pedacos.push(p));
        res.on("end", () => {
          const texto = Buffer.concat(pedacos).toString("utf8");
          let json = null;
          try {
            json = JSON.parse(texto);
          } catch {
            json = null;
          }
          resolvePedido({ status: res.statusCode, headers: res.headers, texto, json });
        });
      },
    );
    req.on("error", rejectPedido);
    if (dados) req.write(dados);
    req.end();
  });
}

function esperaPorta(linhas) {
  return new Promise((resolvePorta, rejectPorta) => {
    let acumulado = "";
    const timer = setTimeout(() => {
      rejectPorta(new Error("o servidor de prova não annonceou a porta a tempo"));
    }, 60000);
    linhas.on("data", (p) => {
      acumulado += p.toString("utf8");
      const achado = acumulado.match(/PRONTA (\d+)/);
      if (achado) {
        clearTimeout(timer);
        resolvePorta(Number(achado[1]));
      }
    });
    linhas.on("end", () => {
      clearTimeout(timer);
      rejectPorta(new Error("o servidor de prova terminou antes de anunciar a porta"));
    });
  });
}

async function main() {
  const filho = spawn(process.execPath, [CLI_TSX, path.join(RAIZ, "tools", "prova-serverless.ts")], {
    cwd: RAIZ,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let erroDoFilho = "";
  filho.stderr.on("data", (p) => {
    erroDoFilho += p.toString("utf8");
  });

  const portao = [];
  try {
    const porta = await esperaPorta(filho.stdout);

    const checagens = [];
    const registra = (nome, ok, detalhe) => {
      checagens.push({ nome, ok, detalhe });
      console.log(`${ok ? "ok  " : "FALHA"} ${nome} — ${detalhe}`);
    };

    // 1. Health: a Function monta o app E conversa com o banco.
    const health = await pedido(porta, "GET", "/api/health");
    registra(
      "GET /api/health responde 200 e o banco responde",
      health.status === 200 && health.json && health.json.db === "up",
      `status ${health.status}, corpo ${health.texto}`,
    );

    // 2. Rota inexistente: quem respondeu foi o app (o 404 dele), não um proxy.
    const inexistente = await pedido(porta, "GET", "/api/rota-que-nao-existe");
    registra(
      "GET de rota inexistente responde 404 no formato do app",
      inexistente.status === 404 && inexistente.json && inexistente.json.error === "NOT_FOUND",
      `status ${inexistente.status}, corpo ${inexistente.texto}`,
    );

    // 3. Corpo inválido: o parser customizado sobrevive ao caminho cru.
    const loginVazio = await pedido(porta, "POST", "/api/auth/login", {});
    registra(
      "POST /api/auth/login sem campos responde 400 de validação",
      loginVazio.status === 400 && loginVazio.json && loginVazio.json.error === "VALIDATION_ERROR",
      `status ${loginVazio.status}, corpo ${loginVazio.texto}`,
    );

    // 4. Rota de tenant sem sessão: o gate está armado.
    const semSessao = await pedido(porta, "GET", "/api/clients");
    registra(
      "GET /api/clients sem sessao responde 401",
      semSessao.status === 401,
      `status ${semSessao.status}, corpo ${semSessao.texto}`,
    );

    // 5. Escudos: os cabeçalhos de segurança valem neste caminho.
    const cabecalhos = health.headers || {};
    registra(
      "a resposta traz os cabecalhos de seguranca do helmet",
      Boolean(cabecalhos["x-content-type-options"]) && Boolean(cabecalhos["x-frame-options"]),
      `x-content-type-options ${cabecalhos["x-content-type-options"] ?? "ausente"}, x-frame-options ${cabecalhos["x-frame-options"] ?? "ausente"}`,
    );

    const falhas = checagens.filter((c) => !c.ok);
    console.log("");
    console.log(`checagens: ${checagens.length} | falhas: ${falhas.length}`);
    if (falhas.length > 0) {
      console.log("o caminho serverless NAO esta pronto");
      process.exitCode = 1;
    } else {
      console.log("o caminho serverless responde como a Function da Vercel");
    }
  } catch (erro) {
    console.error(`FALHA a prova do serverless: ${erro.message}`);
    if (erroDoFilho.trim()) console.error(erroDoFilho.trim());
    process.exitCode = 1;
  } finally {
    filho.kill();
  }
}

main();
