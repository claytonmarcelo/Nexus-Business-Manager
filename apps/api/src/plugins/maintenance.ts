import type { FastifyInstance } from "fastify";
import { estadoManutencao, ipPermitido, pulsoValido } from "../modules/cms/cms.service";

// Modo manutenção (seção 44/48): quando a administração da plataforma liga o
// modo, a API recusa escrita e leitura de negócio com 503 e a mensagem do
// painel, enquanto o visitante não apresentar o pulso ou não vir de um IP da
// lista. As rotas abaixo ficam sempre abertas, e a razão de cada uma é essa:
//  - /api/health   — monitoração precisa conseguir responder "estou de pé";
//  - /api/auth     — sem login não há como entrar para desligar o modo;
//  - /api/public   — a landing é quem mostra a tela de manutenção, com o
//                    reloginho e o campo do pulso;
//  - /api/cms      — o editor é o caminho de volta;
//  - /api/notifications — o sino é lido em qualquer tela do painel. Fechar
//                    a caixa de avisos não pausa operação nenhuma: só troca
//                    uma consulta de fundo por erro na tela de quem entrou
//                    aqui justamente para desligar o modo. Continua pedindo
//                    token de sessão — sem ele a resposta é 401.
const LIVRES = ["/api/health", "/api/auth", "/api/public", "/api/cms", "/api/notifications"];

export function registerMaintenance(app: FastifyInstance): void {
  app.addHook("onRequest", async (req, reply) => {
    const estado = await estadoManutencao();
    if (!estado.ativa) return;
    const [caminho = ""] = req.url.split("?");
    if (LIVRES.some((prefixo) => caminho.startsWith(prefixo))) return;

    const cabecalho = req.headers["x-nexus-pulse"];
    const apresentado =
      (typeof cabecalho === "string" ? cabecalho : Array.isArray(cabecalho) ? cabecalho[0] : "") ||
      (typeof req.query === "object" && req.query !== null && typeof (req.query as { pulso?: unknown }).pulso === "string"
        ? ((req.query as { pulso: string }).pulso)
        : "");

    if (pulsoValido(apresentado, estado.token) || ipPermitido(req.ip, estado.ips)) return;

    return reply
      .status(503)
      .send({ error: "MAINTENANCE", message: estado.mensagem, previsaoEm: estado.previsaoEm });
  });
}
