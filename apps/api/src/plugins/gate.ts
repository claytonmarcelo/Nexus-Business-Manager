import type { FastifyInstance } from "fastify";

declare module "fastify" {
  // O carimbo vive nos dois tipos que o Fastify 5 usa para `config`: o da
  // opção de rota (FastifyRouteConfig) e o lido dentro dos hooks
  // (FastifyContextConfig). Augmentar só um deixaria o outro cego.
  interface FastifyRouteConfig {
    // Marca a rota que é pública de propósito (health, login, cadastro,
    // recuperação, vitrine). Sem o carimbo, a rota precisa de app.authenticate.
    public?: boolean;
  }
  interface FastifyContextConfig {
    public?: boolean;
  }
}

// Gate estrutural de autenticação (Fase 2 da auditoria, seção C): o risco não
// é uma rota existente mal protegida — é a rota NOVA que nasce sem preHandler
// porque quem escreveu esqueceu. Aqui o esquecimento não passa da subida:
// qualquer rota registrada sem app.authenticate no preHandler e sem
// config.public = true derruba o boot da aplicação com nome e método na cara.
export function registerAuthGate(app: FastifyInstance): void {
  app.addHook("onRoute", (route) => {
    if (route.config?.public === true) return;
    const lista = Array.isArray(route.preHandler)
      ? route.preHandler
      : route.preHandler
        ? [route.preHandler]
        : [];
    // F4 (D3): a segunda aceitação é o decorador das etapas do login, que também é
    // função nomeada conferida por identidade. Rota de segundo fator não tem
    // sessão para conferir — o que ela tem é um token de etapa, e o que o gate
    // vigia continua sendo "a rota pede alguma coisa", não "a rota pede o
    // authenticate". Uma rota que não pede nada ainda derruba a subida.
    if (lista.includes(app.authenticate) || lista.includes(app.authenticateSegundoFator)) return;
    const metodos = Array.isArray(route.method) ? route.method.join(",") : route.method;
    // Pré-voo do CORS: o @fastify/cors registra um `OPTIONS *` por conta própria
    // para responder preflight, e o HEAD espelho do GET herda o carimbo. Rota
    // de framework não pede declaração humana — o que o gate vigia é rota de
    // negócio escrita por nós. OPTIONS nunca chega a handler de negócio.
    if (metodos === "OPTIONS") return;
    throw new Error(
      `[gate] rota ${metodos} ${route.url} registrada sem app.authenticate e sem config.public — ` +
        "nenhuma rota de negócio nasce aberta neste projeto",
    );
  });
}
