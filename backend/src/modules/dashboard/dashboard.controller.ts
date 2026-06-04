import { FastifyRequest, FastifyReply } from 'fastify';
import * as dashboardService from './dashboard.service';

export async function statsHandler(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user as { companyId: number };
  const stats = await dashboardService.getStats(user.companyId);
  const revenueByMonth = await dashboardService.getRevenueByMonth(user.companyId);
  const expenseByMonth = await dashboardService.getExpenseByMonth(user.companyId);
  const salesByMonth = await dashboardService.getSalesByMonth(user.companyId);
  const productsByCategory = await dashboardService.getProductsByCategory(user.companyId);

  return reply.send({
    success: true,
    data: {
      stats,
      charts: {
        revenueByMonth,
        expenseByMonth,
        salesByMonth,
        productsByCategory,
      },
    },
  });
}
