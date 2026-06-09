import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/about', label: 'Sobre' },
  { to: '/pricing', label: 'Planos' },
  { to: '/contact', label: 'Contato' },
];

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--nexus-bg' }}>
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ background: 'rgba(5, 7, 10, 0.85)', borderColor: 'var(--nexus-border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Nexus" className="h-10 w-auto" />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ color: 'var(--nexus-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--nexus-gold)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--nexus-muted)'; }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{ color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)' }}
              >
                Entrar
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))',
                  color: '#FFFFFF',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-bronze))';
                  e.currentTarget.style.color = '#050505';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
              >
                Cadastrar
              </button>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg"
                style={{ color: 'var(--nexus-muted)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="md:hidden pb-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm font-medium rounded-lg"
                  style={{ color: 'var(--nexus-muted)' }}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => { navigate('/login'); setMobileOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium"
                style={{ color: 'var(--nexus-text)' }}
              >
                Entrar
              </button>
              <button
                onClick={() => { navigate('/register'); setMobileOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg"
                style={{ color: 'var(--nexus-gold)' }}
              >
                Cadastrar
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer
        className="border-t py-10"
        style={{ borderColor: 'var(--nexus-border)', background: 'rgba(0, 0, 0, 0.3)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <img src="/logo.png" alt="Nexus" className="h-10 w-auto mb-4" />
              <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>
                Sistema ERP SaaS completo para gestao empresarial. Codigo aberto, gratuito e profissional.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>Navegacao</h4>
              <div className="space-y-2">
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} className="block text-sm" style={{ color: 'var(--nexus-muted)' }}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--nexus-text)' }}>Legal</h4>
              <div className="space-y-2">
                <Link to="/terms" className="block text-sm" style={{ color: 'var(--nexus-muted)' }}>Termos de Uso</Link>
                <Link to="/privacy" className="block text-sm" style={{ color: 'var(--nexus-muted)' }}>Privacidade</Link>
                <Link to="/contact" className="block text-sm" style={{ color: 'var(--nexus-muted)' }}>Suporte</Link>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--nexus-border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--nexus-muted-2)' }}>
              &copy; {new Date().getFullYear()} Nexus Business Manager. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
