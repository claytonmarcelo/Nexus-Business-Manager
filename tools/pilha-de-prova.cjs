// Pilha de prova — onde cada ferramenta de navegador deve bater.
//
// O achado N65 (docs/AUDITORIA.md) mordeu duas vezes nesta rodada e a segunda custou
// o acesso de quem usa o sistema: `npm run dev:api:teste` e `npm run dev` brigavam pela
// mesma porta 3001, o dono digitou a senha dele no navegador (5173), o Vite mandou o
// /api para a API de prova, e a conta real dele não existe naquele banco — HTTP 401 sem
// nenhuma pista na tela. A regra que saiu daí é a regra desta casa:
//
//   a pilha de prova nunca pega a porta de quem trabalha. API de prova na 3002,
//   Vite de prova na 5174. A 3001/5173 é do dono, sempre.
//
// Como a ferramenta descobre isso sem que ninguém tenha que lembrar de passar variável:
// `tools/servidor-de-prova.cjs` escreve um ponteiro local (ignorado pelo git) enquanto
// está de pé, e este arquivo lê o ponteiro. A ordem de prioridade é a de sempre — o que
// a pessoa diz vence o que a máquina lembra:
//
//   1. variável de ambiente (NEXUS_WEB / NEXUS_API), para quem quer escolher;
//   2. o ponteiro da pilha de prova, mas só enquanto o processo que o escreveu estiver
//      vivo — servidor queimado não pode deixar endereço zombie no disco;
//   3. a casa real: http://localhost:5173 e http://localhost:3001.
//
// Nada aqui imprime credencial. O log diz endereço, porta e por que ele foi escolhido.
const fs = require("fs");
const path = require("path");

const ARQUIVO_PONTEIRO = path.join(__dirname, "ponteiro-de-prova.local.json");

// As portas do dono. Isto não é configuração: é o contrato do N65.
const CASA = { web: "http://localhost:5173", api: "http://localhost:3001" };
const PROVA = { web: "http://localhost:5174", api: "http://localhost:3002" };

function lePonteiro() {
  let lido;
  try {
    lido = JSON.parse(fs.readFileSync(ARQUIVO_PONTEIRO, "utf8"));
  } catch {
    // sem arquivo é o estado normal de quem está só trabalhando no produto.
    return null;
  }
  if (!lido || typeof lido.pid !== "number" || !lido.web || !lido.api) return null;
  try {
    process.kill(lido.pid, 0);
  } catch {
    // O servidor de prova não está mais aqui: o endereço que ele deixou no disco vale zero.
    // E não vale deixar o lixo para a próxima corrida — quem lê um ponteiro morto já sabe
    // que a pilha caiu, então ele é apagado nesta leitura (o Windows não garante que o
    // processo morto tenha conseguido rodar a própria limpeza de saída).
    try {
      fs.unlinkSync(ARQUIVO_PONTEIRO);
    } catch {
      // se outra janela estiver escrevendo agora, a limpeza dela que cuide.
    }
    return null;
  }
  return lido;
}

function endereco(de, qual, nomes) {
  for (const nome of nomes) {
    const valor = String(process.env[nome] || "").trim();
    if (valor) return { valor, motivo: nome + " (definido por quem rodou a prova)" };
  }
  const vivo = lePonteiro();
  if (vivo) return { valor: vivo[qual], motivo: "pilha de prova na 3002/5174 (pid " + vivo.pid + ")" };
  return { valor: CASA[qual], motivo: "casa real, sem pilha de prova no ar" };
}

// Aceita a raiz ("http://localhost:3002"); quem precisa do "/api" continua
// concatenando como sempre fizeram as ferramentas.
function raizDaApi() {
  return endereco(CASA.api, "api", ["NEXUS_API", "NEXUS_API_BASE"]).valor;
}

function baseDoNavegador() {
  return endereco(CASA.web, "web", ["NEXUS_WEB", "NEXUS_WEB_BASE"]).valor;
}

function pilhaDeProvaNoAr() {
  return raizDaApi() !== CASA.api || baseDoNavegador() !== CASA.web;
}

// Uma linha por corrida, com a mesma frase nas duas pontas: é assim que a prova de
// navegador deixa registrado, no próprio log, em qual banco ela acabou escrevendo.
function anunciaPilha(rotulo) {
  const api = endereco(CASA.api, "api", ["NEXUS_API", "NEXUS_API_BASE"]);
  const web = endereco(CASA.web, "web", ["NEXUS_WEB", "NEXUS_WEB_BASE"]);
  const prova = pilhaDeProvaNoAr();
  console.log(
    "[" + rotulo + "] navegador " + web.valor + " | api " + api.valor + " | " +
      (prova ? "PILHA DE PROVA (banco nexusbusinessmanager_teste)" : "banco de desenvolvimento desta maquina") +
      " — " + web.motivo,
  );
  return { web: web.valor, api: api.valor, prova };
}

// Capturas de tela tem a mesma regra das portas: a prova nao pisa no entregavel.
// As imagens canonicas de `docs/screenshots/` sao a cara do produto com os dados de
// quem trabalha; rodar a prova com a pilha no ar cria outras imagens, com outros
// nomes e outros numeros, e elas vao para o lado, em `docs/screenshots-prova/`
// (pasta ignorada pelo git). A ferramenta continua gravando no mesmo caminho de
// sempre quando nao ha pilha no ar — que e o unico jeito de recapturar uma tela que
// mudou de verdade.
function pastaDeCaptura(canonica) {
  const base = String(canonica || "docs/screenshots").replace(/\/+$/, "");
  if (!pilhaDeProvaNoAr()) return base;
  const deProva = base + "-prova";
  try {
    fs.mkdirSync(path.resolve(__dirname, "..", deProva), { recursive: true });
  } catch {
    // se a pasta ja existe ou o caminho e absoluto e de quem chamou, a gravacao adiante
    // reclama melhor do que aqui.
  }
  return deProva;
}

module.exports = {
  ARQUIVO_PONTEIRO,
  CASA,
  PROVA,
  raizDaApi,
  baseDoNavegador,
  pilhaDeProvaNoAr,
  pastaDeCaptura,
  anunciaPilha,
  lePonteiro,
};

// Uma linha no nascedouro de cada ferramenta, e nao um cada uma delas chamando: foi
// assim que a prova de navegador pde escrever no banco errado sem que o log contasse
// nada. Quem roda a prova ve, na primeira linha, em que porta ela entrou e de que
// banco ela esta falando. `NEXUS_QUIETO=1` desliga para quem esta medindo a propria
// resolucao de endereco (tools/verify-pilha-de-prova.cjs), senao o log entraria na
// conta do caso que esta sendo conferido.
if (!process.env.NEXUS_QUIETO) {
  anunciaPilha("topologia");
}

