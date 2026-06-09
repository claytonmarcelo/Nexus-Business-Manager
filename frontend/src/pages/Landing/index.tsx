import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CubeIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const features = [
  { icon: UserGroupIcon, title: 'CRM Completo', desc: 'Gestao de clientes com historico de interacoes, vendas e preferencias.' },
  { icon: CubeIcon, title: 'Estoque em Tempo Real', desc: 'Controle de produtos, lotes e movimentacoes com atualizacao automatica.' },
  { icon: CurrencyDollarIcon, title: 'Financeiro Integrado', desc: 'Fluxo de caixa, contas a pagar/receber e DRE completo.' },
  { icon: ChartBarIcon, title: 'Relatorios Gerenciais', desc: 'Dashboard com KPIs, graficos e exportacao em PDF/Excel.' },
  { icon: BuildingOfficeIcon, title: 'Multiempresa', desc: 'Gerencie varias empresas em uma unica instalacao com dados isolados.' },
  { icon: ShieldCheckIcon, title: 'Seguranca e Auditoria', desc: 'Controle de permissoes, auditoria de acoes e criptografia.' },
  { icon: CalendarDaysIcon, title: 'Agenda', desc: 'Agendamento de servicos, compromissos e notificações.' },
  { icon: SparklesIcon, title: 'Nexus AI', desc: 'Assistente inteligente para análise de dados e suporte.' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Landing() {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 20% 30%, rgba(var(--nexus-gold-rgb), 0.10), transparent 50%), radial-gradient(circle at 80% 70%, rgba(var(--nexus-rose-rgb), 0.08), transparent 50%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div variants={itemVariants} className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-8 flex justify-center"
            >
              <img src="/logo.png" alt="Nexus" className="h-16 sm:h-20 w-auto" />
            </motion.div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span style={{ color: 'var(--nexus-text)' }}>Gestao Empresarial </span>
              <span style={{ color: 'var(--nexus-gold)' }}>Completa e Gratuita</span>
            </h1>
            <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--nexus-muted)' }}>
              O ERP SaaS de codigo aberto que unifica CRM, Estoque, Financeiro, Vendas e muito mais.
              Profissional, seguro e 100% gratuito.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3.5 text-base font-semibold rounded-xl transition-all duration-200 inline-flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))',
                  color: '#FFFFFF',
              boxShadow: 'var(--nexus-glow)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(var(--nexus-gold-rgb), 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--nexus-glow)'; }}
              >
                Comece Gratuitamente
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/about')}
                className="px-8 py-3.5 text-base font-semibold rounded-xl transition-all duration-200"
                style={{ color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
              >
                Saiba Mais
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.section variants={itemVariants} className="py-20" style={{ background: 'var(--nexus-bg-soft)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--nexus-text)' }}>
              Tudo que sua empresa precisa
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--nexus-muted)' }}>
              Modulos integrados que trabalham juntos para centralizar sua gestao
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="rounded-xl p-6 transition-all duration-200"
                style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>{feat.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl p-10 sm:p-16 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(var(--nexus-gold-rgb), 0.08), rgba(var(--nexus-rose-rgb), 0.06))',
              border: '1px solid var(--nexus-border)',
            }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: 'var(--nexus-text)' }}>
              Pronto para transformar sua gestao?
            </h2>
            <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'var(--nexus-muted)' }}>
              Cadastre-se gratuitamente e comece a usar o Nexus Business Manager hoje mesmo.
            </p>
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 text-base font-semibold rounded-xl transition-all duration-200 inline-flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))',
                color: '#FFFFFF',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Criar Conta Gratuita
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.section>

      <motion.section variants={itemVariants} className="py-16" style={{ background: 'var(--nexus-bg-soft)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: 'var(--nexus-text)' }}>
              Por que escolher o Nexus?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { value: '100%', label: 'Gratuito', desc: 'Codigo aberto sem taxas ou assinaturas' },
              { value: '8+', label: 'Modulos', desc: 'CRM, Estoque, Financeiro e mais integrados' },
              { value: 'Multi', label: 'Empresas', desc: 'Gerencie quantas empresas precisar' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold mb-2" style={{ color: 'var(--nexus-gold)' }}>{stat.value}</div>
                <div className="text-lg font-semibold mb-1" style={{ color: 'var(--nexus-text)' }}>{stat.label}</div>
                <div className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

