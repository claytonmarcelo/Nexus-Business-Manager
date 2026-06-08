import { motion } from 'framer-motion';
import {
  GlobeAltIcon,
  EnvelopeIcon,
  ServerIcon,
  CalendarIcon,
  ArrowPathIcon,
  UsersIcon,
  CircleStackIcon,
  KeyIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  TruckIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  BellIcon,
  UserIcon,
  Cog6ToothIcon,
  CalendarDaysIcon,
  CpuChipIcon,
  CodeBracketSquareIcon,
  ServerStackIcon,
  WrenchScrewdriverIcon,
  PaintBrushIcon,
  BoltIcon,
  BuildingOfficeIcon,
  LightBulbIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  ChartPieIcon,
  CreditCardIcon,
  DocumentChartBarIcon,
  BuildingStorefrontIcon,
  ArrowUpTrayIcon,
  CloudArrowUpIcon,
  QueueListIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

/* ─── MÓDULOS DO FRONTEND (páginas reais) ─────────────────────────── */
const modules = [
  { title: 'Dashboard',      desc: 'KPIs, gráficos e visão geral',        icon: ChartBarIcon },
  { title: 'Clientes',       desc: 'Cadastro e gestão de clientes',        icon: UserGroupIcon },
  { title: 'Fornecedores',   desc: 'Gestão de fornecedores',               icon: TruckIcon },
  { title: 'Produtos',       desc: 'Catálogo e precificação',              icon: CubeIcon },
  { title: 'Estoque',        desc: 'Controle e movimentações',             icon: ClipboardDocumentListIcon },
  { title: 'Compras',        desc: 'Ordens de compra e recebimento',       icon: ShoppingCartIcon },
  { title: 'Vendas',         desc: 'Pedidos e faturamento',                icon: CurrencyDollarIcon },
  { title: 'Financeiro',     desc: 'Contas a pagar e receber',             icon: CreditCardIcon },
  { title: 'CRM',            desc: 'Pipeline e oportunidades',             icon: BuildingOfficeIcon },
  { title: 'Nexus AI',       desc: 'Assistente com IA integrada',          icon: SparklesIcon },
  { title: 'Sugestões',      desc: 'Central de feedbacks e ideias',        icon: LightBulbIcon },
  { title: 'Relatórios',     desc: 'Relatórios e exportação PDF/Excel',    icon: ChartPieIcon },
  { title: 'Notificações',   desc: 'Alertas e comunicados',                icon: BellIcon },
  { title: 'Auditoria',      desc: 'Log completo de ações do sistema',     icon: ShieldCheckIcon },
  { title: 'Usuários',       desc: 'Gestão de usuários e permissões',      icon: UserIcon },
  { title: 'Empresas',       desc: 'Controle multiempresa',                icon: BuildingStorefrontIcon },
  { title: 'Agenda',         desc: 'Compromissos e tarefas',               icon: CalendarDaysIcon },
  { title: 'Configurações',  desc: 'Preferências e tema do sistema',       icon: Cog6ToothIcon },
  { title: 'Perfil',         desc: 'Dados pessoais e avatar',              icon: UserIcon },
  { title: 'Importação',     desc: 'Importar dados via planilha',          icon: ArrowUpTrayIcon },
  { title: 'Backup',         desc: 'Backup e restauração de dados',        icon: CloudArrowUpIcon },
  { title: 'Logs',           desc: 'Logs de sistema e diagnóstico',        icon: QueueListIcon },
];

/* ─── MÓDULOS DA API (backend real — backend/src/modules/) ─────────── */
const apiModules = [
  'auth', 'users', 'clients', 'products', 'stock',
  'suppliers', 'purchases', 'sales', 'financial',
  'appointments', 'dashboard', 'reports', 'notifications',
  'audit', 'companies', 'suggestions', 'ai', 'crm',
];

/* ─── TECNOLOGIAS (extraídas dos package.json reais) ─────────────────── */
const technologies = [
  {
    name: 'React 18 + TypeScript',
    desc: 'SPA com React Router v6, Framer Motion e Heroicons',
    icon: CpuChipIcon,
    color: '#61dafb',
    layer: 'Frontend',
  },
  {
    name: 'Vite 5 + Tailwind CSS 3',
    desc: 'Build ultrarrápido, PostCSS e sistema de temas com CSS vars',
    icon: BoltIcon,
    color: '#646cff',
    layer: 'Frontend',
  },
  {
    name: 'Recharts',
    desc: 'Gráficos responsivos para Dashboard e Relatórios',
    icon: ChartBarIcon,
    color: '#8884d8',
    layer: 'Frontend',
  },
  {
    name: 'Fastify 4',
    desc: 'API REST de alta performance com JWT, Helmet, Rate Limit e CORS',
    icon: ServerStackIcon,
    color: '#4caf50',
    layer: 'Backend',
  },
  {
    name: 'Prisma 7 + MySQL 8',
    desc: 'ORM moderno com adapter MariaDB e migrations versionadas',
    icon: CircleStackIcon,
    color: '#00758f',
    layer: 'Backend',
  },
  {
    name: 'Zod + Bcryptjs',
    desc: 'Validação de esquemas em runtime e hash seguro de senhas',
    icon: ShieldCheckIcon,
    color: '#e11d48',
    layer: 'Backend',
  },
  {
    name: 'PDFKit + ExcelJS',
    desc: 'Geração de relatórios em PDF e exportação em Excel no servidor',
    icon: DocumentChartBarIcon,
    color: '#d49556',
    layer: 'Backend',
  },
  {
    name: 'Vitest',
    desc: 'Suite de testes unitários integrada ao backend TypeScript',
    icon: CodeBracketIcon,
    color: '#a78bfa',
    layer: 'DevOps',
  },
];

/* ─── ARQUITETURA ──────────────────────────────────────────────────── */
const architecture = [
  {
    label: 'Frontend',
    value: 'SPA React com roteamento client-side (React Router v6)',
    icon: CpuChipIcon,
  },
  {
    label: 'Backend',
    value: `API REST com ${apiModules.length} módulos independentes (Fastify)`,
    icon: ServerStackIcon,
  },
  {
    label: 'Banco de dados',
    value: 'MySQL 8 gerenciado pelo Prisma ORM (migrations, seeds)',
    icon: CircleStackIcon,
  },
  {
    label: 'Autenticação',
    value: 'JWT com expiração de 8h, roles por empresa e auditoria',
    icon: KeyIcon,
  },
  {
    label: 'Multiempresa',
    value: 'Dados isolados por company_id em todas as entidades',
    icon: BuildingStorefrontIcon,
  },
  {
    label: 'Geração de arquivos',
    value: 'PDFKit (PDF) + ExcelJS (XLSX) com download direto',
    icon: DocumentChartBarIcon,
  },
];

export function About() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pb-12 max-w-[1600px] mx-auto"
    >
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>
          Sobre o Nexus Business Manager
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted-2)' }}>
          ERP SaaS empresarial completo — análise técnica do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Hero Panel */}
          <div
            className="rounded-xl p-6 relative overflow-hidden"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <div
              className="absolute top-6 right-6 border rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: 'var(--nexus-gold)',
                color: 'var(--nexus-gold)',
                background: 'rgba(var(--nexus-gold-rgb), 0.1)',
              }}
            >
              Open Source
            </div>

            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>
              Nexus Business Manager
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--nexus-muted-2)' }}>
              Sistema de Gestão Empresarial Integrado · ERP SaaS
            </p>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--nexus-muted)' }}>
              Plataforma ERP SaaS completa com CRM, Estoque, Financeiro, Agendamento, Dashboard,
              Relatórios e Controle Multiempresa. Desenvolvida para democratizar o acesso a ferramentas
              profissionais de gestão — gratuita, open source e pronta para produção.
            </p>
            <p className="text-xs mb-6" style={{ color: 'var(--nexus-muted-2)' }}>
              Repositório público em{' '}
              <a
                href="https://github.com/claytonmarcelo/Nexus-Business-Manager"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--nexus-gold)' }}
                className="hover:underline"
              >
                github.com/claytonmarcelo/Nexus-Business-Manager
              </a>
            </p>

            {/* Autor e contato */}
            <div
              className="flex flex-wrap gap-6 pt-5"
              style={{ borderTop: '1px solid var(--nexus-border)' }}
            >
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                <UserIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} />
                Clayton Marcelo
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                <GlobeAltIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} />
                github.com/claytonmarcelo
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
                <EnvelopeIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} />
                contato@nexus.com.br
              </div>
            </div>
          </div>

          {/* Módulos do Frontend */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: 'var(--nexus-text)' }}>
                Módulos do sistema
              </h3>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
              >
                {modules.length} telas
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {modules.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div
                    key={i}
                    className="flex gap-2.5 p-3 rounded-lg transition-colors hover:bg-white/5"
                    style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid var(--nexus-border)' }}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <Icon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: 'var(--nexus-text)' }}>
                        {m.title}
                      </div>
                      <div
                        className="text-[10px] mt-0.5 leading-tight"
                        style={{ color: 'var(--nexus-muted-2)' }}
                      >
                        {m.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arquitetura */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold" style={{ color: 'var(--nexus-text)' }}>
                Arquitetura do sistema
              </h3>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
              >
                {apiModules.length} módulos de API
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {architecture.map((a, i) => {
                const Icon = a.icon;
                return (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-lg"
                    style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--nexus-border)' }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--nexus-gold)' }} />
                    <div>
                      <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--nexus-text)' }}>
                        {a.label}
                      </div>
                      <div className="text-[11px] leading-relaxed" style={{ color: 'var(--nexus-muted-2)' }}>
                        {a.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finalidade */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
              Finalidade do projeto
            </h3>
            <div className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--nexus-muted)' }}>
              <p>
                O Nexus Business Manager é um projeto de código aberto com a missão de democratizar o
                acesso a ferramentas profissionais de gestão empresarial. Pequenas e médias empresas
                muitas vezes não conseguem investir em sistemas ERP comerciais de alto custo, recorrendo
                a planilhas dispersas e ferramentas desconectadas.
              </p>
              <p>
                O projeto oferece uma alternativa completa, profissional e gratuita: uma arquitetura
                real de produção com API REST modular (Fastify), banco relacional (MySQL + Prisma),
                autenticação segura (JWT), controle multiempresa e interface moderna com suporte a
                tema escuro e claro.
              </p>
              <p>
                Cada módulo foi construído com foco em consistência de dados, auditoria completa de
                ações e separação clara entre camadas de apresentação, lógica de negócio e persistência.
              </p>
            </div>
          </div>

          {/* Direitos e Deveres */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
              Direitos e deveres
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Usuário Comum */}
              <div
                className="rounded-lg p-4"
                style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--nexus-border)' }}
              >
                <h4
                  className="text-sm font-semibold mb-3 flex items-center gap-1.5"
                  style={{ color: 'var(--nexus-gold)' }}
                >
                  <UserIcon className="w-4 h-4" /> Usuário Comum
                </h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-emerald-500">
                      Direitos
                    </h5>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Utilizar os módulos autorizados pelo administrador
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Atualizar seu próprio perfil e avatar
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Consultar dados e gerar relatórios permitidos
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Registrar sugestões e feedbacks no sistema
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-rose-500">
                      Deveres
                    </h5>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Não compartilhar credenciais de acesso
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Não tentar acessar recursos além de sua role
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Manter seus dados cadastrais atualizados
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Usar o sistema de forma ética e responsável
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Administrador */}
              <div
                className="rounded-lg p-4"
                style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--nexus-border)' }}
              >
                <h4
                  className="text-sm font-semibold mb-3 flex items-center gap-1.5"
                  style={{ color: 'var(--nexus-gold)' }}
                >
                  <ShieldCheckIcon className="w-4 h-4" /> Administrador
                </h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-emerald-500">
                      Direitos
                    </h5>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Gerenciar usuários, roles e permissões
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Configurar empresas e dados corporativos
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Visualizar logs de auditoria completos
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-emerald-500 font-bold">✓</span> Realizar backup e importação de dados
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider mb-1 text-rose-500">
                      Deveres
                    </h5>
                    <ul className="space-y-1 text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Garantir a segurança e integridade dos dados
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Gerenciar acessos com o mínimo de privilégio
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Proteger as credenciais e tokens da aplicação
                      </li>
                      <li className="flex items-start gap-1">
                        <span className="text-rose-500 font-bold">•</span> Manter backups e monitorar logs periodicamente
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Níveis de Usuários */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
              Níveis de usuários
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  role: 'Administrador',
                  desc: 'Controle total: usuários, empresas, permissões, auditoria e configurações do sistema.',
                  color: 'var(--nexus-gold)',
                  border: 'rgba(var(--nexus-gold-rgb), 0.22)',
                },
                {
                  role: 'Gerente',
                  desc: 'Controle operacional: cadastros, relatórios gerenciais e aprovações de operações.',
                  color: 'var(--nexus-rose)',
                  border: 'rgba(var(--nexus-rose-rgb), 0.22)',
                },
                {
                  role: 'Operador',
                  desc: 'Operações do dia a dia: registrar vendas, compras, estoque e movimentações.',
                  color: 'var(--nexus-text)',
                  border: 'var(--nexus-border)',
                },
                {
                  role: 'Visualizador',
                  desc: 'Somente leitura: consulta de dados e geração de relatórios sem alterações.',
                  color: 'var(--nexus-muted)',
                  border: 'var(--nexus-border)',
                },
              ].map((u, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg text-xs"
                  style={{ borderColor: u.border, border: `1px solid ${u.border}`, background: 'rgba(0,0,0,0.1)' }}
                >
                  <h4 className="font-semibold mb-1.5" style={{ color: u.color }}>
                    {u.role}
                  </h4>
                  <p style={{ color: 'var(--nexus-muted-2)' }}>{u.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Suporte */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--nexus-text)' }}>
              Suporte e comunidade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  title: 'GitHub Issues',
                  desc: 'Reporte bugs e solicite funcionalidades',
                  link: 'https://github.com/claytonmarcelo/Nexus-Business-Manager/issues',
                  label: 'Abrir issue',
                },
                {
                  title: 'Código fonte',
                  desc: 'Explore e contribua com o repositório',
                  link: 'https://github.com/claytonmarcelo/Nexus-Business-Manager',
                  label: 'Ver repositório',
                },
                {
                  title: 'Pull Requests',
                  desc: 'Contribua com melhorias e novos recursos',
                  link: 'https://github.com/claytonmarcelo/Nexus-Business-Manager/pulls',
                  label: 'Contribuir',
                },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>
                    {s.title}
                  </h4>
                  <p className="text-xs mb-4" style={{ color: 'var(--nexus-muted-2)' }}>
                    {s.desc}
                  </p>
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors border w-full justify-center"
                    style={{
                      color: 'var(--nexus-gold)',
                      borderColor: 'rgba(var(--nexus-gold-rgb), 0.3)',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(var(--nexus-gold-rgb), 0.1)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {s.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Informações do sistema */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--nexus-text)' }}>
              Informações do sistema
            </h3>
            <div className="space-y-3.5">
              {[
                { label: 'Versão da aplicação', value: '1.0.0', icon: CpuChipIcon },
                { label: 'Ambiente', value: 'Desenvolvimento', icon: ServerIcon },
                { label: 'Última atualização', value: '08/06/2026', icon: ArrowPathIcon },
                { label: 'Módulos de API', value: `${apiModules.length} módulos`, icon: ServerStackIcon },
                { label: 'Banco de dados', value: 'MySQL 8.0 · Prisma 7', icon: CircleStackIcon },
                { label: 'Limite de usuários', value: 'Ilimitado (open source)', icon: UsersIcon },
                { label: 'Autenticação', value: 'JWT · 8h expiração', icon: KeyIcon },
                {
                  label: 'Status do sistema',
                  value: 'Operacional',
                  icon: ShieldCheckIcon,
                  isStatus: true,
                },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2" style={{ color: 'var(--nexus-muted-2)' }}>
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--nexus-gold)' }} />
                      <span className="text-xs">{item.label}</span>
                    </div>
                    {item.isStatus ? (
                      <div
                        className="flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: 'var(--nexus-success)' }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'var(--nexus-success)' }}
                        />
                        {item.value}
                      </div>
                    ) : (
                      <div className="text-xs text-right" style={{ color: 'var(--nexus-text)' }}>
                        {item.value}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tecnologias */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--nexus-text)' }}>
              Stack tecnológica
            </h3>
            <div className="space-y-4">
              {technologies.map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <Icon className="w-5 h-5" style={{ color: t.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--nexus-text)' }}>
                          {t.name}
                        </span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
                          style={{
                            background: 'rgba(var(--nexus-gold-rgb), 0.1)',
                            color: 'var(--nexus-muted-2)',
                          }}
                        >
                          {t.layer}
                        </span>
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--nexus-muted-2)' }}>
                        {t.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Módulos da API */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
              Módulos da API REST
            </h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--nexus-muted-2)' }}>
              Endpoints prefixados em <code className="text-[10px]" style={{ color: 'var(--nexus-gold)' }}>/api</code> — cada módulo com routes, controller e repository próprios.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {apiModules.map((mod, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-1 rounded-md font-mono"
                  style={{
                    background: 'rgba(var(--nexus-gold-rgb), 0.08)',
                    color: 'var(--nexus-gold)',
                    border: '1px solid rgba(var(--nexus-gold-rgb), 0.18)',
                  }}
                >
                  /{mod}
                </span>
              ))}
            </div>
          </div>

          {/* Créditos */}
          <div
            className="rounded-xl p-6 text-center"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
              Desenvolvido com <span className="text-red-500">❤️</span> por
            </p>
            <p className="text-base font-bold mb-1" style={{ color: 'var(--nexus-gold)' }}>
              Clayton Marcelo
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--nexus-muted-2)' }}>
              Projeto 100% open source · MIT License
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--nexus-muted-2)' }}>
              © 2026 Nexus Business Manager. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
