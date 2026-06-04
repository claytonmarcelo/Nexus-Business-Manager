import { FastifyRequest, FastifyReply } from 'fastify';
import * as dashboardService from './dashboard.service';

export async function statsHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { company_id: number };
  const stats = await dashboardService.getStats(user.company_id);
  const revenueByMonth = await dashboardService.getRevenueByMonth(user.company_id);
  const expenseByMonth = await dashboardService.getExpenseByMonth(user.company_id);
  const salesByMonth = await dashboardService.getSalesByMonth(user.company_id);
  const productsByCategory = await dashboardService.getProductsByCategory(user.company_id);

  return reply.send({
    stats,
    charts: {
      revenueByMonth,
      expenseByMonth,
      salesByMonth,
      productsByCategory,
    },
  });
}
