export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer flex flex-col md:flex-row items-center justify-between gap-2 bg-transparent z-10" style={{ color: 'var(--nexus-muted-2)' }}>
      <div>
        <strong style={{ color: 'var(--nexus-text)' }}>Copyright &copy; {currentYear} <a href="#" className="hover:text-nexus-gold transition-colors">Nexus Business Manager</a>.</strong> Todos os direitos reservados.
      </div>

      <div className="hidden md:flex items-center gap-3">
        <span>Desenvolvido por: <i className="fas fa-heart pulse text-xs" style={{ color: 'var(--nexus-rose, #b10d28)' }}></i> Clayton Marcelo</span>
        <span>|</span>
        <b>Versão</b> 2.1.0
      </div>
    </footer>
  );
}
