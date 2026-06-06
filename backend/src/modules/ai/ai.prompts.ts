export const SYSTEM_PROMPT = `Voce e o Nexus AI Assistant, assistente inteligente do ERP Nexus Business Manager.

Sua funcao e ajudar usuarios a operar o sistema e tomar decisoes melhores com base nos dados disponiveis.

## REGRAS
- Responda sempre em portugues do Brasil.
- Seja claro, objetivo, profissional e util.
- Nao invente dados. Quando nao houver dados suficientes, peca mais informacoes.
- Nunca exponha dados sensiveis (senhas, tokens, chaves).
- Nunca peca senha, token ou chave privada.
- Use apenas o contexto autorizado da empresa logada.
- Quando for tutorial, use passos numerados.
- Quando estiver analisando dados, entregue: resumo, riscos, oportunidades, acoes recomendadas.`;

export function buildContextPrompt(context: Record<string, any>): string {
  return [
    `## Contexto Atual`,
    `Modulo: ${context.currentModule || 'N/A'}`,
    `Pagina: ${context.currentPage || 'N/A'}`,
    `Empresa: ${context.companyName || 'N/A'}`,
    ``,
    `## Dados da Empresa`,
    `Total de Clientes: ${context.totalClients ?? 'N/A'}`,
    `Total de Produtos: ${context.totalProducts ?? 'N/A'}`,
    `Produtos com Estoque Baixo: ${context.lowStockCount ?? 'N/A'}`,
    `Total de Vendas: ${context.totalSales ?? 'N/A'}`,
    `Total de Receitas: R$ ${(context.totalRevenue ?? 0).toFixed(2)}`,
    `Total de Despesas: R$ ${(context.totalExpense ?? 0).toFixed(2)}`,
    `Saldo: R$ ${(context.balance ?? 0).toFixed(2)}`,
    `Clientes Inativos (60d): ${context.inactiveClients ?? 'N/A'}`,
    `Proximos Agendamentos: ${context.upcomingAppointments ?? 'N/A'}`,
    `Contas a Vencer: ${context.upcomingBills ?? 'N/A'}`,
    `Contas Vencidas: ${context.overdueBills ?? 'N/A'}`,
    ``,
    `## Instrucao`,
    `Responda a pergunta do usuario usando os dados acima quando relevante.`,
    `Se a pergunta for sobre como fazer algo no sistema, de instrucoes passo a passo.`,
    `Se for sobre analise de dados, use os numeros fornecidos.`,
  ].join('\n');
}

export function buildInsightsPrompt(context: Record<string, any>): string {
  return [
    `Com base nos seguintes dados da empresa, gere insights de negocio:`,
    ``,
    `- Clientes: ${context.totalClients ?? 0} (${context.inactiveClients ?? 0} inativos ha 60d)`,
    `- Produtos: ${context.totalProducts ?? 0} (${context.lowStockCount ?? 0} com estoque baixo)`,
    `- Vendas: ${context.totalSales ?? 0}`,
    `- Receitas: R$ ${(context.totalRevenue ?? 0).toFixed(2)}`,
    `- Despesas: R$ ${(context.totalExpense ?? 0).toFixed(2)}`,
    `- Saldo: R$ ${(context.balance ?? 0).toFixed(2)}`,
    `- Agendamentos: ${context.upcomingAppointments ?? 0}`,
    `- Contas a vencer: ${context.upcomingBills ?? 0}`,
    `- Contas vencidas: ${context.overdueBills ?? 0}`,
    ``,
    `Retorne uma lista de insights com tipo (stock, financial, clients, sales, appointments),`,
    `titulo, mensagem e severidade (success, warning, danger, info).`,
    `Limite a 5 insights.`,
  ].join('\n');
}
