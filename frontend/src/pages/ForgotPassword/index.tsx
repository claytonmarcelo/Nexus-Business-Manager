import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLogo } from '../../components/AuthLogo';
import api from '../../services/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nexus-auth-page">
      <div className="w-full max-w-md">
        <AuthLogo />
        <div className="nexus-auth-card mx-4">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Recuperar Senha</h2>
          <p className="mb-6" style={{ color: 'var(--nexus-muted)' }}>
            {sent ? 'Verifique seu email para redefinir a senha.' : 'Informe seu email para receber o link de recuperacao.'}
          </p>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(125, 218, 106, 0.12)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--nexus-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm mb-6" style={{ color: 'var(--nexus-muted)' }}>
                Enviamos um email com instrucoes para redefinir sua senha.
              </p>
              <Link to="/login" className="text-sm font-medium" style={{ color: 'var(--nexus-gold)' }}>
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(216, 75, 95, 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(216, 75, 95, 0.2)' }}>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Email</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nexus-muted-2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    style={{ height: '56px' }}
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
                style={{ height: '52px', fontSize: '1rem' }}
              >
                {loading ? 'Enviando...' : 'Enviar link de recuperacao'}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--nexus-muted)' }}>
            Lembrou sua senha?{' '}
            <Link to="/login" className="font-medium transition-colors" style={{ color: 'var(--nexus-rose)' }}>
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
