import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const themeOptions = [
  {
    id: 'dark' as const,
    label: 'Escuro',
    description: 'Tema escuro oficial do Nexus',
    icon: MoonIcon,
  },
  {
    id: 'light' as const,
    label: 'Claro',
    description: 'Tema claro corporativo premium',
    icon: SunIcon,
  },
  {
    id: 'auto' as const,
    label: 'Automático',
    description: 'Segue a preferência do sistema',
    icon: ComputerDesktopIcon,
  },
];

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  async function handleSelect(t: 'dark' | 'light' | 'auto') {
    setSaving(true);
    setTheme(t);
    await new Promise((r) => setTimeout(r, 200));
    setSaving(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <h1 className="page-title">Configurações do Sistema</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
          Personalize sua experiência no Nexus Business Manager
        </p>
      </motion.div>

      <div className="nexus-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(212, 149, 86, 0.12)', color: 'var(--nexus-gold)' }}
          >
            <SunIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>
              Aparência
            </h2>
            <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
              Escolha entre tema escuro, claro ou automático
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.id;
            const isSaving = saving && isActive;

            return (
              <motion.button
                key={opt.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(opt.id)}
                disabled={isSaving}
                className="relative flex flex-col items-center text-center p-6 rounded-xl transition-all duration-200 disabled:opacity-60"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(212, 149, 86, 0.12), rgba(198, 90, 113, 0.08))'
                    : 'var(--nexus-card-soft)',
                  border: isActive
                    ? '1px solid var(--nexus-gold)'
                    : '1px solid var(--nexus-border)',
                  boxShadow: isActive ? 'var(--nexus-glow)' : 'none',
                }}
              >
                {isActive && (
                  <div
                    className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--nexus-gold)' }}
                  >
                    {isSaving ? (
                      <span className="text-xs text-white animate-spin">{'\u21BB'}</span>
                    ) : (
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                )}

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))'
                      : 'rgba(212, 149, 86, 0.08)',
                    color: isActive ? '#FFFFFF' : 'var(--nexus-muted)',
                  }}
                >
                  <Icon className="w-7 h-7" />
                </div>

                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: isActive ? 'var(--nexus-gold)' : 'var(--nexus-text)' }}
                >
                  {opt.label}
                </h3>
                <p className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                  {opt.description}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="nexus-card p-6">
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--nexus-text)' }}>
          Sobre o Tema
        </h2>
        <div className="space-y-2 text-sm" style={{ color: 'var(--nexus-muted)' }}>
          <p>
            <strong style={{ color: 'var(--nexus-gold)' }}>Escuro:</strong>{' '}
            Tema padrão do Nexus Business Manager. Fundo escuro com detalhes em dourado e rosa.
          </p>
          <p>
            <strong style={{ color: 'var(--nexus-gold)' }}>Claro:</strong>{' '}
            Tema claro corporativo premium. Mantém a identidade visual Nexus com fundo claro.
          </p>
          <p>
            <strong style={{ color: 'var(--nexus-gold)' }}>Automático:</strong>{' '}
            Alterna automaticamente entre escuro e claro baseado na configuração do seu dispositivo.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
