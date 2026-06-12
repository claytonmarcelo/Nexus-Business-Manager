import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { ImageUpload } from '../../components/ImageUpload';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  MapPinIcon,
  Cog6ToothIcon,
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
  const [companySettings, setCompanySettings] = useState({
    name: 'Nexus Business Manager',
    cnpj: '',
    phone: '',
    email: '',
    website: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Brasil',
    },
    logo: '/assets/Logo.png',
    favicon: '/assets/Logo.png',
  });

  async function handleSelect(t: 'dark' | 'light' | 'auto') {
    setSaving(true);
    setTheme(t);
    await new Promise((r) => setTimeout(r, 200));
    setSaving(false);
  }

  async function handleCompanySettingsSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Aqui você implementaria a chamada à API para salvar as configurações
    await new Promise((r) => setTimeout(r, 500));
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
            style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
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
                    ? 'linear-gradient(135deg, rgba(var(--nexus-gold-rgb), 0.12), rgba(var(--nexus-rose-rgb), 0.08))'
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
                      : 'rgba(var(--nexus-gold-rgb), 0.08)',
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="nexus-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' }}
            >
              <BuildingOfficeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>
                Configurações da Empresa
              </h2>
              <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
                Personalize as informações da sua empresa
              </p>
            </div>
          </div>

          <form onSubmit={handleCompanySettingsSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  value={companySettings.name}
                  onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--nexus-bg)',
                    borderColor: 'var(--nexus-border)',
                    color: 'var(--nexus-text)',
                  }}
                  placeholder="Digite o nome da empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
                  CNPJ
                </label>
                <input
                  type="text"
                  value={companySettings.cnpj}
                  onChange={(e) => setCompanySettings({ ...companySettings, cnpj: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--nexus-bg)',
                    borderColor: 'var(--nexus-border)',
                    color: 'var(--nexus-text)',
                  }}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
                  Telefone
                </label>
                <input
                  type="text"
                  value={companySettings.phone}
                  onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--nexus-bg)',
                    borderColor: 'var(--nexus-border)',
                    color: 'var(--nexus-text)',
                  }}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={companySettings.email}
                  onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--nexus-bg)',
                    borderColor: 'var(--nexus-border)',
                    color: 'var(--nexus-text)',
                  }}
                  placeholder="contato@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
                  Website
                </label>
                <input
                  type="url"
                  value={companySettings.website}
                  onChange={(e) => setCompanySettings({ ...companySettings, website: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
                  style={{
                    background: 'var(--nexus-bg)',
                    borderColor: 'var(--nexus-border)',
                    color: 'var(--nexus-text)',
                  }}
                  placeholder="https://www.empresa.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
                  Logo da Empresa
                </label>
                <ImageUpload
                  currentImage={companySettings.logo}
                  onImageChange={(url) => setCompanySettings({ ...companySettings, logo: url })}
                  label="Logo da Empresa"
                  size="lg"
                  aspectRatio="square"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
                  Favicon
                </label>
                <ImageUpload
                  currentImage={companySettings.favicon}
                  onImageChange={(url) => setCompanySettings({ ...companySettings, favicon: url })}
                  label="Favicon"
                  size="md"
                  aspectRatio="square"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--nexus-text)' }}>
                Endereço Completo
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>Rua</label>
                  <input
                    type="text"
                    value={companySettings.address.street}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: { ...companySettings.address, street: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      background: 'var(--nexus-bg)',
                      borderColor: 'var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }}
                    placeholder="Nome da rua"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>Número</label>
                  <input
                    type="text"
                    value={companySettings.address.number}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: { ...companySettings.address, number: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      background: 'var(--nexus-bg)',
                      borderColor: 'var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }}
                    placeholder="123"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>Complemento</label>
                  <input
                    type="text"
                    value={companySettings.address.complement}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: { ...companySettings.address, complement: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      background: 'var(--nexus-bg)',
                      borderColor: 'var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }}
                    placeholder="Apto, Bloco"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>Bairro</label>
                  <input
                    type="text"
                    value={companySettings.address.neighborhood}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: { ...companySettings.address, neighborhood: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      background: 'var(--nexus-bg)',
                      borderColor: 'var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }}
                    placeholder="Centro"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>CEP</label>
                  <input
                    type="text"
                    value={companySettings.address.zipCode}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: { ...companySettings.address, zipCode: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      background: 'var(--nexus-bg)',
                      borderColor: 'var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }}
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>Cidade</label>
                  <input
                    type="text"
                    value={companySettings.address.city}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: { ...companySettings.address, city: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      background: 'var(--nexus-bg)',
                      borderColor: 'var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }}
                    placeholder="São Paulo"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>Estado</label>
                  <input
                    type="text"
                    value={companySettings.address.state}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: { ...companySettings.address, state: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      background: 'var(--nexus-bg)',
                      borderColor: 'var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }}
                    placeholder="SP"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--nexus-muted)' }}>País</label>
                  <input
                    type="text"
                    value={companySettings.address.country}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: { ...companySettings.address, country: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all text-sm"
                    style={{
                      background: 'var(--nexus-bg)',
                      borderColor: 'var(--nexus-border)',
                      color: 'var(--nexus-text)',
                    }}
                    placeholder="Brasil"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-bronze))',
                  color: '#000',
                }}
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
