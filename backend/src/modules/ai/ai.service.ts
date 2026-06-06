import { ChatInput, AnalyzeInput } from './ai.schemas';
import { getBusinessContext } from './ai.context';
import { SYSTEM_PROMPT, buildContextPrompt, buildInsightsPrompt } from './ai.prompts';
import { askOllama } from './ai.provider';
import { findRuleAnswer, getContextualSuggestions } from './ai.rules';

export async function chat(data: ChatInput, companyId: number) {
  const { message, module, page } = data;
  const context = await getBusinessContext(companyId, module, page);

  const ruleResult = findRuleAnswer(module || '', message);
  if (ruleResult) {
    return {
      answer: ruleResult.answer,
      source: 'rules' as const,
      suggestions: ruleResult.suggestions,
      context,
    };
  }

  const fullPrompt = [
    SYSTEM_PROMPT,
    buildContextPrompt(context),
    `## Pergunta do Usuario`,
    message,
  ].join('\n\n');

  const ollamaAnswer = await askOllama(fullPrompt);
  if (ollamaAnswer) {
    return {
      answer: ollamaAnswer,
      source: 'ollama' as const,
      suggestions: getContextualSuggestions(module || ''),
      context,
    };
  }

  return {
    answer: 'Desculpe, nao consegui processar sua pergunta agora. Verifique se o assistente esta configurado corretamente ou tente reformular a pergunta.',
    source: 'fallback' as const,
    suggestions: getContextualSuggestions(module || ''),
    context,
  };
}

export async function getSuggestions(module: string) {
  const suggestions = getContextualSuggestions(module);
  return suggestions;
}

export async function getHelp(module: string) {
  const suggestions = getContextualSuggestions(module);

  const helpContent: Record<string, { title: string; description: string; steps: string[] }> = {
    clientes: {
      title: 'Modulo Clientes',
      description: 'Gerencie seus clientes, historico de compras e contatos.',
      steps: [
        'Para cadastrar: va em Clientes > Novo Cliente, preencha os dados e salve.',
        'Para editar: clique no icone de edicao ao lado do cliente.',
        'Use o campo de busca para encontrar clientes rapidamente.',
        'Clientes inativos sao destacados no Dashboard.',
      ],
    },
    dashboard: {
      title: 'Dashboard',
      description: 'Visao geral do seu negocio com metricas e graficos.',
      steps: [
        'Acompanhe totais de clientes, produtos, vendas e estoque.',
        'Graficos mostram receitas vs despesas, vendas por mes e categorias.',
        'Use os cards para acesso rapido aos modulos.',
      ],
    },
  };

  return {
    module,
    help: helpContent[module] || null,
    suggestions,
  };
}

export async function analyze(data: AnalyzeInput, companyId: number) {
  const context = await getBusinessContext(companyId, data.module);

  const prompt = [
    SYSTEM_PROMPT,
    buildContextPrompt(context),
    buildInsightsPrompt(context),
    `Analise o modulo "${data.module}" para o periodo ${data.period}.`,
    `Retorne: resumo executivo, riscos identificados, oportunidades e acoes recomendadas.`,
  ].join('\n\n');

  const ollamaAnswer = await askOllama(prompt);

  if (ollamaAnswer) {
    return {
      summary: ollamaAnswer,
      source: 'ollama' as const,
      context,
    };
  }

  const risks: string[] = [];
  const opportunities: string[] = [];
  const actions: string[] = [];

  if (context.lowStockCount > 0) risks.push(`${context.lowStockCount} produto(s) com estoque baixo.`);
  if (context.inactiveClients > 0) risks.push(`${context.inactiveClients} cliente(s) inativos ha mais de 60 dias.`);
  if (context.overdueBills > 0) risks.push(`${context.overdueBills} conta(s) vencida(s).`);
  if (context.balance < 0) risks.push('Saldo negativo no periodo.');

  if (context.inactiveClients > 0) opportunities.push('Recuperar clientes inativos com campanhas.');
  if (context.lowStockCount > 0) opportunities.push('Repor estoque dos produtos criticos.');
  if (context.balance > 0) opportunities.push('Saldo positivo permite investir em melhorias.');

  if (context.lowStockCount > 0) actions.push('Comprar produtos com estoque baixo.');
  if (context.overdueBills > 0) actions.push('Regularizar contas vencidas.');
  if (context.inactiveClients > 0) actions.push('Criar acao de recuperacao de clientes.');
  actions.push('Revisar categorias de despesas para otimizar custos.');

  const summary = context.balance >= 0
    ? `Seu ${data.module} esta positivo neste periodo. O saldo e de R$ ${context.balance.toFixed(2)}.`
    : `Seu ${data.module} precisa de atencao. O saldo negativo e de R$ ${Math.abs(context.balance).toFixed(2)}.`;

  return {
    summary,
    risks,
    opportunities,
    recommendedActions: actions,
    source: 'rules' as const,
    context,
  };
}

export async function getInsights(companyId: number) {
  const context = await getBusinessContext(companyId);

  const insights: { type: string; title: string; message: string; severity: string }[] = [];

  if (context.lowStockCount > 0) {
    insights.push({
      type: 'stock',
      title: 'Produtos com estoque baixo',
      message: `${context.lowStockCount} produto(s) estao com quantidade abaixo do recomendado.`,
      severity: 'warning',
    });
  }

  if (context.inactiveClients > 0) {
    insights.push({
      type: 'clients',
      title: 'Clientes inativos',
      message: `${context.inactiveClients} cliente(s) nao compram ha mais de 60 dias.`,
      severity: 'warning',
    });
  }

  if (context.balance > 0) {
    insights.push({
      type: 'financial',
      title: 'Saldo positivo',
      message: `O saldo do mes esta positivo em R$ ${context.balance.toFixed(2)}.`,
      severity: 'success',
    });
  } else if (context.balance < 0) {
    insights.push({
      type: 'financial',
      title: 'Saldo negativo',
      message: `O saldo do mes esta negativo em R$ ${Math.abs(context.balance).toFixed(2)}.`,
      severity: 'danger',
    });
  }

  if (context.upcomingAppointments > 0) {
    insights.push({
      type: 'appointments',
      title: 'Agendamentos futuros',
      message: `Voce tem ${context.upcomingAppointments} agendamento(s) marcado(s).`,
      severity: 'info',
    });
  }

  if (context.overdueBills > 0) {
    insights.push({
      type: 'financial',
      title: 'Contas vencidas',
      message: `${context.overdueBills} conta(s) estao vencidas e precisam de atencao.`,
      severity: 'danger',
    });
  }

  return insights;
}
