import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLogo } from '../../components/AuthLogo';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nexus-auth-page">
      <div className="w-full max-w-md">
        <AuthLogo />

        <div className="nexus-auth-card mx-4">
          <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>Criar nova conta</h2>
          <p className="mb-6" style={{ color: 'var(--nexus-muted)' }}>Preencha os dados para criar sua conta</p>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                style={{ height: '56px' }}
                placeholder="Seu nome"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                style={{ height: '56px' }}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--nexus-text)' }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ height: '56px' }}
                placeholder="Minimo 8 caracteres"
                required
                minLength={8}
                maxLength={64}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
              style={{ height: '52px', fontSize: '1rem' }}
            >
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--nexus-muted)' }}>
            Ja tem conta?{' '}
            <Link to="/login" className="font-medium transition-colors" style={{ color: 'var(--nexus-rose)' }}>
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
