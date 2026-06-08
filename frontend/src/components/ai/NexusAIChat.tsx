import { useState, useRef, useEffect } from 'react';
import { ChatMessage, sendChatMessage } from '../../services/ai.service';
import { NexusAIMessage } from './NexusAIMessage';
import { NexusAISuggestions } from './NexusAISuggestions';
import { useToast } from '../../contexts/ToastContext';

interface Props {
  module?: string;
  page?: string;
  onClose?: () => void;
}

export function NexusAIChat({ module, page, onClose }: Props) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      text: 'Ola! Sou o Nexus AI Assistant. Como posso ajudar voce hoje?',
      isUser: false,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(message?: string) {
    const text = (message || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), text, isUser: true };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatMessage(text, module, page);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: res.answer,
        isUser: false,
        suggestions: res.suggestions,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao comunicar com o assistente.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--nexus-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: 'var(--nexus-success)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--nexus-text)' }}>Nexus AI</span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ color: 'var(--nexus-muted-2)', fontSize: '0.875rem', cursor: 'pointer', background: 'none', border: 'none' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--nexus-text)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--nexus-muted-2)'}>
            Fechar
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((msg) => (
          <NexusAIMessage
            key={msg.id}
            text={msg.text}
            isUser={msg.isUser}
            suggestions={msg.suggestions}
            onSuggestionClick={(s) => handleSend(s)}
          />
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: 'rgba(var(--nexus-rose-rgb), 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: '0.75rem', height: '0.75rem', border: '2px solid var(--nexus-rose)', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 1s linear infinite' }} />
            </div>
            <div style={{ borderRadius: '1rem', padding: '0.625rem 1rem', background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)' }}>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: 'var(--nexus-muted-2)', animation: 'bounce 1s infinite' }} />
                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: 'var(--nexus-muted-2)', animation: 'bounce 1s infinite 0.15s' }} />
                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: 'var(--nexus-muted-2)', animation: 'bounce 1s infinite 0.3s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid var(--nexus-border)' }}>
        {messages.length === 1 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <NexusAISuggestions module={module} onSelect={(s) => handleSend(s)} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta..."
            style={{ flex: 1, padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', outline: 'none' }}
            disabled={loading}
            maxLength={2000}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: 'var(--nexus-text)', border: 'none', borderRadius: '10px', padding: '0.625rem 1rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem', opacity: loading || !input.trim() ? 0.5 : 1 }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
