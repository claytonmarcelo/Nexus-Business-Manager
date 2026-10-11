import { z } from "zod";

// O corpo da tela é mínimo: só liga/desliga. Nome, descrição e agenda vivem no
// código (cron.handlers) — abrir edição de agenda pela API seria prometer um
// editor que a tela não tem.
export const alternarJobSchema = z.object({
  habilitada: z.boolean(),
});

export type AlternarJobInput = z.infer<typeof alternarJobSchema>;
