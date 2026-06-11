import { FastifyRequest, FastifyReply } from 'fastify';
import * as backupService from './backup.service';

export async function listHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; companyId: number };
  const backups = await backupService.listBackups(user.companyId);
  return reply.send({ success: true, data: backups });
}

export async function createHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; name: string; companyId: number };
  const backup = await backupService.createBackup(user.id, user.companyId);
  return reply.status(201).send({ success: true, data: backup });
}

export async function downloadHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { id: number; companyId: number };
  const { id } = request.params as { id: string };
  const backup = await backupService.getBackupById(Number(id), user.companyId);
  const filePath = backupService.getBackupFilePath(backup);
  return reply.sendFile(filePath);
}
