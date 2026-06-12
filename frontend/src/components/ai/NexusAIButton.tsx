import { useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';
import { NexusAIChat } from './NexusAIChat';
import { useLocation } from 'react-router-dom';

const moduleMap: Record<string, string> = {
  dashboard: 'dashboard',
  clients: 'clientes',
  suppliers: 'fornecedores',
  products: 'produtos',
  stock: 'estoque',
  purchases: 'compras',
  sales: 'vendas',
  financial: 'financeiro',
  appointments: 'agenda',
  reports: 'relatorios',
  notifications: 'notificacoes',
  audit: 'auditoria',
};

export function NexusAIButton() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const pathModule = location.pathname.split('/')[1];
  const moduleName = moduleMap[pathModule] || '';

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))',
          boxShadow: '0 4px 20px rgba(201,111,120,0.4)',
          bottom: '60px',
        }}
        title="Nexus AI Assistant"
      >
        <SparklesIcon className="w-4 h-4 text-white" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-4 h-[600px] max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--nexus-card-strong)',
              border: '1px solid var(--nexus-border)',
              boxShadow: 'var(--nexus-shadow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <NexusAIChat module={moduleName} page={location.pathname} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
