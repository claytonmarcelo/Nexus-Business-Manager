import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckIcon } from '@heroicons/react/24/outline';

const steps = [
  {
    title: 'Complete seu Perfil',
    desc: 'Adicione seu nome, cargo e personalize seu avatar.',
    action: 'Ir para Perfil',
    route: '/profile',
  },
  {
    title: 'Configure sua Empresa',
    desc: 'Defina as informacoes da sua empresa e preferencias.',
    action: 'Configurar Empresa',
    route: '/settings',
  },
  {
    title: 'Adicione Produtos',
    desc: 'Cadastre seus produtos e servicos no catalogo.',
    action: 'Adicionar Produtos',
    route: '/products',
  },
  {
    title: 'Cadastre Clientes',
    desc: 'Importe ou cadastre seus clientes manualmente.',
    action: 'Cadastrar Clientes',
    route: '/clients',
  },
];

export function Onboarding() {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20"
      >
        <div className="nexus-card p-10 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Bem-vindo ao Nexus!</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--nexus-muted)' }}>
            Voce pode acessar o guia de boas-vindas a qualquer momento nas Configuracoes.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ height: '48px', padding: '0 2rem' }}>
            Ir para o Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="text-center mb-8">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(var(--nexus-gold-rgb), 0.15), rgba(var(--nexus-rose-rgb), 0.10))' }}
        >
          <svg className="w-10 h-10" style={{ color: 'var(--nexus-gold)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--nexus-text)' }}>Bem-vindo ao Nexus!</h1>
        <p className="text-lg" style={{ color: 'var(--nexus-muted)' }}>
          Complete estes passos para comecar a usar o sistema
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const done = completed.has(idx);
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="nexus-card p-5"
              style={{ borderColor: done ? 'var(--nexus-success)' : 'var(--nexus-border)', opacity: done ? 0.7 : 1 }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    background: done ? 'rgba(var(--nexus-success-rgb), 0.15)' : 'rgba(var(--nexus-gold-rgb), 0.12)',
                    color: done ? 'var(--nexus-success)' : 'var(--nexus-gold)',
                  }}
                >
                  {done ? <CheckIcon className="w-5 h-5" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>{step.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--nexus-muted-2)' }}>{step.desc}</p>
                </div>
                {!done && (
                  <button
                    onClick={() => {
                      setCompleted((prev) => new Set(prev).add(idx));
                      navigate(step.route);
                    }}
                    className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
                  >
                    {step.action}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
          style={{ height: '48px', padding: '0 2rem' }}
        >
          {completed.size === steps.length ? 'Ir para o Dashboard' : 'Ir para o Dashboard'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-6 py-2 text-sm font-medium rounded-lg"
          style={{ color: 'var(--nexus-muted)', border: '1px solid var(--nexus-border)' }}
        >
          Pular
        </button>
      </div>
    </motion.div>
  );
}
