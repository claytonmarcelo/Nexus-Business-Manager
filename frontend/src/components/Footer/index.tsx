export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="py-4 px-4 md:px-6 lg:px-8 border-t flex flex-col md:flex-row items-center justify-between gap-2 text-xs bg-transparent z-10" 
      style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted-2)' }}
    >
      <div>
        <strong style={{ color: 'var(--nexus-text)' }}>Copyright &copy; {currentYear} <a href="#" className="hover:text-nexus-gold transition-colors">Nexus Business Manager</a>.</strong> Todos os direitos reservados.
      </div>

      <div className="hidden md:block">
        <span>Desenvolvido por: <i className="fas fa-heart pulse" style={{ color: 'var(--nexus-rose, #f43f5e)' }}></i> Clayton Marcelo</span> | <b>Versão</b> 2.1.0
      </div>
    </footer>
  );
}
