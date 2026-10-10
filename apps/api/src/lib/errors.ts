// Erros de aplicação com status HTTP. Handler central os traduz (seção 47).
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new AppError(400, "BAD_REQUEST", msg, details);
export const unauthorized = (msg = "Não autenticado") =>
  new AppError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "Acesso negado") =>
  new AppError(403, "FORBIDDEN", msg);
export const notFound = (msg = "Recurso não encontrado") =>
  new AppError(404, "NOT_FOUND", msg);
export const conflict = (msg: string) => new AppError(409, "CONFLICT", msg);
export const tooMany = (msg = "Muitas requisições") =>
  new AppError(429, "TOO_MANY_REQUESTS", msg);
