import { z } from "zod";
import { paginationSchema } from "../../lib/pagination";

export const roleEnum = z.enum(["OWNER", "ADMIN", "MANAGER", "STAFF"]);

export const listUsersQuery = paginationSchema.extend({
  search: z.string().trim().max(120).optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(128),
  role: roleEnum.default("STAFF"),
});

export const updateRoleSchema = z.object({ role: roleEnum });

export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
