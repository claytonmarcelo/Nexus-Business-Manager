import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLogo } from '../../components/AuthLogo';
import { PremiumInput } from '../../components/ui/PremiumInput';
import { GradientButton } from '../../components/ui/GradientButton';

function getPasswordStrength(password: string): { level: string; label: string; color: string; width: string } {
  if (!password) return { level: 'none', label: '', color: '', width: '0%' };
  if (password.length < 8) return { level: 'weak', label: 'Fraca', color: 'var(--nexus-danger)', width: '25%' };
  const score = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (score === 4) return { level: 'very_strong', label: 'Muito Forte', color: 'var(--nexus-success)', width: '100%' };
  if (score === 3) return { level: 'strong', label: 'Forte', color: 'var(--nexus-gold)', width: '75%' };
  if (score === 2) return { level: 'medium', label: 'Media', color: 'var(--nexus-rose)', width: '50%' };
  return { level: 'weak', label: 'Fraca', color: 'var(--nexus-danger)', width: '25%' };
}

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const strength = getPasswordStrength(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('As senhas nao conferem.'); return; }
    setLoading(true);
    try {
      await signUp(name, email, password, username, phone);
      // Redirecionar para login apÃ³s cadastro bem-sucedido
      navigate('/login?message=cadastro-sucesso');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nexus-auth-page">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AuthLogo />

        <div className="nexus-auth-card mx-4">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-2xl font-semibold mb-1"
            style={{ color: 'var(--nexus-text)' }}
          >
            Criar nova conta
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 text-sm"
            style={{ color: 'var(--nexus-muted-2)' }}
          >
            Preencha os dados para criar sua conta no Nexus
          </motion.p>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="px-4 py-3 rounded-xl mb-4 text-sm"
              style={{ background: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)', border: '1px solid rgba(var(--nexus-danger-rgb), 0.2)' }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <PremiumInput
              label="Nome Completo"
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              required minLength={3}
            />

            <PremiumInput
              label="Email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              required
            />

            <PremiumInput
              label="Usuário"
              placeholder="nome.usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />

            <PremiumInput
              label="Telefone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
            />

            <PremiumInput
              label="Senha"
              type="password"
              placeholder="Minimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              required minLength={8} maxLength={64}
            />

            {password && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.1)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: strength.width }}
                    transition={{ duration: 0.3 }}
                    style={{ background: strength.color }}
                  />
                </div>
                <p className="text-xs font-medium" style={{ color: strength.color }}>
                  {strength.label && `Forca: ${strength.label}`}
                </p>
              </motion.div>
            )}

            <PremiumInput
              label="Confirmar Senha"
              type="password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              required minLength={8} maxLength={64}
            />

            <GradientButton
              type="submit"
              loading={loading}
              className="w-full"
              style={{ height: '52px', fontSize: '1rem' }}
            >
              Criar Conta
            </GradientButton>
          </form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-center text-sm"
            style={{ color: 'var(--nexus-muted-2)' }}
          >
            Ja tem conta?{' '}
            <Link to="/login" className="font-medium transition-colors" style={{ color: 'var(--nexus-gold)' }}>
              Fazer Login
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}

