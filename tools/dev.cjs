// npm run dev — a casa inteira numa janela só.
//
// O projeto e um monorepo de workspaces: a API (`@nexus/api`, porta 3001) e o
// painel (`@nexus/web`, porta 5173 do Vite, que faz proxy de /api para a 3001).
// Antes deste arquivo subir os dois era dois terminais abertos, e quem chegava
// digitava `npm run dev` — comando que nao existia na raiz e devolvia "Missing
// script". Esta janela levanta os dois, mostra o endereco de cada um e derruba
// os dois juntos no Ctrl+C, que e o que se espera de um comando com esse nome.
//
// O que este comando NAO faz e servir o banco de prova. Para prova de navegador e
// a suite de testes existe `npm run dev:prova` (tools/servidor-de-prova.cjs), que sobe
// a API no banco `nexusbusinessmanager_teste` na porta 3002 e um Vite de prova na 5174.
// As duas janelas podem rodar juntas, e essa e a decisao inteira do achado N65: a
// 3001/5173 e de quem trabalha, e a prova nao pega mais a porta de ninguem.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");

// O npm do Windows e um `.cmd`, e desde o reforco de seguranca do Node (CVE-2024-27980)
// spawnar um `.cmd` sem shell devolve `spawn EINVAL` na hora. Em vez de abrir shell por
// cima disso - o que deixaria um cmd.exe no meio e impediria o Ctrl+C de chegar ao node
// que escuta a porta - este script lanca os dois binarios diretamente com o mesmo node
// que esta rodando a ferramenta. Os dois sao dependencias hoisted na raiz pelo npm
// workspaces; os caminhos saem da propria arvore, nao de suposicao.
function binario(pacote, entrada) {
  const candidatos = [
    path.join(RAIZ, "node_modules", pacote, entrada),
    path.join(RAIZ, "apps", "api", "node_modules", pacote, entrada),
    path.join(RAIZ, "apps", "web", "node_modules", pacote, entrada),
  ];
  const achado = candidatos.find((c) => fs.existsSync(c));
  if (!achado) {
    console.error("[dev] binario " + pacote + " nao encontrado. Rode `npm install` na raiz antes.");
    process.exit(2);
  }
  return achado;
}

const LADOS = [
  {
    nome: "api",
    endereco: "http://localhost:3001",
    argv: [binario("tsx", path.join("dist", "cli.mjs")), "watch", "src/server.ts"],
    cwd: path.join(RAIZ, "apps", "api"),
  },
  {
    nome: "web",
    endereco: "http://localhost:5173",
    argv: [binario("vite", path.join("bin", "vite.js"))],
    cwd: path.join(RAIZ, "apps", "web"),
  },
];

const filhos = [];
let fechando = false;

function derruba(codigo) {
  if (fechando) return;
  fechando = true;
  for (const f of filhos) {
    try {
      f.proc.kill("SIGINT");
    } catch {
      // processo ja se foi; nao ha o que limpar.
    }
  }
  // O npm do Windows deixa o node filho vivo se sair na hora: da um tempo curto
  // para o sinal fazer o efeito, confere quem ainda respira e so depois disso a
  // janela fecha - porta 3001 ocupada por um fantasma e o jeito mais rapido de
  // a proxima subida nao funcionar.
  setTimeout(() => {
    for (const f of filhos) {
      if (f.proc.exitCode === null && !f.proc.killed) {
        try {
          f.proc.kill();
        } catch {
          // ja era; o proximo `npm run dev` ainda encontra a porta livre.
        }
      }
    }
    process.exit(codigo);
  }, 1200).unref();
}

for (const lado of LADOS) {
  const proc = spawn(process.execPath, lado.argv, {
    cwd: lado.cwd,
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env,
  });
  const prefixo = "[" + lado.nome + "] ";
  const grava = (fluxo) => (pedaco) => {
    const texto = pedaco.toString();
    for (const linha of texto.replace(/\r/g, "").split("\n")) {
      if (linha.trim()) process[fluxo].write(prefixo + linha + "\n");
    }
  };
  proc.stdout.on("data", grava("stdout"));
  proc.stderr.on("data", grava("stderr"));
  proc.on("exit", (codigo) => {
    console.log(prefixo + "parou (codigo " + codigo + ")");
    derruba(codigo === 0 ? 0 : 1);
  });
  filhos.push({ proc, lado });
}

console.log(
  "subindo a casa: " +
    LADOS.map((l) => l.nome + " em " + l.endereco).join(" e ") +
    " | banco de desenvolvimento desta maquina",
);
console.log("para as provas de navegador e a suíte de testes use `npm run dev:prova` no lugar (banco de prova: api 3002, navegador 5174)");

for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, () => {
    console.log("\n" + sinal + " recebido: derrubando api e web");
    derruba(0);
  });
}
