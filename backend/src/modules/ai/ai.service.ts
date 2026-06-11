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

  // Improved fallback with contextual responses
  const fallbackAnswer = getFallbackAnswer(message, module || '', context);
  
  return {
    answer: fallbackAnswer,
    source: 'fallback' as const,
    suggestions: getContextualSuggestions(module || ''),
    context,
  };
}

function getFallbackAnswer(message: string, module: string, _context: any): string {
  const lower = message.toLowerCase();
  
  // General questions about the system
  if (lower.includes('sair') || lower.includes('logout') || lower.includes('encerrar')) {
    return 'Para sair do sistema, clique no botao "Sair do sistema" no menu lateral ou no seu perfil no canto superior direito. Isso limpara sua sessao e redirecionara para a tela de login.';
  }
  
  if (lower.includes('login') || lower.includes('entrar') || lower.includes('acessar')) {
    return 'Para fazer login, acesse a pagina de login, informe seu email e senha, e clique em "Entrar". Se esqueceu sua senha, entre em contato com o administrador.';
  }
  
  if (lower.includes('cadastrar') || lower.includes('registro') || lower.includes('criar conta')) {
    return 'Para criar uma conta, clique em "Registrar" na tela de login. Preencha nome, email, senha e repita a senha. Apos criar, entre em contato com o administrador para ativar sua conta.';
  }
  
  if (lower.includes('senha') || lower.includes('password')) {
    return 'Para alterar sua senha, acesse seu perfil no canto superior direito e clique em "Alterar Senha". Informe a senha atual e a nova senha.';
  }
  
  if (lower.includes('perfil') || lower.includes('minha conta') || lower.includes('meus dados')) {
    return 'Para acessar seu perfil, clique no seu nome no canto superior direito. L voce pode alterar nome, email, senha e tema do sistema.';
  }
  
  if (lower.includes('permissao') || lower.includes('acesso') || lower.includes('pode fazer')) {
    return 'As permissoes sao definidas pelo administrador. Os perfis sao: Administrador (acesso total), Gerente (acesso a gestao), Operador (acesso operacional) e Visualizador (apenas leitura).';
  }
  
  // Module-specific fallbacks
  if (module === 'clientes' || lower.includes('cliente')) {
    if (lower.includes('cadastrar') || lower.includes('criar') || lower.includes('novo')) {
      return 'Para cadastrar um cliente: va em Clientes > Novo Cliente, preencha nome, telefone, email e documento, depois clique em Salvar.';
    }
    if (lower.includes('editar') || lower.includes('alterar')) {
      return 'Para editar um cliente: va em Clientes, encontre o cliente na lista e clique no icone de edicao (lapis).';
    }
    if (lower.includes('buscar') || lower.includes('procurar')) {
      return 'Use o campo de busca no topo da lista de Clientes para encontrar rapidamente por nome, email ou documento.';
    }
    return 'No modulo de Clientes, voce pode cadastrar, editar, buscar e gerenciar todos os seus clientes. Use o menu lateral para acessar.';
  }
  
  if (module === 'produtos' || lower.includes('produto')) {
    if (lower.includes('cadastrar') || lower.includes('criar') || lower.includes('novo')) {
      return 'Para cadastrar um produto: va em Produtos > Novo Produto, preencha nome, SKU, categoria, preco e quantidade, depois clique em Salvar.';
    }
    if (lower.includes('editar') || lower.includes('alterar')) {
      return 'Para editar um produto: va em Produtos, encontre o produto e clique no icone de edicao.';
    }
    return 'No modulo de Produtos, voce pode gerenciar seu catalogo, precos, categorias e imagens dos produtos.';
  }
  
  if (module === 'estoque' || lower.includes('estoque') || lower.includes('inventario')) {
    if (lower.includes('entrada') || lower.includes('adicionar')) {
      return 'Para dar entrada no estoque: va em Estoque > Entrada, selecione o produto e informe a quantidade.';
    }
    if (lower.includes('saida') || lower.includes('remover')) {
      return 'Para dar saida no estoque: va em Estoque > Saida, selecione o produto e informe a quantidade.';
    }
    return 'No modulo de Estoque, voce pode controlar entradas, saidas, ajustes e ver produtos com estoque baixo.';
  }
  
  if (module === 'vendas' || lower.includes('venda') || lower.includes('vender')) {
    if (lower.includes('criar') || lower.includes('nova') || lower.includes('registrar')) {
      return 'Para criar uma venda: va em Vendas > Nova Venda, selecione o cliente (opcional), adicione produtos e confirme.';
    }
    return 'No modulo de Vendas, voce pode registrar vendas, ver historico, cancelar vendas e gerar relatorios.';
  }
  
  if (module === 'compras' || lower.includes('compra')) {
    if (lower.includes('criar') || lower.includes('nova') || lower.includes('registrar')) {
      return 'Para registrar uma compra: va em Compras > Nova Compra, selecione o fornecedor, adicione produtos e confirme.';
    }
    return 'No modulo de Compras, voce pode registrar compras de fornecedores, receber mercadorias e controlar pedidos.';
  }
  
  if (module === 'financeiro' || lower.includes('financeiro') || lower.includes('dinheiro') || lower.includes('conta')) {
    if (lower.includes('receita') || lower.includes('entrar dinheiro')) {
      return 'Para lancar uma receita: va em Financeiro > Nova Receita, informe descricao, valor, categoria e data.';
    }
    if (lower.includes('despesa') || lower.includes('pagar') || lower.includes('gasto')) {
      return 'Para lancar uma despesa: va em Financeiro > Nova Despesa, informe descricao, valor, categoria e data.';
    }
    return 'No modulo Financeiro, voce pode lancar receitas e despesas, ver contas a vencer e analisar o fluxo de caixa.';
  }
  
  if (module === 'dashboard' || lower.includes('dashboard') || lower.includes('painel')) {
    return 'O Dashboard mostra um resumo do seu negocio: totais de clientes, produtos, vendas e estoque, graficos de receitas vs despesas, vendas por mes e categorias. Use os cards para acesso rapido aos modulos.';
  }
  
  if (module === 'agenda' || lower.includes('agenda') || lower.includes('agendamento')) {
    return 'No modulo Agenda, voce pode gerenciar compromissos, agendar reunicoes com clientes e controlar status (agendado, concluido, cancelado).';
  }
  
  if (module === 'relatorios' || lower.includes('relatorio') || lower.includes('relat')) {
    return 'No modulo Relatorios, voce pode gerar relatorios de vendas, financeiro e estoque, filtrar por periodo e exportar para PDF ou Excel.';
  }
  
  if (module === 'notificacoes' || lower.includes('notificacao') || lower.includes('alerta')) {
    return 'O modulo Notificacoes exibe alertas do sistema sobre estoque baixo, contas a vencer e agendamentos. Voce pode marcar como lidas para limpar.';
  }
  
  if (module === 'auditoria' || lower.includes('auditoria') || lower.includes('log')) {
    return 'O modulo Auditoria registra todas as acoes dos usuarios: criacao, edicao e exclusao de registros. Use para consultar quem fez o que e quando.';
  }
  
  if (module === 'usuarios' || lower.includes('usuario') || lower.includes('usuario')) {
    return 'No modulo Usuarios (admin), voce pode gerenciar usuarios do sistema, definir perfis e permissoes, e ativar/desativar contas.';
  }
  
  if (module === 'config' || lower.includes('configuracao') || lower.includes('empresa')) {
    return 'No modulo Configuracoes (admin), voce pode configurar os dados da empresa, gerenciar multi-empresas e definir preferencias do sistema.';
  }
  
  // Generic helpful response
  return 'Posso ajudar voce com o Nexus Business Manager! Pergunte sobre como usar modulos como Clientes, Produtos, Estoque, Vendas, Compras, Financeiro, Agenda, Relatorios, Notificacoes, Auditoria, Usuarios ou Configuracoes. Tambem posso ajudar com login, cadastro, perfil e permissoes.';
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
