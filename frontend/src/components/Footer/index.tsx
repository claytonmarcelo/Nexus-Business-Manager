export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-8 py-4 border-t flex flex-col md:flex-row items-center justify-between gap-2 text-xs" style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted-2)' }}>
      <div>
        <strong style={{ color: 'var(--nexus-text)' }}>Copyright &copy; {currentYear} <a href="#" className="hover:text-nexus-gold transition-colors">Nexus Business Manager</a>.</strong> Todos os direitos reservados.
      </div>
      
      <div className="hidden md:block">
        <b>Versão</b> 2.1.0
      </div>
    </footer>
  );
}
