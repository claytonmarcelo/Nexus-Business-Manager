import { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function getPasswordStrength(password: string): { level: 'none' | 'weak' | 'medium' | 'strong'; label: string; color: string; width: string } {
  if (!password) return { level: 'none', label: '', color: '', width: '0%' };
  if (password.length < 8) return { level: 'weak', label: 'Fraca', color: 'bg-red-500', width: '25%' };

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (score >= 4) return { level: 'strong', label: 'Forte', color: 'bg-green-500', width: '100%' };
  if (score >= 2) return { level: 'medium', label: 'Media', color: 'bg-yellow-500', width: '60%' };
  return { level: 'weak', label: 'Fraca', color: 'bg-red-500', width: '25%' };
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F7F2EC] to-[#EEE6DD]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="Nexus Business Manager"
              className="w-[120px] sm:w-[150px] md:w-[180px] h-auto"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-brand-blackCherry">Nexus</h1>
          <p className="mt-2 text-brand-roseGold">Business Manager</p>
        </div>

        <div className="rounded-2xl p-8 bg-white border border-brand-champagneGold/45" style={{ boxShadow: '0 16px 40px rgba(26, 13, 18, 0.12)' }}>
          <h2 className="text-2xl font-semibold mb-2 text-brand-blackCherry">Acessar sistema</h2>
          <p className="mb-6 text-brand-blackCherry/80">Informe seus dados para entrar</p>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-brand-blackCherry">Email</label>
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
              <label className="block text-sm font-medium mb-1 text-brand-blackCherry">Senha</label>
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
                  style={{ color: '#B76E79' }}
                  tabIndex={-1}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                  <p className={`text-xs font-medium ${
                    strength.level === 'strong' ? 'text-green-600' :
                    strength.level === 'medium' ? 'text-yellow-600' :
                    strength.level === 'weak' ? 'text-red-600' : ''
                  }`}>
                    {strength.label && `Forca: ${strength.label}`}
                  </p>
                </div>
              )}
              <p className="text-xs mt-1 text-brand-graphiteWine/70">Minimo 8 caracteres, maximo 64</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
