import { useState } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function NexusAI() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou o Nexus AI, seu assistente inteligente. Como posso ajudar você hoje?',
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Entendi sua pergunta. Estou processando e em breve terei uma resposta para você.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--nexus-border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
          >
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--nexus-text)' }}>Nexus AI</h1>
            <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Assistente inteligente</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'text-white'
                  : ''
              }`}
              style={
                message.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))',
                    }
                  : {
                      background: 'var(--nexus-card)',
                      border: '1px solid var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }
              }
            >
              <div className="flex items-start gap-2">
                {message.role === 'assistant' && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
                  >
                    <SparklesIcon className="w-3 h-3" />
                  </div>
                )}
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
              <div className="text-xs mt-2" style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--nexus-muted)' }}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
                >
                  <SparklesIcon className="w-3 h-3" />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--nexus-gold)' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--nexus-gold)', animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--nexus-gold)', animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t" style={{ borderColor: 'var(--nexus-border)' }}>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua mensagem..."
              className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all duration-200"
              style={{
                background: 'var(--nexus-input-bg)',
                border: '1px solid rgba(var(--nexus-gold-rgb), 0.15)',
                color: 'var(--nexus-text)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb), 0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(var(--nexus-gold-rgb), 0.15)'}
            />
            <ChatBubbleLeftRightIcon className="w-5 h-5 absolute right-4 top-1/2 transform -translate-y-1/2" style={{ color: 'var(--nexus-muted)' }} />
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))',
              color: '#FFFFFF',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            {loading ? 'Enviando...' : 'Enviar'}
            <SparklesIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
