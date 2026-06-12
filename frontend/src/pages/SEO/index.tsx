import { useState } from 'react';
import { motion } from 'framer-motion';
import { ImageUpload } from '../../components/ImageUpload';
import {
  GlobeAltIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface PageSEO {
  path: string;
  title: string;
  description: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
}

const publicPages = [
  { path: '/', name: 'Página Inicial' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Cadastro' },
  { path: '/about', name: 'Sobre' },
];

export function SEO() {
  const [selectedPage, setSelectedPage] = useState('/');
  const [saving, setSaving] = useState(false);
  const [seoData, setSeoData] = useState<Record<string, PageSEO>>({
    '/': {
      path: '/',
      title: 'Nexus Business Manager - Sistema de Gestão Empresarial',
      description: 'Sistema de gestão empresarial completo e robusto para gerenciar seu negócio com eficiência.',
      keywords: 'gestão, empresarial, negócios, crm, erp, sistema',
      ogTitle: 'Nexus Business Manager',
      ogDescription: 'Sistema de gestão empresarial completo e robusto',
      ogImage: '/assets/Logo.png',
    },
    '/login': {
      path: '/login',
      title: 'Login - Nexus Business Manager',
      description: 'Acesse sua conta no Nexus Business Manager para gerenciar seu negócio.',
      keywords: 'login, acesso, conta, autenticação',
      ogTitle: 'Login - Nexus Business Manager',
      ogDescription: 'Acesse sua conta no Nexus Business Manager',
      ogImage: '/assets/Logo.png',
    },
    '/register': {
      path: '/register',
      title: 'Cadastro - Nexus Business Manager',
      description: 'Crie sua conta no Nexus Business Manager e comece a gerenciar seu negócio.',
      keywords: 'cadastro, registro, conta, criar conta',
      ogTitle: 'Cadastro - Nexus Business Manager',
      ogDescription: 'Crie sua conta no Nexus Business Manager',
      ogImage: '/assets/Logo.png',
    },
    '/about': {
      path: '/about',
      title: 'Sobre - Nexus Business Manager',
      description: 'Conheça mais sobre o Nexus Business Manager e como podemos ajudar seu negócio.',
      keywords: 'sobre, informações, empresa, nexus',
      ogTitle: 'Sobre - Nexus Business Manager',
      ogDescription: 'Conheça mais sobre o Nexus Business Manager',
      ogImage: '/assets/Logo.png',
    },
  });

  const currentSeo = seoData[selectedPage] || seoData['/'];

  const calculateSEOScore = (seo: PageSEO) => {
    let score = 0;
    let issues: string[] = [];

    // Título
    if (seo.title.length >= 50 && seo.title.length <= 60) {
      score += 25;
    } else if (seo.title.length > 0) {
      score += 10;
      issues.push('Título deve ter entre 50-60 caracteres');
    } else {
      issues.push('Título não definido');
    }

    // Descrição
    if (seo.description.length >= 150 && seo.description.length <= 160) {
      score += 25;
    } else if (seo.description.length > 0) {
      score += 10;
      issues.push('Descrição deve ter entre 150-160 caracteres');
    } else {
      issues.push('Descrição não definida');
    }

    // Palavras-chave
    if (seo.keywords.length > 0) {
      score += 20;
    } else {
      issues.push('Palavras-chave não definidas');
    }

    // Open Graph
    if (seo.ogTitle.length > 0 && seo.ogDescription.length > 0 && seo.ogImage.length > 0) {
      score += 30;
    } else {
      issues.push('Open Graph incompleto');
    }

    return { score, issues };
  };

  const { score, issues } = calculateSEOScore(currentSeo);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
  };

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
        <h1 className="page-title">Configurações de SEO</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
          Otimize o sistema para mecanismos de busca para cada página pública
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="nexus-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)' }}>
            <GlobeAltIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>
              Selecionar Página
            </h2>
            <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
              Escolha a página para configurar o SEO individualmente
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {publicPages.map((page) => (
            <button
              key={page.path}
              onClick={() => setSelectedPage(page.path)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPage === page.path
                  ? 'text-black'
                  : ''
              }`}
              style={{
                background: selectedPage === page.path
                  ? 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-bronze))'
                  : 'var(--nexus-card-soft)',
                border: selectedPage === page.path ? 'none' : '1px solid var(--nexus-border)',
                color: selectedPage === page.path ? '#000' : 'var(--nexus-text)',
              }}
            >
              {page.name}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="nexus-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)' }}>
              <MagnifyingGlassIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>
                SEO: {publicPages.find(p => p.path === selectedPage)?.name}
              </h2>
              <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
                Pontuação: {score}/100
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: score >= 80 ? 'rgba(34, 197, 94, 0.1)' : score >= 50 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'}` }}>
            {score >= 80 ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            ) : score >= 50 ? (
              <MagnifyingGlassIcon className="w-5 h-5 text-yellow-500" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
            <span className="font-semibold" style={{ color: score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444' }}>{score}%</span>
          </div>
        </div>

        {issues.length > 0 && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#ef4444' }}>Sugestões de Melhoria:</h3>
            <ul className="space-y-1">
              {issues.map((issue, index) => (
                <li key={index} className="text-sm" style={{ color: '#ef4444' }}>
                  • {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
              Título da Página
            </label>
            <input
              type="text"
              value={currentSeo.title}
              onChange={(e) => setSeoData({ ...seoData, [selectedPage]: { ...currentSeo, title: e.target.value } })}
              className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={{
                background: 'var(--nexus-bg)',
                borderColor: 'var(--nexus-border)',
                color: 'var(--nexus-text)',
              }}
              placeholder="Título otimizado para SEO"
              maxLength={60}
            />
            <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--nexus-muted)' }}>
              <span>Recomendado: 50-60 caracteres</span>
              <span>{currentSeo.title.length}/60</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
              Descrição Meta
            </label>
            <textarea
              value={currentSeo.description}
              onChange={(e) => setSeoData({ ...seoData, [selectedPage]: { ...currentSeo, description: e.target.value } })}
              className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
              style={{
                background: 'var(--nexus-bg)',
                borderColor: 'var(--nexus-border)',
                color: 'var(--nexus-text)',
              }}
              placeholder="Descrição otimizada para SEO"
              rows={3}
              maxLength={160}
            />
            <div className="flex justify-between mt-1 text-xs" style={{ color: 'var(--nexus-muted)' }}>
              <span>Recomendado: 150-160 caracteres</span>
              <span>{currentSeo.description.length}/160</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
              Palavras-chave
            </label>
            <input
              type="text"
              value={currentSeo.keywords}
              onChange={(e) => setSeoData({ ...seoData, [selectedPage]: { ...currentSeo, keywords: e.target.value } })}
              className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={{
                background: 'var(--nexus-bg)',
                borderColor: 'var(--nexus-border)',
                color: 'var(--nexus-text)',
              }}
              placeholder="palavra1, palavra2, palavra3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
              Título Open Graph
            </label>
            <input
              type="text"
              value={currentSeo.ogTitle}
              onChange={(e) => setSeoData({ ...seoData, [selectedPage]: { ...currentSeo, ogTitle: e.target.value } })}
              className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all"
              style={{
                background: 'var(--nexus-bg)',
                borderColor: 'var(--nexus-border)',
                color: 'var(--nexus-text)',
              }}
              placeholder="Título para redes sociais"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
              Descrição Open Graph
            </label>
            <textarea
              value={currentSeo.ogDescription}
              onChange={(e) => setSeoData({ ...seoData, [selectedPage]: { ...currentSeo, ogDescription: e.target.value } })}
              className="w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none"
              style={{
                background: 'var(--nexus-bg)',
                borderColor: 'var(--nexus-border)',
                color: 'var(--nexus-text)',
              }}
              placeholder="Descrição para redes sociais"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--nexus-text)' }}>
              Imagem Open Graph
            </label>
            <ImageUpload
              currentImage={currentSeo.ogImage}
              onImageChange={(url) => setSeoData({ ...seoData, [selectedPage]: { ...currentSeo, ogImage: url } })}
              label="Imagem para redes sociais"
              size="lg"
              aspectRatio="landscape"
            />
          </div>

          <div className="p-4 rounded-lg" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.08)', border: '1px solid var(--nexus-gold)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--nexus-gold)' }}>Preview do Anúncio em Tempo Real</h3>
            <div className="bg-white rounded-lg p-3 max-w-md">
              <div className="flex items-start gap-3">
                {currentSeo.ogImage && (
                  <img src={currentSeo.ogImage} alt="Preview" className="w-20 h-20 object-cover rounded" />
                )}
                <div className="flex-1">
                  <div className="text-xs text-gray-500 uppercase">www.nexusbusinessmanager.com{selectedPage}</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">{currentSeo.ogTitle || currentSeo.title}</div>
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">{currentSeo.ogDescription || currentSeo.description}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-bronze))',
                color: '#000',
              }}
            >
              {saving ? 'Salvando...' : 'Salvar Configurações SEO'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
