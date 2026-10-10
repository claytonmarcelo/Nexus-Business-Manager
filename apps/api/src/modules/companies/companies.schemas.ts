import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug deve conter apenas letras minúsculas, números e hífens"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
