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
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #1A0D12 0%, #24171C 45%, #32252B 100%)' }}>
      <div className="w-full max-w-md">
        <AuthLogo />

        <div className="rounded-[18px] p-8 mx-4"
          style={{ background: 'rgba(50, 37, 43, 0.96)', border: '1px solid rgba(214, 179, 112, 0.22)', boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)' }}>
          <h2 className="text-2xl font-semibold mb-2" style={{ color: '#F7F2EC' }}>Criar conta</h2>
          <p className="mb-6" style={{ color: 'rgba(247, 242, 236, 0.72)' }}>Preencha os dados para se cadastrar</p>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#F7F2EC' }}>Nome</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Seu nome"
                required
                minLength={3}
              />
            </div>

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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
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
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'rgba(247, 242, 236, 0.72)' }}>
            Ja tem conta?{' '}
            <Link to="/login" className="text-brand-roseGold hover:text-brand-champagneGold font-medium transition-colors">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
