import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    name: 'Free',
    price: 'R$ 0',
    period: '/mes',
    desc: 'Para empreendedores individuais e microempresas',
    features: [
      'Ate 3 usuarios',
      'Ate 100 clientes',
      'Ate 500 produtos',
      'CRM basico',
      'Controle de estoque',
      'Relatorios simples',
      'Suporte por email',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 'R$ 49',
    period: '/mes',
    desc: 'Para pequenas e medias empresas em crescimento',
    features: [
      'Ate 15 usuarios',
      'Clientes ilimitados',
      'Produtos ilimitados',
      'CRM completo',
      'Financeiro integrado',
      'Relatorios avancados',
      'Nexus AI',
      'Suporte prioritario',
      'Multiempresa',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'R$ 149',
    period: '/mes',
    desc: 'Para empresas com necessidades avancadas',
    features: [
      'Usuarios ilimitados',
      'Tudo do plano Pro',
      'Auditoria completa',
      'API dedicada',
      'Backup automatico',
      'Importação em lote',
      'Personalizacao',
      'Suporte 24/7',
      'SLA garantido',
    ],
    highlighted: false,
  },
];

export function Pricing() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
    >
      <div className="text-center mb-16">
        <h1 className="text-3xl sm:text-2xl font-bold mb-4" style={{ color: 'var(--nexus-text)' }}>
          Planos e Precos
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--nexus-muted)' }}>
          Escolha o plano ideal para sua empresa. Todos os planos incluem 7 dias de teste gratuito.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="rounded-2xl p-5 flex flex-col relative overflow-hidden transition-all duration-200"
            style={{
              background: plan.highlighted
                ? 'linear-gradient(135deg, rgba(var(--nexus-gold-rgb), 0.10), rgba(var(--nexus-rose-rgb), 0.06))'
                : 'var(--nexus-card)',
              border: plan.highlighted
                ? '1px solid var(--nexus-gold)'
                : '1px solid var(--nexus-border)',
              boxShadow: plan.highlighted ? 'var(--nexus-glow)' : 'var(--nexus-shadow)',
            }}
          >
            {plan.highlighted && (
              <div
                className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'var(--nexus-gold)', color: '#000000' }}
              >
                Popular
              </div>
            )}

            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>{plan.name}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--nexus-muted)' }}>{plan.desc}</p>

            <div className="mb-6">
              <span className="text-3xl font-bold" style={{ color: 'var(--nexus-gold)' }}>{plan.price}</span>
              <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>{plan.period}</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-2 text-sm" style={{ color: 'var(--nexus-muted)' }}>
                  <CheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--nexus-success)' }} />
                  {feat}
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 text-sm font-semibold rounded-xl transition-all duration-200"
              style={{
                background: plan.highlighted
                  ? 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))'
                  : 'var(--nexus-card-soft)',
                color: plan.highlighted ? '#000000' : 'var(--nexus-text)',
                border: plan.highlighted ? 'none' : '1px solid var(--nexus-border)',
              }}
              onMouseEnter={(e) => { if (plan.highlighted) { e.currentTarget.style.transform = 'scale(1.02)'; } }}
              onMouseLeave={(e) => { if (plan.highlighted) { e.currentTarget.style.transform = 'scale(1)'; } }}
            >
              <span className="inline-flex items-center gap-2">
                {plan.name === 'Free' ? 'Comece Gratuitamente' : 'Testar Gratis'}
                <ArrowRightIcon className="w-4 h-4" />
              </span>
            </button>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
          Todos os planos incluem atualizacoes gratuitas e acesso ao codigo fonte.
          Sem taxa de cancelamento. Sem surpresas.
        </p>
      </div>
    </motion.div>
  );
}

