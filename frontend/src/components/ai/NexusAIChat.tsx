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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--nexus-border)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-brand-text">Nexus AI</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text transition-colors text-sm">
            Fechar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-rose/20 flex items-center justify-center">
              <span className="w-3 h-3 border-2 border-brand-rose border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="rounded-2xl px-4 py-2.5 bg-[rgba(24,22,22,0.94)] border border-brand-border">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-brand-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-brand-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-brand-muted animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="p-4 border-t" style={{ borderColor: 'var(--nexus-border)' }}>
        {messages.length === 1 && (
          <div className="mb-3">
            <NexusAISuggestions module={module} onSelect={(s) => handleSend(s)} />
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta..."
            className="input-field flex-1"
            disabled={loading}
            maxLength={2000}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="btn-primary px-4"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
