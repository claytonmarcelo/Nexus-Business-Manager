import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

export function Subscription() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    try {
      const res = await api.get('/subscription');
      setSubscription(res.data || {
        plan: 'free',
        status: 'active',
        start_date: new Date().toISOString(),
        next_billing: new Date(Date.now() + 30 * 86400000).toISOString(),
        users_used: 2,
        users_limit: 3,
        payment_method: null,
      });
    } catch {
      setSubscription({
        plan: 'free',
        status: 'active',
        start_date: new Date().toISOString(),
        next_billing: new Date(Date.now() + 30 * 86400000).toISOString(),
        users_used: 2,
        users_limit: 3,
        payment_method: null,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return;
    try {
      await api.post('/subscription/cancel');
      showToast('Assinatura cancelada', 'success');
      loadSubscription();
    } catch {
      showToast('Erro ao cancelar assinatura', 'error');
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Carregando...</div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: 'Ativa', color: 'var(--nexus-success)', icon: CheckCircleIcon },
    pending: { label: 'Pendente', color: 'var(--nexus-warning)', icon: ClockIcon },
    canceled: { label: 'Cancelada', color: 'var(--nexus-danger)', icon: ExclamationCircleIcon },
  };

  const statusInfo = statusConfig[subscription?.status] || statusConfig.active;
  const StatusIcon = statusInfo.icon;
  const isPaid = subscription?.plan !== 'free';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Minha Assinatura</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>
            Gerencie seu plano e pagamentos
          </p>
        </div>
        <button
          onClick={() => navigate('/plans')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))',
            color: '#000000',
          }}
        >
          Mudar de Plano
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          className="rounded-2xl p-6 md:col-span-2 space-y-6"
          style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Plano</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--nexus-text)' }}>
                {subscription?.plan === 'free' ? 'Free' : subscription?.plan === 'pro' ? 'Pro' : 'Enterprise'}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'rgba(var(--nexus-success-rgb), 0.1)', color: statusInfo.color }}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ background: 'var(--nexus-card-soft)' }}>
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--nexus-muted)' }}>
                <CalendarDaysIcon className="w-4 h-4" />
                Inicio
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>
                {fmtDate(subscription?.start_date)}
              </p>
            </div>
            {isPaid && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--nexus-card-soft)' }}>
                <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--nexus-muted)' }}>
                  <CalendarDaysIcon className="w-4 h-4" />
                  Proximo Ciclo
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>
                  {fmtDate(subscription?.next_billing)}
                </p>
              </div>
            )}
            <div className="p-4 rounded-xl" style={{ background: 'var(--nexus-card-soft)' }}>
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--nexus-muted)' }}>
                <UsersIcon className="w-4 h-4" />
                Usuarios
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>
                {subscription?.users_used} / {subscription?.users_limit}
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--nexus-card-soft)' }}>
              <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--nexus-muted)' }}>
                <CurrencyDollarIcon className="w-4 h-4" />
                Valor
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>
                {isPaid ? fmtBRL(subscription?.plan === 'pro' ? 49 : 149) : 'Gratuito'}
              </p>
            </div>
          </div>

          {isPaid && subscription?.payment_method && (
            <div className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: 'var(--nexus-card-soft)', border: '1px solid var(--nexus-border)' }}>
              <CreditCardIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>
                  {subscription.payment_method.brand} •••• {subscription.payment_method.last4}
                </p>
                <p className="text-xs" style={{ color: 'var(--nexus-muted)' }}>
                  Vence {subscription.payment_method.expiry}
                </p>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate('/invoices')}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200"
                style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
              >
                Ver Faturas
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
                style={{ color: 'var(--nexus-danger)', border: '1px solid var(--nexus-danger)' }}
              >
                Cancelar Assinatura
              </button>
            </div>
          )}
        </motion.div>

        <motion.div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>Resumo da Conta</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--nexus-muted)' }}>Plano</span>
              <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>
                {subscription?.plan === 'free' ? 'Free' : subscription?.plan === 'pro' ? 'Pro' : 'Enterprise'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--nexus-muted)' }}>Status</span>
              <span className="font-medium" style={{ color: statusInfo.color }}>{statusInfo.label}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--nexus-muted)' }}>Usuarios</span>
              <span className="font-medium" style={{ color: 'var(--nexus-text)' }}>
                {subscription?.users_used}/{subscription?.users_limit}
              </span>
            </div>
            <div className="border-t pt-3" style={{ borderColor: 'var(--nexus-border)' }}>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--nexus-muted)' }}>Valor</span>
                <span className="font-bold" style={{ color: 'var(--nexus-gold)' }}>
                  {isPaid ? fmtBRL(subscription?.plan === 'pro' ? 49 : 149) : 'Gratuito'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
