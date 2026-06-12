import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

interface Invoice {
  id: string;
  number: string;
  plan: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'canceled';
  due_date: string;
  paid_at?: string;
  pdf_url?: string;
}

const statusCfg: Record<string, { label: string; color: string; icon: any }> = {
  paid: { label: 'Pago', color: 'var(--nexus-success)', icon: CheckCircleIcon },
  pending: { label: 'Pendente', color: 'var(--nexus-warning)', icon: ClockIcon },
  overdue: { label: 'Vencido', color: 'var(--nexus-danger)', icon: ExclamationCircleIcon },
  canceled: { label: 'Cancelado', color: 'var(--nexus-muted-2)', icon: ReceiptPercentIcon },
};

const mockInvoices: Invoice[] = [
  { id: '1', number: 'FAT-2026-0001', plan: 'Pro', amount: 49, status: 'paid', due_date: '2026-06-01', paid_at: '2026-06-01' },
  { id: '2', number: 'FAT-2026-0002', plan: 'Pro', amount: 49, status: 'paid', due_date: '2026-05-01', paid_at: '2026-05-01' },
  { id: '3', number: 'FAT-2026-0003', plan: 'Pro', amount: 49, status: 'paid', due_date: '2026-04-01', paid_at: '2026-04-01' },
  { id: '4', number: 'FAT-2026-0004', plan: 'Pro', amount: 49, status: 'pending', due_date: '2026-07-01' },
];

export function Invoices() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      const res = await api.get('/subscription/invoices');
      setInvoices(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch {
      setInvoices(mockInvoices);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf(invoice: Invoice) {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    } else {
      showToast('Fatura indisponivel para download', 'info');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--nexus-text)' }}>Faturas</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--nexus-muted)' }}>
          Historico de pagamentos e faturas
        </p>
      </div>

      {invoices.length === 0 && !loading ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--nexus-muted-2)' }} />
          <p className="text-lg font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Nenhuma fatura encontrada</p>
          <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
            Suas faturas aparecerao aqui apos o primeiro pagamento.
          </p>
          <button
            onClick={() => navigate('/plans')}
            className="mt-4 px-4 py-2 text-sm font-medium rounded-xl"
            style={{ background: 'var(--nexus-card-soft)', color: 'var(--nexus-gold)', border: '1px solid var(--nexus-border)' }}
          >
            Ver Planos
          </button>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
          <div className="">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>Fatura</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>Plano</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>Vencimento</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>Valor</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>Acao</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const sc = statusCfg[inv.status] || statusCfg.pending;
                  const Icon = sc.icon;
                  return (
                    <tr key={inv.id} className="transition-colors hover:opacity-80"
                      style={{ borderBottom: '1px solid var(--nexus-border)' }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DocumentTextIcon className="w-4 h-4" style={{ color: 'var(--nexus-gold)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{inv.number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap" style={{ color: 'var(--nexus-text)' }}>{inv.plan}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap" style={{ color: 'var(--nexus-muted)' }}>{fmtDate(inv.due_date)}</td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--nexus-text)' }}>{fmtBRL(inv.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ background: `rgba(var(--nexus-success-rgb), 0.1)`, color: sc.color }}>
                          <Icon className="w-3.5 h-3.5" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {inv.status === 'paid' && (
                          <button
                            onClick={() => handleDownloadPdf(inv)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                            style={{ color: 'var(--nexus-muted)', border: '1px solid var(--nexus-border)' }}
                          >
                            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                            PDF
                          </button>
                        )}
                        {inv.status === 'pending' && (
                          <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap"
                            style={{ background: 'var(--nexus-gold)', color: '#000000' }}
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
