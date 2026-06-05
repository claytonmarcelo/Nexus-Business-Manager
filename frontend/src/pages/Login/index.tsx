import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLogo } from '../../components/AuthLogo';

function getPasswordStrength(password: string): { level: 'none' | 'weak' | 'medium' | 'strong' | 'very_strong'; label: string; color: string; bgColor: string; width: string } {
  if (!password) return { level: 'none', label: '', color: '', bgColor: '', width: '0%' };
  if (password.length < 8) return { level: 'weak', label: 'Fraca', color: '#A94442', bgColor: '#A94442', width: '25%' };

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (score === 4) return { level: 'very_strong', label: 'Muito Forte', color: '#85D5D2', bgColor: '#85D5D2', width: '100%' };
  if (score === 3) return { level: 'strong', label: 'Forte', color: '#3E958F', bgColor: '#3E958F', width: '75%' };
  if (score === 2) return { level: 'medium', label: 'Média', color: '#D6B370', bgColor: '#D6B370', width: '50%' };
  return { level: 'weak', label: 'Fraca', color: '#A94442', bgColor: '#A94442', width: '25%' };
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #050505 0%, #151515 45%, #242424 100%)' }}>
      <div className="w-full max-w-md">
        <AuthLogo />

        <div className="rounded-[18px] p-8 mx-4"
          style={{ background: 'rgba(36, 36, 36, 0.96)', border: '1px solid rgba(214, 179, 112, 0.22)', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)' }}>
          <h2 className="text-2xl font-semibold mb-2" style={{ color: '#F7F2EC' }}>Acessar sistema</h2>
          <p className="mb-6" style={{ color: 'rgba(247, 242, 236, 0.72)' }}>Informe seus dados para entrar</p>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#F7F2EC' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#F7F2EC' }}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Sua senha"
                  required
                  minLength={8}
                  maxLength={64}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: '#3E958F' }}
                  tabIndex={-1}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(62, 149, 143, 0.2)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, background: strength.bgColor }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: strength.color }}>
                    {strength.label && `Forca: ${strength.label}`}
                  </p>
                </div>
              )}
              <p className="text-xs mt-1" style={{ color: 'rgba(247, 242, 236, 0.55)' }}>Minimo 8 caracteres, maximo 64</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'rgba(247, 242, 236, 0.72)' }}>
            Nao tem conta?{' '}
            <Link to="/register" className="text-brand-primary hover:text-brand-primaryHover font-medium transition-colors">
              Fazer cadastro
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
