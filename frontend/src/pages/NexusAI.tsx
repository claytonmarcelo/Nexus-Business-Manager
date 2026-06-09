import { useState } from 'react';
import { NexusAIChat } from '../components/ai/NexusAIChat';
import { NexusAIPanel } from '../components/ai/NexusAIPanel';
import { SparklesIcon } from '@heroicons/react/24/solid';

type Tab = 'chat' | 'insights';

export function NexusAI() {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}>
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>Nexus AI Assistant</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>Assistente inteligente do seu ERP</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setTab('chat')}
          style={{
            padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid',
            background: tab === 'chat' ? 'rgba(var(--nexus-gold-rgb), 0.2)' : 'transparent',
            borderColor: tab === 'chat' ? 'rgba(var(--nexus-gold-rgb), 0.4)' : 'var(--nexus-border)',
            color: tab === 'chat' ? 'var(--nexus-gold)' : 'var(--nexus-muted-2)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--nexus-text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = tab === 'chat' ? 'var(--nexus-gold)' : 'var(--nexus-muted-2)'}
        >
          Chat
        </button>
        <button
          onClick={() => setTab('insights')}
          style={{
            padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 500, border: '1px solid',
            background: tab === 'insights' ? 'rgba(var(--nexus-gold-rgb), 0.2)' : 'transparent',
            borderColor: tab === 'insights' ? 'rgba(var(--nexus-gold-rgb), 0.4)' : 'var(--nexus-border)',
            color: tab === 'insights' ? 'var(--nexus-gold)' : 'var(--nexus-muted-2)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--nexus-text)'}
          onMouseLeave={(e) => e.currentTarget.style.color = tab === 'insights' ? 'var(--nexus-gold)' : 'var(--nexus-muted-2)'}
        >
          Insights & Analise
        </button>
      </div>

      {tab === 'chat' ? (
        <div
          style={{
            borderRadius: '1rem', overflow: 'hidden',
            background: 'var(--nexus-card-strong)',
            border: '1px solid var(--nexus-border)',
          }}
        >
          <div style={{ height: '600px' }}>
            <NexusAIChat />
          </div>
        </div>
      ) : (
        <NexusAIPanel />
      )}
    </div>
  );
}
