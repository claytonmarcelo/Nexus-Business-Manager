import { useState } from 'react';
import { NexusAIChat } from '../components/ai/NexusAIChat';
import { NexusAIPanel } from '../components/ai/NexusAIPanel';
import { SparklesIcon } from '@heroicons/react/24/solid';

type Tab = 'chat' | 'insights';

export function NexusAI() {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">Nexus AI Assistant</h1>
            <p className="text-brand-muted text-sm mt-0.5">Assistente inteligente do seu ERP</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('chat')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'chat'
              ? 'bg-brand-primary/20 text-brand-gold border border-brand-primary/40'
              : 'text-brand-muted border border-brand-border hover:text-brand-text'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setTab('insights')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'insights'
              ? 'bg-brand-primary/20 text-brand-gold border border-brand-primary/40'
              : 'text-brand-muted border border-brand-border hover:text-brand-text'
          }`}
        >
          Insights & Analise
        </button>
      </div>

      {tab === 'chat' ? (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--nexus-card-strong)',
            border: '1px solid var(--nexus-border)',
            boxShadow: 'var(--nexus-shadow)',
          }}
        >
          <div className="h-[600px]">
            <NexusAIChat />
          </div>
        </div>
      ) : (
        <NexusAIPanel />
      )}
    </div>
  );
}
