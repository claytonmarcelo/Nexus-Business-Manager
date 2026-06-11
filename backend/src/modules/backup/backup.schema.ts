import { z } from 'zod';

export const createBackupSchema = z.object({});

export type CreateBackupInput = z.infer<typeof createBackupSchema>;
