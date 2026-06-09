import { useState, FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { AuthLogo } from '../../components/AuthLogo';
import api from '../../services/api';

export function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas nao conferem');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter no minimo 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nexus-auth-page">
      <div className="w-full max-w-md">
        <AuthLogo />
        <div className="nexus-auth-card mx-4">
          {success ? (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(125, 218, 106, 0.12)' }}>
                  <svg className="w-8 h-8" style={{ color: 'var(--nexus-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Senha redefinida!</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--nexus-muted)' }}>
                  Sua senha foi alterada com sucesso.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary"
                  style={{ height: '48px', padding: '0 2rem' }}
                >
                  Fazer login
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Nova Senha</h2>
              <p className="mb-6" style={{ color: 'var(--nexus-muted)' }}>Crie uma nova senha para sua conta</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'rgba(216, 75, 95, 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(216, 75, 95, 0.2)' }}>
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Nova Senha</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nexus-muted-2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10"
                      style={{ height: '56px' }}
                      placeholder="Nova senha"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Confirmar Senha</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nexus-muted-2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field pl-10"
                      style={{ height: '56px' }}
                      placeholder="Confirme a nova senha"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                  style={{ height: '52px', fontSize: '1rem' }}
                >
                  {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm" style={{ color: 'var(--nexus-muted)' }}>
                <Link to="/login" className="font-medium transition-colors" style={{ color: 'var(--nexus-rose)' }}>
                  Voltar para o login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
