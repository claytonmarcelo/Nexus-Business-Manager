// Copy da página pública isolado em um único módulo (SoC): revisar texto não exige
// tocar em componentes. Tom: preciso, premium, direto ao ponto.
//
// O que o CMS controla (headline, subtítulo, herói, itens da vitrine, cores, SEO,
// contato e textos legais) vem do banco. O que está aqui é o que não é conteúdo de
// vitrine: o nome da marca, as seções fixas e as capacidades padrão, usadas quando
// o dono do site ainda não cadastrou nenhuma — a página nunca fica um vazio.
export const LANDING_COPY = {
  brand: "Nexus Business Manager",
  eyebrow: "ERP SaaS · Multiempresa",
  title: "Gestão empresarial com precisão e elegância",
  subtitle:
    "Clientes, produtos, vendas, estoque, finanças, CRM e agenda em um só lugar — " +
    "um ambiente seguro, responsivo e com identidade própria, do balcão à nuvem.",
  access: "Acessar",
  features: [
    {
      icon: "⛨",
      title: "Segurança em primeiro lugar",
      text: "Autenticação JWT, controle de acesso por papel aplicado no servidor e isolamento real de dados por empresa.",
    },
    {
      icon: "◈",
      title: "Multiempresa de verdade",
      text: "Cada empresa opera no seu próprio contexto, com usuários, papéis e trilha de auditoria dedicados.",
    },
    {
      icon: "▤",
      title: "Operação completa",
      text: "Do cadastro ao resultado: módulos empresariais integrados, com dados reais em cada tela.",
    },
    {
      icon: "✦",
      title: "Experiência refinada",
      text: "Interface Premium Gourmet com temas claro e escuro, fluida de smartphones a monitores 5K.",
    },
  ],
} as const;

// A seção "Sobre" é honesta: fala do que está no ar e nomeia o que falta, sem
// número inventado de clientes, países ou nota de satisfação. Nada aqui é contável.
export const SOBRE_LANDING = {
  titulo: "Sobre o Nexus",
  paragrafos: [
    "O Nexus Business Manager é um ERP multiempresa construído do zero: login com JWT, papéis com " +
      "permissão verificada no servidor e uma empresa ativa que vem do token e é revalidada a cada " +
      "requisição — nunca do que a pessoa digita no endereço.",
    "Já estão no ar os módulos do dia a dia de um negócio: clientes, produtos e estoque, vendas com " +
      "baixa e estorno, compras com fornecedor, financeiro com resumo mensal, CRM com funil e conversão " +
      "em cliente, agenda com recorrência e painel com relatórios agregados e exportação CSV. Cada " +
      "indicador do painel é uma conta feita no banco daquela empresa.",
    "O que ainda não chegou tem nome, não promessa: ordens de serviço, cobrança por gateway com " +
      "credencial real e planos de assinatura. Essas linhas aparecem marcadas como " +
      "em construção no menu e na tabela de módulos do produto.",
    "A interface é a mesma nos dois temas e em qualquer largura de tela, com paginação feita no " +
      "servidor e estados desenhados para carregando, vazio, erro e nenhum resultado com os filtros " +
      "aplicados.",
  ],
} as const;

// Avisos de LGPD da vitrine: o texto é nosso e diz a verdade sobre o site.
export const COOKIES_LANDING = {
  texto:
    "Este site não usa cookies de rastreamento. Guardamos no seu navegador apenas o tema escolhido " +
    "e, depois de você entrar, a sessão do painel.",
  acao: "Entendi",
} as const;

export const MANUTENCAO_LANDING = {
  titulo: "Estamos ajustando o sistema",
  padrao: "Voltamos em instantes.",
  pulso: "Tenho o código de acesso",
  pulsoAjuda: "O código é gerado na administração do site e vale para esta aba do navegador.",
  // Rótulo do botão que envia o código — o link de baixo é outra coisa ("tentar
  // entrar mesmo assim"), e os dois com a mesma palavra confundem.
  entrar: "Liberar acesso",
  negado: "Código não confere. Confira com quem administra o site.",
} as const;
