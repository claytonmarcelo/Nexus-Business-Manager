import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../errors/app-error';

type Role = 'admin' | 'manager' | 'operator' | 'viewer';

const roleHierarchy: Record<Role, number> = {
  admin: 4,
  manager: 3,
  operator: 2,
  viewer: 1,
};

export function authorize(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.user as { id: number; role: Role };

    if (!user || !user.role) {
      throw new AppError('Usuario nao autenticado', 401);
    }

    const userLevel = roleHierarchy[user.role];
    const requiredLevel = Math.max(...allowedRoles.map((r) => roleHierarchy[r]));

    if (userLevel < requiredLevel) {
      throw new AppError('Acesso negado: permissao insuficiente', 403);
    }
  };
}
