// Copy da página pública isolado em um único módulo (SoC): revisar texto não exige
// tocar em componentes. Tom: preciso, premium, direto ao ponto.
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
  footer: {
    rights: "Nexus Business Manager",
    dev: "Desenvolvido por Clayton Marcelo",
  },
} as const;
