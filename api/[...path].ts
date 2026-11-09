// Entrada serverless da Vercel: o painel e a API moram na mesma origem, e todo
// caminho /api/* cai nesta função. O app é o mesmo do container — uma árvore de
// rotas só, sem segunda montagem para manter.
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../apps/api/src/app";
import { aguardarFilaDeMail } from "../apps/api/src/lib/mail/fila";

const app = buildApp();
const pronta = app.ready();

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await pronta;
  await new Promise<void>((resolve) => {
    res.once("finish", resolve);
    res.once("close", resolve);
    app.server.emit("request", req, res);
  });
  // A fila de e-mail é memória do processo (N58): sem esta espera a instância
  // congela depois da resposta e a mensagem pendente só anda no próximo pedido.
  await aguardarFilaDeMail();
}
