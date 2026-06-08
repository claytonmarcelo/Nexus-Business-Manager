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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

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
  ];

  const technologies = [
    { name: 'React 18', desc: 'Biblioteca JavaScript para interfaces', icon: CodeBracketIcon },
    { name: 'TypeScript', desc: 'Linguagem de programação', icon: CodeBracketIcon },
    { name: 'Node.js', desc: 'Runtime JavaScript', icon: ServerIcon },
    { name: 'PostgreSQL', desc: 'Banco de dados', icon: ServerIcon },
    { name: 'Tailwind CSS', desc: 'Framework CSS', icon: CodeBracketIcon },
    { name: 'Vite', desc: 'Build tool e dev server', icon: CpuChipIcon },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-6"
      style={{ background: 'var(--nexus-bg)' }}
    >
      {/* Cabeçalho */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--nexus-text)' }}>
          Sobre o Nexus Business Manager
        </h1>
        <p className="text-base" style={{ color: 'var(--nexus-muted)' }}>
          Sistema completo para gestão empresarial
        </p>
      </motion.div>

      {/* Primeiro Bloco - Card Principal */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Coluna Esquerda - Logo e Informações */}
        <div className="lg:col-span-2 rounded-2xl p-6 relative"
          style={{ background: 'var(--nexus-card)', border: '1px solid rgba(212,149,86,0.25)' }}>
          {/* Badge de Versão */}
          <div className="absolute top-4 right-4 px-3 py-1 rounded-lg text-xs font-semibold"
            style={{ background: '#0B0D10', border: '1px solid #D49556', color: '#D49556' }}>
            Versão 2.4.1
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img src="/logo.png" alt="Nexus" className="w-24 h-24" />
            </div>

            {/* Informações */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>
                Nexus Business Manager
              </h2>
              <p className="text-sm mb-4" style={{ color: '#A8A8A8' }}>
                Sistema de Gestão Empresarial
              </p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#A8A8A8' }}>
                O Nexus Business Manager é uma plataforma completa e integrada para gestão empresarial, desenvolvida para ajudar empresas a controlar e otimizar todos os seus processos de forma eficiente.
              </p>
              <p className="text-xs" style={{ color: '#A8A8A8' }}>
                © 2026 Nexus Solutions. Todos os direitos reservados.
              </p>
            </div>
          </div>

          {/* Informações de Contato */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { icon: GlobeAltIcon, label: 'Website', value: 'www.nexus.com.br' },
              { icon: EnvelopeIcon, label: 'Email', value: 'contato@nexus.com.br' },
              { icon: PhoneIcon, label: 'Telefone', value: '(11) 99999-9999' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg p-3 flex items-center gap-3"
                  style={{ background: 'rgba(212,149,86,0.08)', border: '1px solid rgba(212,149,86,0.15)' }}>
                  <Icon className="w-5 h-5" style={{ color: '#D49556' }} />
                  <div>
                    <p className="text-xs" style={{ color: '#A8A8A8' }}>{item.label}</p>
                    <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita - Informações do Sistema */}
        <div className="rounded-2xl p-6"
          style={{ background: 'var(--nexus-card)', border: '1px solid rgba(212,149,86,0.25)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
            Informações do Sistema
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Versão', value: '2.4.1' },
              { label: 'Ambiente', value: 'Produção' },
              { label: 'Data de instalação', value: '15/01/2024 08:30' },
              { label: 'Última atualização', value: '05/06/2026 14:20' },
              { label: 'Limite de usuários', value: '50 usuários' },
              { label: 'Usuários ativos', value: '24 usuários' },
              { label: 'Banco de dados', value: 'PostgreSQL 15.4' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-2"
                style={{ borderBottom: '1px solid rgba(212,149,86,0.1)' }}>
                <span className="text-sm" style={{ color: '#A8A8A8' }}>{item.label}</span>
                <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{item.value}</span>
              </div>
            ))}

            {/* Armazenamento */}
            <div className="py-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm" style={{ color: '#A8A8A8' }}>Armazenamento</span>
                <span className="text-sm font-medium" style={{ color: '#FFFFFF' }}>256 GB / 500 GB (51%)</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(212,149,86,0.1)' }}>
                <div className="h-full rounded-full" style={{ width: '51%', background: '#D49556' }} />
              </div>
            </div>

            {/* Licença e Status */}
            <div className="flex gap-2 pt-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(125,218,106,0.15)', color: '#7DDA6A', border: '1px solid rgba(125,218,106,0.3)' }}>
                Empresarial
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(125,218,106,0.15)', color: '#7DDA6A', border: '1px solid rgba(125,218,106,0.3)' }}>
                Operacional
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Terceiro Bloco - Módulos do Sistema */}
      <motion.div variants={itemVariants} className="mb-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
          Módulos do Sistema
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <div key={module.name} className="rounded-xl p-4 transition-all duration-200 hover:scale-105"
                style={{ background: 'var(--nexus-card)', border: '1px solid rgba(212,149,86,0.15)' }}>
                <Icon className="w-6 h-6 mb-2" style={{ color: '#D49556' }} />
                <h4 className="text-sm font-semibold mb-1" style={{ color: '#FFFFFF' }}>{module.name}</h4>
                <p className="text-xs" style={{ color: '#A8A8A8' }}>{module.desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Quarto Bloco - Tecnologias Utilizadas */}
      <motion.div variants={itemVariants} className="mb-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
          Tecnologias Utilizadas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {technologies.map((tech) => {
            const Icon = tech.icon;
            return (
              <div key={tech.name} className="rounded-xl p-4 flex items-center gap-4"
                style={{ background: 'var(--nexus-card)', border: '1px solid rgba(212,149,86,0.15)' }}>
                <Icon className="w-8 h-8" style={{ color: '#D49556' }} />
                <div>
                  <h4 className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>{tech.name}</h4>
                  <p className="text-xs" style={{ color: '#A8A8A8' }}>{tech.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Quinto Bloco - Suporte e Contato */}
      <motion.div variants={itemVariants} className="mb-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: '#FFFFFF' }}>
          Suporte e Contato
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: LifebuoyIcon, title: 'Suporte técnico', desc: 'Para dúvidas e suporte técnico', btn: 'Abrir chamado' },
            { icon: BookOpenIcon, title: 'Documentação', desc: 'Acesse a documentação completa', btn: 'Ver documentação' },
            { icon: ChatBubbleLeftRightIcon, title: 'Comunidade', desc: 'Participe da nossa comunidade', btn: 'Ir para comunidade' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl p-5"
                style={{ background: 'var(--nexus-card)', border: '1px solid rgba(212,149,86,0.15)' }}>
                <Icon className="w-8 h-8 mb-3" style={{ color: '#D49556' }} />
                <h4 className="text-base font-semibold mb-2" style={{ color: '#FFFFFF' }}>{item.title}</h4>
                <p className="text-sm mb-4" style={{ color: '#A8A8A8' }}>{item.desc}</p>
                <button className="w-full py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{ background: 'rgba(212,149,86,0.15)', color: '#D49556', border: '1px solid rgba(212,149,86,0.25)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,149,86,0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(212,149,86,0.15)'}>
                  {item.btn}
                </button>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Sexto Bloco - Rodapé Institucional */}
      <motion.div variants={itemVariants} className="rounded-2xl p-6"
        style={{ background: 'var(--nexus-card)', border: '1px solid rgba(212,149,86,0.25)' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HeartIcon className="w-6 h-6" style={{ color: '#C65A71' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                Desenvolvido com ❤️ por Nexus Solutions
              </p>
              <p className="text-xs" style={{ color: '#A8A8A8' }}>
                Nosso compromisso é fornecer soluções inovadoras que impulsionam o sucesso do seu negócio.
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{ background: 'rgba(212,149,86,0.15)', color: '#D49556', border: '1px solid rgba(212,149,86,0.25)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,149,86,0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(212,149,86,0.15)'}>
            Saiba mais sobre nós
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
