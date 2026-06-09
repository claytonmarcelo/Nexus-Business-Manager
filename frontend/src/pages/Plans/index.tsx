import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, XMarkIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '/mes',
    description: 'Para empreendedores individuais',
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
    id: 'pro',
    name: 'Pro',
    price: 49,
    period: '/mes',
    description: 'Para empresas em crescimento',
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
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149,
    period: '/mes',
    description: 'Para empresas com necessidades avancadas',
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

export function Plans() {
  const { showToast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  async function loadCurrentPlan() {
    try {
      const res = await api.get('/subscription');
      setCurrentPlan(res.data?.plan || 'free');
    } catch {
      setCurrentPlan('free');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(planId: string) {
    if (planId === currentPlan) {
      showToast('Voce ja esta neste plano', 'info');
      return;
    }
    try {
      await api.post('/subscription/change', { plan: planId });
      showToast('Plano alterado com sucesso!', 'success');
      setCurrentPlan(planId);
    } catch {
      showToast('Erro ao alterar plano', 'error');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Planos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>
          Escolha o plano ideal para sua empresa
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <motion.div
              key={plan.id}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 flex flex-col relative overflow-hidden transition-all duration-200"
              style={{
                background: plan.highlighted
                  ? 'linear-gradient(135deg, rgba(var(--nexus-gold-rgb), 0.10), rgba(var(--nexus-rose-rgb), 0.06))'
                  : 'var(--nexus-card)',
                border: plan.highlighted
                  ? '1px solid var(--nexus-gold)'
                  : isCurrent
                    ? '1px solid var(--nexus-success)'
                    : '1px solid var(--nexus-border)',
                boxShadow: plan.highlighted ? 'var(--nexus-glow)' : 'var(--nexus-shadow)',
              }}
            >
              {plan.popular && (
                <div
                  className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--nexus-gold)', color: '#000000' }}
                >
                  Popular
                </div>
              )}
              {isCurrent && (
                <div
                  className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'var(--nexus-success)', color: '#000000' }}
                >
                  Atual
                </div>
              )}

              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>{plan.name}</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--nexus-muted)' }}>{plan.description}</p>

              <div className="mb-6">
                <span className="text-3xl font-bold" style={{ color: 'var(--nexus-gold)' }}>
                  {plan.price === 0 ? 'Gratuito' : `R$ ${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-sm" style={{ color: 'var(--nexus-muted-2)' }}>{plan.period}</span>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plans.find(p => p.id === 'enterprise')!.features.map((feat, i) => {
                  const has = plan.features.includes(feat);
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--nexus-muted)' }}>
                      {has ? (
                        <CheckIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--nexus-success)' }} />
                      ) : (
                        <XMarkIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--nexus-muted-2)' }} />
                      )}
                      {feat}
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={isCurrent}
                className="w-full py-3 text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isCurrent
                    ? 'var(--nexus-card-soft)'
                    : plan.highlighted
                      ? 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))'
                      : 'var(--nexus-card-soft)',
                  color: isCurrent ? 'var(--nexus-success)' : plan.highlighted ? '#000000' : 'var(--nexus-text)',
                  border: isCurrent ? '1px solid var(--nexus-success)' : plan.highlighted ? 'none' : '1px solid var(--nexus-border)',
                }}
              >
                <span className="inline-flex items-center gap-2">
                  {isCurrent ? 'Plano Atual' : plan.price === 0 ? 'Manter Gratuito' : 'Assinar'}
                  {!isCurrent && <ArrowRightIcon className="w-4 h-4" />}
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

