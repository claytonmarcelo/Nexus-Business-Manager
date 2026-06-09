import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLogo } from '../../components/AuthLogo';

function getPasswordStrength(password: string): { level: 'none' | 'weak' | 'medium' | 'strong' | 'very_strong'; label: string; color: string; bgColor: string; width: string } {
  if (!password) return { level: 'none', label: '', color: '', bgColor: '', width: '0%' };
  if (password.length < 8) return { level: 'weak', label: 'Fraca', color: 'var(--nexus-danger)', bgColor: 'var(--nexus-danger)', width: '25%' };

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (score === 4) return { level: 'very_strong', label: 'Muito Forte', color: 'var(--nexus-success)', bgColor: 'var(--nexus-success)', width: '100%' };
  if (score === 3) return { level: 'strong', label: 'Forte', color: 'var(--nexus-gold)', bgColor: 'var(--nexus-gold)', width: '75%' };
  if (score === 2) return { level: 'medium', label: 'Media', color: 'var(--nexus-rose-light)', bgColor: 'var(--nexus-rose-light)', width: '50%' };
  return { level: 'weak', label: 'Fraca', color: 'var(--nexus-danger)', bgColor: 'var(--nexus-danger)', width: '25%' };
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('message') === 'cadastro-sucesso') {
      setSuccessMessage('Cadastro realizado com sucesso! Faça login para acessar o sistema.');
    }
  }, [searchParams]);

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nexus-auth-page">
      <div className="w-full max-w-md">
        <AuthLogo />

        <div className="nexus-auth-card mx-4">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Acessar sistema</h2>
          <p className="mb-6" style={{ color: 'var(--nexus-muted)' }}>Informe seus dados para entrar</p>

          {successMessage && (
            <div className="px-4 py-3 rounded-lg mb-4 text-sm" style={{ background: 'rgba(var(--nexus-success-rgb), 0.12)', color: 'var(--nexus-success)', border: '1px solid rgba(var(--nexus-success-rgb), 0.2)' }}>{successMessage}</div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-lg mb-4 text-sm" style={{ background: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Senha</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--nexus-muted-2)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-12"
                  style={{ height: '56px' }}
                  placeholder="Sua senha"
                  required
                  minLength={8}
                  maxLength={64}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
                  style={{ color: 'var(--nexus-gold)' }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.15)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.bgColor }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: strength.color }}>
                    {strength.label && `Forca: ${strength.label}`}
                  </p>
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: 'var(--nexus-muted-2)' }}>Minimo 8 caracteres, maximo 64</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ height: '52px', fontSize: '1rem' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--nexus-muted)' }}>
            Nao tem conta?{' '}
            <Link to="/register" className="font-medium transition-colors" style={{ color: 'var(--nexus-rose)' }}>
              Fazer cadastro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
