import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs';
import path from 'path';
import { createUserSchema, updateUserSchema } from './users.schema';
import * as userService from './users.service';
import { parsePagination } from '../../shared/utils/pagination';
import { log } from '../audit/audit.service';
import { AppError } from '../../shared/errors/app-error';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const params = parsePagination(request.query as Record<string, any>);
  const result = await userService.listUsers(user.companyId, params);
  return reply.send({ success: true, ...result });
}

export async function getByIdHandler(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const result = await userService.getUserById(Number(id));
  return reply.send({ success: true, data: result });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = createUserSchema.parse(request.body);
  const result = await userService.createUser(data, user.companyId);
  await log(user.id, user.name, 'CREATE', 'user', result.id, null, { ...data, password: '***' }, request.ip, user.companyId);
  return reply.status(201).send({ success: true, data: result });
}

export async function updateHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const data = updateUserSchema.parse(request.body);
  const old = await userService.getUserById(Number(id));
  const result = await userService.updateUser(Number(id), data);
  await log(user.id, user.name, 'UPDATE', 'user', Number(id), old, { ...data, password: data.password ? '***' : undefined }, request.ip, user.companyId);
  return reply.send({ success: true, data: result });
}

export async function uploadAvatarHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = await request.file();
  if (!data) throw new AppError('Nenhum arquivo enviado', 400);

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(data.mimetype)) {
    throw new AppError('Tipo de arquivo nao permitido. Use jpg, jpeg, png ou webp.', 400);
  }

  const ext = data.filename.split('.').pop() || 'jpg';
  const fileName = `avatar-${user.id}-${Date.now()}.${ext}`;
  const uploadsDir = path.resolve(__dirname, '..', '..', '..', 'uploads', 'avatars');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, fileName);
  const writeStream = fs.createWriteStream(filePath);
  await data.file.pipe(writeStream);

  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  const avatarUrl = `/uploads/avatars/${fileName}`;
  await userService.updateAvatar(user.id, avatarUrl);

  await log(user.id, user.name, 'UPDATE', 'user', user.id, null, { avatar: 'updated' }, request.ip, user.companyId);

  return reply.send({ success: true, data: { avatar_url: avatarUrl } });
}

export async function updateThemeHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { theme } = request.body as { theme: string };
  if (!['dark', 'light', 'auto'].includes(theme)) throw new AppError('Tema invalido. Use dark, light ou auto.', 400);
  await userService.updateTheme(user.id, theme);
  return reply.send({ success: true, data: { theme_preference: theme } });
}

export async function updateProfileHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const data = updateUserSchema.parse(request.body);
  const old = await userService.getUserById(Number(user.id));
  const result = await userService.updateUser(Number(user.id), data);
  await log(user.id, user.name, 'UPDATE', 'user', Number(user.id), old, { ...data, password: data.password ? '***' : undefined }, request.ip, user.companyId);
  return reply.send({ success: true, data: result });
}

export async function deleteHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const { id } = request.params as { id: string };
  const old = await userService.getUserById(Number(id));
  await userService.deleteUser(Number(id));
  await log(user.id, user.name, 'DELETE', 'user', Number(id), old, null, request.ip, user.companyId);
  return reply.send({ success: true, message: 'Usuario excluido com sucesso' });
}
