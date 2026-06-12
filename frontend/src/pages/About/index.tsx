import { motion } from 'framer-motion';
import {
  CubeIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BellIcon,
  ClipboardDocumentIcon,
  UsersIcon,
  CogIcon,
  CalendarIcon,
  CodeBracketIcon,
  ServerIcon,
  CpuChipIcon,
  BeakerIcon,
  BoltIcon,
  SparklesIcon,
  ShieldCheckIcon,
  LifebuoyIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

export function About() {
  const modules = [
    { name: 'Dashboard', desc: 'Visão geral do negócio', icon: ChartBarIcon },
    { name: 'Clientes', desc: 'Gestão de clientes', icon: UserGroupIcon },
    { name: 'Fornecedores', desc: 'Gestão de fornecedores', icon: ShoppingCartIcon },
    { name: 'Produtos', desc: 'Catálogo de produtos', icon: CubeIcon },
    { name: 'Estoque', desc: 'Controle de estoque', icon: ArchiveBoxIcon },
    { name: 'Compras', desc: 'Gestão de compras', icon: ShoppingCartIcon },
    { name: 'Vendas', desc: 'Gestão de vendas', icon: CurrencyDollarIcon },
    { name: 'CRM', desc: 'Relacionamento com clientes', icon: UserGroupIcon },
    { name: 'Financeiro', desc: 'Gestão financeira', icon: CurrencyDollarIcon },
    { name: 'Relatórios', desc: 'Relatórios e análises', icon: ChartBarIcon },
    { name: 'Notificações', desc: 'Central de alertas', icon: BellIcon },
    { name: 'Auditoria', desc: 'Logs e auditoria', icon: ClipboardDocumentIcon },
    { name: 'Usuários', desc: 'Gestão de usuários', icon: UsersIcon },
    { name: 'Configurações', desc: 'Configurações do sistema', icon: CogIcon },
    { name: 'Agenda', desc: 'Compromissos e tarefas', icon: CalendarIcon },
    { name: 'Backup', desc: 'Backup e restauração', icon: ArchiveBoxIcon },
    { name: 'Importação', desc: 'Importação de dados', icon: BoltIcon },
    { name: 'Nexus AI', desc: 'Inteligência artificial', icon: BeakerIcon },
  ];

  const technologies = [
    { name: 'React 18', desc: 'Biblioteca JavaScript para interfaces', icon: CodeBracketIcon },
    { name: 'TypeScript', desc: 'Linguagem de programação', icon: CodeBracketIcon },
    { name: 'Vite', desc: 'Build tool e dev server', icon: CpuChipIcon },
    { name: 'Tailwind CSS', desc: 'Framework CSS', icon: CodeBracketIcon },
    { name: 'Framer Motion', desc: 'Animações e transições', icon: SparklesIcon },
    { name: 'React Router', desc: 'Roteamento de páginas', icon: CodeBracketIcon },
    { name: 'Axios', desc: 'Cliente HTTP', icon: CodeBracketIcon },
    { name: 'Recharts', desc: 'Gráficos e visualizações', icon: ChartBarIcon },
    { name: 'Fastify', desc: 'Framework web backend', icon: ServerIcon },
    { name: 'Prisma ORM', desc: 'ORM para banco de dados', icon: ServerIcon },
    { name: 'MariaDB', desc: 'Banco de dados', icon: ServerIcon },
    { name: 'JWT Auth', desc: 'Autenticação JWT', icon: ShieldCheckIcon },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <h1 className="page-title">Sobre o Nexus Business Manager</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
          Sistema completo para gestão empresarial
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 nexus-card p-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <img src="/assets/Logo.png" alt="Nexus" className="w-24 h-24 object-contain" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--nexus-text)' }}>
                Nexus Business Manager
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--nexus-muted)' }}>
                Sistema de Gestão Empresarial
              </p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--nexus-muted)' }}>
                O Nexus Business Manager é uma plataforma completa e integrada para gestão empresarial, desenvolvida para ajudar empresas a controlar e otimizar todos os seus processos de forma eficiente.
              </p>
              <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>
                © 2026 Nexus Solutions. Todos os direitos reservados.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { icon: GlobeAltIcon, label: 'Website', value: 'www.nexus.com.br' },
              { icon: EnvelopeIcon, label: 'Email', value: 'contato@nexus.com.br' },
              { icon: PhoneIcon, label: 'Telefone', value: '(11) 99999-9999' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg p-3 flex items-center gap-3" style={{ background: 'var(--nexus-card-soft)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>{item.label}</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="nexus-card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
            Informações do Sistema
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Versão', value: '2.1.0' },
              { label: 'Ambiente', value: 'Produção' },
              { label: 'Data de instalação', value: '15/01/2024 08:30' },
              { label: 'Última atualização', value: '08/06/2026 23:30' },
              { label: 'Limite de usuários', value: 'Ilimitado' },
              { label: 'Usuários ativos', value: '1 usuário' },
              { label: 'Banco de dados', value: 'MariaDB' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{item.label}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{item.value}</span>
              </div>
            ))}

            <div className="py-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Armazenamento</span>
                <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>256 GB / 500 GB (51%)</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--nexus-border)' }}>
                <div className="h-full rounded-full" style={{ width: '51%', background: 'var(--nexus-gold)' }} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.15)', color: 'var(--nexus-gold)', border: '1px solid var(--nexus-gold)' }}>
                Empresarial
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid #22c55e' }}>
                Operacional
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="nexus-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
          Módulos do Sistema
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <div key={module.name} className="rounded-xl p-4 transition-all duration-200 hover:scale-105 flex flex-col items-center text-center" style={{ background: 'var(--nexus-card-soft)', border: '1px solid var(--nexus-border)', minHeight: '120px' }}>
                <Icon className="w-8 h-8 mb-3" style={{ color: 'var(--nexus-gold)' }} />
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--nexus-text)' }}>{module.name}</h4>
                <p className="text-xs leading-tight" style={{ color: 'var(--nexus-muted)' }}>{module.desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="nexus-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
          Tecnologias Utilizadas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {technologies.map((tech) => {
            const Icon = tech.icon;
            return (
              <div key={tech.name} className="rounded-xl p-4 transition-all duration-200 hover:scale-105 flex flex-col items-center text-center" style={{ background: 'var(--nexus-card-soft)', border: '1px solid var(--nexus-border)', minHeight: '120px' }}>
                <Icon className="w-8 h-8 mb-3" style={{ color: 'var(--nexus-gold)' }} />
                <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--nexus-text)' }}>{tech.name}</h4>
                <p className="text-xs leading-tight" style={{ color: 'var(--nexus-muted)' }}>{tech.desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        className="nexus-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
          Suporte e Contato
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: LifebuoyIcon, title: 'Suporte técnico', desc: 'Para dúvidas e suporte técnico', btn: 'Abrir chamado' },
            { icon: BookOpenIcon, title: 'Documentação', desc: 'Acesse a documentação completa', btn: 'Ver documentação' },
            { icon: ChatBubbleLeftRightIcon, title: 'Comunidade', desc: 'Participe da nossa comunidade', btn: 'Ir para comunidade' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl p-5 transition-all duration-200 hover:scale-105 flex flex-col items-center text-center" style={{ background: 'var(--nexus-card-soft)', border: '1px solid var(--nexus-border)', minHeight: '180px' }}>
                <Icon className="w-10 h-10 mb-3" style={{ color: 'var(--nexus-gold)' }} />
                <h4 className="text-base font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>{item.title}</h4>
                <p className="text-sm mb-4 leading-tight" style={{ color: 'var(--nexus-muted)' }}>{item.desc}</p>
                <button className="w-full py-2 rounded-lg text-sm font-semibold transition-all duration-200 mt-auto whitespace-nowrap" style={{ background: 'rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-gold)', border: '1px solid var(--nexus-gold)' }}>
                  {item.btn}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="nexus-card p-6"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HeartIcon className="w-6 h-6" style={{ color: 'var(--nexus-rose)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>
                Desenvolvido com ❤️ por Nexus Solutions
              </p>
              <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>
                Nosso compromisso é fornecer soluções inovadoras que impulsionam o sucesso do seu negócio.
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap" style={{ background: 'rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-gold)', border: '1px solid var(--nexus-gold)' }}>
            Saiba mais sobre nós
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
