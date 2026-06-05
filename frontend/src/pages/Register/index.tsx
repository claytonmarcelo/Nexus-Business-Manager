import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthLogo } from '../../components/AuthLogo';
import { Modal } from '../../components/Modal';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  function getPasswordStrength(password: string) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }

  function validateForm() {
    // Validar nome
    if (name.length < 3) {
      return { valid: false, message: 'Nome deve ter pelo menos 3 caracteres.' };
    }
    if (name.length > 100) {
      return { valid: false, message: 'Nome deve ter no máximo 100 caracteres.' };
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Email deve ter um formato válido.' };
    }

    // Validar senha
    if (password.length < 8) {
      return { valid: false, message: 'Senha deve ter pelo menos 8 caracteres.' };
    }
    if (password.length > 64) {
      return { valid: false, message: 'Senha deve ter no máximo 64 caracteres.' };
    }

    const strength = getPasswordStrength(password);
    if (strength < 3) {
      return { 
        valid: false, 
        message: 'Senha deve conter pelo menos: 8 caracteres, uma letra maiúscula, uma minúscula e um número.' 
      };
    }

    return { valid: true, message: '' };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Validar formulário antes de enviar
    const validation = validateForm();
    if (!validation.valid) {
      setModalType('error');
      setModalTitle('Dados Inválidos');
      setModalMessage(validation.message);
      setShowModal(true);
      return;
    }

    setLoading(true);

    try {
      await signUp(name, email, password);
      
      // Mostrar modal de sucesso
      setModalType('success');
      setModalTitle('Cadastrado com sucesso!');
      setModalMessage('Sua conta foi criada com sucesso. Você será redirecionado para o dashboard.');
      setShowModal(true);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erro ao cadastrar';
      
      let customMessage = errorMessage;
      
      // Personalizar mensagens de erro baseadas no backend
      if (errorMessage.includes('email')) {
        customMessage = 'Este email já está cadastrado no sistema.';
      } else if (errorMessage.includes('password')) {
        customMessage = 'A senha não atende aos requisitos de segurança.';
      } else if (errorMessage.includes('validation')) {
        customMessage = 'Dados fornecidos são inválidos. Verifique os campos.';
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        customMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }

      setModalType('error');
      setModalTitle('Erro no Cadastro');
      setModalMessage(customMessage);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  }

  function handleCloseModal() {
    setShowModal(false);
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
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                maxLength={64}
              />
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(183, 110, 121, 0.2)' }}>
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${(getPasswordStrength(password) / 6) * 100}%`,
                        background: getPasswordStrength(password) < 3 ? '#E57373' : 
                                   getPasswordStrength(password) < 5 ? '#D6B370' : '#4CAF50'
                      }} 
                    />
                  </div>
                  <div className="text-xs" style={{ 
                    color: getPasswordStrength(password) < 3 ? '#E57373' : 
                           getPasswordStrength(password) < 5 ? '#D6B370' : '#4CAF50'
                  }}>
                    {getPasswordStrength(password) < 3 ? 'Senha fraca' :
                     getPasswordStrength(password) < 5 ? 'Senha média' : 'Senha forte'}
                  </div>
                </div>
              )}
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
            <Link to="/login" className="text-brand-primary hover:text-brand-primaryHover font-medium transition-colors">
              Fazer login
            </Link>
          </p>
        </div>
      </div>

      {/* Modal de Feedback */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        autoClose={modalType === 'success'}
        autoCloseDelay={2000}
      />
    </div>
  );
}
