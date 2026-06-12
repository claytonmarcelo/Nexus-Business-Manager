import { RocketLaunchIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-12 relative overflow-hidden rounded-2xl p-8 md:p-10" style={{ background: 'var(--nexus-bg-soft)', border: '1px solid var(--nexus-border)' }}>
      {/* Premium Gradient Accent */}
      <div className="absolute top-0 left-0 w-full h-1" style={{ background: 'linear-gradient(90deg, var(--nexus-gold) 0%, var(--nexus-rose) 100%)' }} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative z-10">
        
        {/* Brand Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-rose))', color: '#fff' }}>
              <RocketLaunchIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide" style={{ color: 'var(--nexus-text)' }}>
                NEXUS BUSINESS
              </h2>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--nexus-gold)' }}>
                Management System
              </p>
            </div>
          </div>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--nexus-muted)' }}>
            Elevando a gestão da sua empresa a um novo patamar. Inteligência, controle e performance em uma única plataforma premium.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--nexus-text)' }}>Links Rápidos</h3>
          <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--nexus-muted)' }}>
            <li><a href="#" className="hover:text-nexus-gold transition-colors">Dashboard Principal</a></li>
            <li><a href="#" className="hover:text-nexus-gold transition-colors">Relatórios e Análises</a></li>
            <li><a href="#" className="hover:text-nexus-gold transition-colors">Central de Ajuda</a></li>
            <li><a href="#" className="hover:text-nexus-gold transition-colors">Configurações do Sistema</a></li>
          </ul>
        </div>

        {/* Contact & Legal */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--nexus-text)' }}>Suporte</h3>
          <ul className="flex flex-col gap-3 text-sm" style={{ color: 'var(--nexus-muted)' }}>
            <li className="flex items-center gap-2">
              <EnvelopeIcon className="w-4 h-4" style={{ color: 'var(--nexus-rose)' }} />
              <a href="mailto:suporte@nexus.com" className="hover:text-nexus-text transition-colors">suporte@nexus.com</a>
            </li>
            <li className="flex items-center gap-2">
              <PhoneIcon className="w-4 h-4" style={{ color: 'var(--nexus-rose)' }} />
              <span>0800 123 4567</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium border-t relative z-10" style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted-2)' }}>
        <p>&copy; {currentYear} Nexus Business Manager. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <a href="#" className="transition-colors hover:text-white">Privacidade</a>
          <a href="#" className="transition-colors hover:text-white">Termos de Uso</a>
          <span className="px-2 py-0.5 rounded-md" style={{ background: 'var(--nexus-bg)', border: '1px solid var(--nexus-border)' }}>
            v2.1.0
          </span>
        </div>
      </div>
    </footer>
  );
}
