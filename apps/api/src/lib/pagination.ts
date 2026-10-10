import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Convenção única de resposta paginada (seção 25).
export function paginate<T>(data: T[], total: number, p: PaginationInput): Paginated<T> {
  return {
    data,
    meta: {
      page: p.page,
      pageSize: p.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / p.pageSize)),
    },
  };
}

export function skipTake(p: PaginationInput): { skip: number; take: number } {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize };
}
