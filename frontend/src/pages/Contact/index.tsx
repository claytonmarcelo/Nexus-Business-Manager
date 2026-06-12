import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';

export function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/support/contact', { name, email, subject, message });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto px-4 py-16 text-center"
      >
        <div className="nexus-card p-10">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(var(--nexus-success-rgb), 0.12)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--nexus-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Mensagem enviada!</h2>
          <p className="mb-6" style={{ color: 'var(--nexus-muted)' }}>
            Recebemos sua mensagem e retornaremos em breve.
          </p>
          <button onClick={() => setSent(false)} className="btn-primary" style={{ height: '48px', padding: '0 2rem' }}>
            Enviar nova mensagem
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
      className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
    >
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--nexus-text)' }}>Fale Conosco</h1>
        <p className="text-lg" style={{ color: 'var(--nexus-muted)' }}>
          Tire dúvidas, envie sugestões ou solicite suporte
        </p>
      </div>

      <div className="nexus-card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                style={{ height: '48px' }}
                placeholder="Seu nome"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ height: '48px' }}
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Assunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-field"
              style={{ height: '48px' }}
              placeholder="Assunto da mensagem"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-field"
              style={{ minHeight: '150px', paddingTop: '12px' }}
              placeholder="Descreva sua dúvida ou solicitação..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full whitespace-nowrap"
            style={{ height: '52px', fontSize: '1rem' }}
          >
            {loading ? 'Enviando...' : 'Enviar Mensagem'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

