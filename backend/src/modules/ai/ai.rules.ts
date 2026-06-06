interface RuleEntry {
  keywords: string[];
  answer: string;
  suggestions: string[];
}

const moduleHelp: Record<string, RuleEntry[]> = {
  dashboard: [
    {
      keywords: ['usar', 'funciona', 'dashboard', 'painel'],
      answer: 'O Dashboard exibe um resumo do seu negocio: cards com totais (clientes, produtos, vendas), graficos de receitas vs despesas, vendas por mes, categorias de produtos e valor em estoque. Navegue pelos modulos no menu lateral para detalhes.',
      suggestions: ['Como interpretar os graficos?', 'O que significa estoque baixo?', 'Como acessar relatorios?'],
    },
  ],
  clientes: [
    {
      keywords: ['cadastrar', 'criar', 'novo', 'adicionar'],
      answer: 'Para cadastrar um novo cliente: 1) Acesse o modulo Clientes no menu lateral. 2) Clique em "Novo Cliente". 3) Preencha nome, telefone, email e documento. 4) Clique em "Salvar". O cliente sera cadastrado e aparecera na lista.',
      suggestions: ['Como editar um cliente?', 'Como buscar clientes?', 'Como ver clientes inativos?'],
    },
    {
      keywords: ['editar', 'alterar', 'modificar', 'atualizar'],
      answer: 'Para editar um cliente: 1) Acesse Clientes. 2) Encontre o cliente na lista. 3) Clique no icone de edicao (lapis). 4) Altere os dados desejados. 5) Clique em "Salvar".',
      suggestions: ['Como cadastrar cliente?', 'Como buscar cliente?', 'Como desativar cliente?'],
    },
    {
      keywords: ['buscar', 'procurar', 'encontrar', 'pesquisar', 'localizar'],
      answer: 'Use o campo de busca no topo da lista de Clientes. Digite nome, email ou documento. A lista filtra em tempo real. Para busca avancada, use os filtros disponiveis.',
      suggestions: ['Como cadastrar cliente?', 'Como ver clientes inativos?', 'Como analisar vendas por cliente?'],
    },
    {
      keywords: ['inativos', 'inativo', 'sem comprar', 'parados'],
      answer: 'Acesse o modulo Clientes e use o filtro de status ou a busca. O sistema mostra clientes que nao compram ha mais de 60 dias no Dashboard. Para detalhes, gere um relatorio de clientes.',
      suggestions: ['Como cadastrar cliente?', 'Como reativar cliente?', 'Como analisar vendas por cliente?'],
    },
  ],
  fornecedores: [
    {
      keywords: ['cadastrar', 'criar', 'novo', 'adicionar'],
      answer: 'Para cadastrar fornecedor: 1) Acesse Fornecedores. 2) Clique em "Novo Fornecedor". 3) Preencha razao social, contato, telefone e email. 4) Salve.',
      suggestions: ['Como editar fornecedor?', 'Como vincular produto a fornecedor?', 'Como ver compras por fornecedor?'],
    },
  ],
  produtos: [
    {
      keywords: ['cadastrar', 'criar', 'novo', 'adicionar', 'produto'],
      answer: 'Para cadastrar produto: 1) Acesse Produtos. 2) Clique em "Novo Produto". 3) Preencha nome, SKU, categoria, preco e quantidade inicial. 4) Opcional: adicione imagem. 5) Salve.',
      suggestions: ['Como ajustar preco?', 'Como adicionar imagem?', 'Como categorizar produtos?'],
    },
    {
      keywords: ['preco', 'preco', 'ajustar', 'alterar preco'],
      answer: 'Para ajustar o preco de um produto: 1) Acesse Produtos. 2) Encontre o produto. 3) Clique em editar. 4) Altere o campo "Preco". 5) Salve.',
      suggestions: ['Como cadastrar produto?', 'Como adicionar imagem?', 'Como ver historico de precos?'],
    },
    {
      keywords: ['imagem', 'foto', 'fotografia'],
      answer: 'Para adicionar imagem: 1) Edite o produto. 2) Na seção de imagem, clique em "Escolher arquivo". 3) Selecione JPG, PNG ou WebP (max 2MB). 4) Salve.',
      suggestions: ['Como cadastrar produto?', 'Como ajustar preco?', 'Como categorizar produtos?'],
    },
  ],
  estoque: [
    {
      keywords: ['entrada', 'adicionar estoque', 'aumentar', 'repor'],
      answer: 'Para dar entrada no estoque: 1) Acesse Estoque. 2) Clique em "Entrada". 3) Selecione o produto. 4) Informe a quantidade. 5) Adicione descricao opcional. 6) Confirme.',
      suggestions: ['Como dar saida?', 'Como ver estoque baixo?', 'Como corrigir quantidade?'],
    },
    {
      keywords: ['saida', 'remover', 'baixar', 'diminuir'],
      answer: 'Para dar saida no estoque: 1) Acesse Estoque. 2) Clique em "Saida". 3) Selecione o produto. 4) Informe a quantidade. 5) Adicione descricao opcional. 6) Confirme.',
      suggestions: ['Como dar entrada?', 'Como ver estoque baixo?', 'Como corrigir quantidade?'],
    },
    {
      keywords: ['baixo', 'minimo', 'falta', 'acabando'],
      answer: 'O sistema alerta automaticamente sobre produtos com estoque baixo no Dashboard. Para ver detalhes: 1) Acesse Estoque. 2) Use o filtro "Estoque Baixo". 3) Analise a lista.',
      suggestions: ['Como dar entrada no estoque?', 'Como corrigir quantidade?', 'Como configurar estoque minimo?'],
    },
    {
      keywords: ['corrigir', 'ajustar', 'correcao', 'erro quantidade'],
      answer: 'Para corrigir quantidade: 1) Acesse Estoque. 2) Encontre o produto. 3) Use a opcao "Ajustar Estoque". 4) Informe a quantidade correta e o motivo. 5) Confirme.',
      suggestions: ['Como dar entrada?', 'Como dar saida?', 'Como ver historico de movimentacoes?'],
    },
  ],
  financeiro: [
    {
      keywords: ['receita', 'receber', 'entrada', 'faturamento'],
      answer: 'Para lancar receita: 1) Acesse Financeiro. 2) Clique em "Nova Receita". 3) Informe descricao, valor, categoria e data. 4) Salve.',
      suggestions: ['Como lancar despesa?', 'Como ver contas vencidas?', 'Como analisar saldo?'],
    },
    {
      keywords: ['despesa', 'pagar', 'gasto', 'custo', 'saida'],
      answer: 'Para lancar despesa: 1) Acesse Financeiro. 2) Clique em "Nova Despesa". 3) Informe descricao, valor, categoria e data. 4) Salve.',
      suggestions: ['Como lancar receita?', 'Como ver contas vencidas?', 'Como analisar saldo do mes?'],
    },
    {
      keywords: ['vencidas', 'vencido', 'atrasado', 'contas a pagar'],
      answer: 'Para ver contas vencidas: 1) Acesse Financeiro. 2) Use o filtro "Vencidas". 3) A lista mostrara as despesas com data de vencimento passada. O Dashboard tambem alerta sobre contas vencidas.',
      suggestions: ['Como lancar despesa?', 'Como ver contas a vencer?', 'Como gerar relatorio financeiro?'],
    },
    {
      keywords: ['saldo', 'analisar', 'balanco', 'resultado'],
      answer: 'O saldo do periodo e calculado como Receitas - Despesas. Acesse o Dashboard para ver o resumo ou o modulo Financeiro para detalhes por periodo.',
      suggestions: ['Como lancar receita?', 'Como lancar despesa?', 'Como gerar relatorio financeiro?'],
    },
  ],
  vendas: [
    {
      keywords: ['criar', 'nova', 'registrar', 'venda', 'vender'],
      answer: 'Para criar uma venda: 1) Acesse Vendas. 2) Clique em "Nova Venda". 3) Selecione o cliente (opcional). 4) Adicione produtos com quantidade e preco. 5) Confirme a venda.',
      suggestions: ['Como cancelar venda?', 'Como ver historico?', 'Como emitir recibo?'],
    },
    {
      keywords: ['cancelar', 'cancelar venda', 'estornar'],
      answer: 'Para cancelar uma venda: 1) Acesse Vendas. 2) Encontre a venda. 3) Clique em "Cancelar". 4) Confirme o cancelamento. O estoque sera atualizado automaticamente.',
      suggestions: ['Como criar venda?', 'Como ver historico?', 'Como emitir nota?'],
    },
    {
      keywords: ['historico', 'passado', 'antigas', 'consultar'],
      answer: 'Para ver historico de vendas: 1) Acesse Vendas. 2) Use o campo de busca ou filtros por data/cliente. 3) Clique em uma venda para ver detalhes.',
      suggestions: ['Como criar venda?', 'Como cancelar venda?', 'Como gerar relatorio de vendas?'],
    },
  ],
  compras: [
    {
      keywords: ['criar', 'nova', 'registrar', 'compra', 'comprar'],
      answer: 'Para registrar uma compra: 1) Acesse Compras. 2) Clique em "Nova Compra". 3) Selecione fornecedor. 4) Adicione produtos. 5) Informe valor total. 6) Confirme.',
      suggestions: ['Como receber compra?', 'Como cancelar compra?', 'Como ver historico?'],
    },
  ],
  relatorios: [
    {
      keywords: ['gerar', 'pdf', 'exportar', 'relatorio'],
      answer: 'Para gerar relatorio: 1) Acesse Relatorios. 2) Escolha o tipo (vendas, financeiro, estoque). 3) Defina o periodo. 4) Clique em "Gerar" ou "Exportar".',
      suggestions: ['Como exportar Excel?', 'Como filtrar por periodo?', 'Como imprimir relatorio?'],
    },
    {
      keywords: ['excel', 'xlsx', 'planilha', 'exportar excel'],
      answer: 'Nos relatorios, clique em "Exportar Excel" apos definir os filtros. O arquivo sera baixado automaticamente.',
      suggestions: ['Como gerar PDF?', 'Como filtrar periodo?', 'Como personalizar relatorio?'],
    },
    {
      keywords: ['filtrar', 'periodo', 'data', 'intervalo'],
      answer: 'Ao gerar um relatorio, use os campos de data inicial e final para filtrar por periodo. Isso funciona para todos os tipos de relatorio.',
      suggestions: ['Como gerar PDF?', 'Como exportar Excel?', 'Como personalizar colunas?'],
    },
  ],
  notificacoes: [
    {
      keywords: ['notificacao', 'alerta', 'aviso', 'sininho'],
      answer: 'O modulo Notificacoes exibe alertas do sistema: estoque baixo, contas a vencer, agendamentos. Use "Marcar todas lidas" para limpar. As notificacoes sao geradas automaticamente.',
      suggestions: ['Como configurar alertas?', 'Como ver notificacoes antigas?', 'O que gera notificacao?'],
    },
  ],
  auditoria: [
    {
      keywords: ['auditoria', 'log', 'registro', 'historico acoes'],
      answer: 'O modulo de Auditoria registra todas as acoes dos usuarios: criacao, edicao e exclusao de registros. Acesse para consultar quem fez o que e quando.',
      suggestions: ['Como filtrar auditoria?', 'O que e registrado?', 'Como exportar auditoria?'],
    },
  ],
  config: [
    {
      keywords: ['configurar', 'empresa', 'configuracoes', 'dados empresa'],
      answer: 'Para configurar a empresa: 1) Acesse Empresas no menu (admin). 2) Edite os dados cadastrais. 3) Configure preferencias. Alteracoes afetam todo o sistema.',
      suggestions: ['Como gerenciar usuarios?', 'Como alterar tema?', 'Como configurar permissões?'],
    },
  ],
};

export function findRuleAnswer(module: string, message: string): { answer: string; suggestions: string[] } | null {
  const normalizedModule = module?.toLowerCase().trim() || '';
  const entries = moduleHelp[normalizedModule];
  if (!entries) return null;

  const lower = message.toLowerCase();
  for (const entry of entries) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return { answer: entry.answer, suggestions: entry.suggestions };
    }
  }
  return null;
}

export function getContextualSuggestions(module: string): string[] {
  const normalizedModule = module?.toLowerCase().trim() || '';

  const allSuggestions: Record<string, string[]> = {
    dashboard: ['Como usar o dashboard?', 'Como interpretar os graficos?', 'O que significa estoque baixo?', 'Como acessar relatorios?'],
    clientes: ['Como cadastrar um cliente?', 'Como editar um cliente?', 'Como encontrar clientes inativos?', 'Como analisar vendas por cliente?'],
    fornecedores: ['Como cadastrar fornecedor?', 'Como editar fornecedor?', 'Como ver compras por fornecedor?', 'Como vincular produto a fornecedor?'],
    produtos: ['Como cadastrar produto?', 'Como ajustar preco?', 'Como adicionar imagem?', 'Como categorizar produtos?'],
    estoque: ['Como dar entrada no estoque?', 'Como ver estoque baixo?', 'Como corrigir quantidade?', 'Como ver historico de movimentacoes?'],
    financeiro: ['Como lancar despesa?', 'Como ver contas vencidas?', 'Como analisar saldo do mes?', 'Como gerar relatorio financeiro?'],
    vendas: ['Como criar venda?', 'Como cancelar venda?', 'Como ver historico?', 'Como gerar relatorio de vendas?'],
    compras: ['Como registrar compra?', 'Como receber compra?', 'Como cancelar compra?', 'Como ver historico de compras?'],
    relatorios: ['Como gerar relatorio PDF?', 'Como exportar Excel?', 'Como filtrar por periodo?', 'Como personalizar relatorio?'],
    notificacoes: ['Como ver notificacoes?', 'Como marcar todas lidas?', 'Como configurar alertas?', 'O que gera notificacao?'],
    auditoria: ['Como usar auditoria?', 'Como filtrar auditoria?', 'Como exportar auditoria?', 'O que e registrado?'],
    config: ['Como configurar empresa?', 'Como gerenciar usuarios?', 'Como alterar tema?', 'Como configurar permissoes?'],
  };

  return allSuggestions[normalizedModule] || allSuggestions.dashboard;
}
