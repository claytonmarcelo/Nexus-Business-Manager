export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer 
      className="mt-8 pt-6 pb-2 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-medium" 
      style={{ borderColor: 'var(--nexus-border)', color: 'var(--nexus-muted)' }}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold tracking-wide" style={{ color: 'var(--nexus-text)' }}>
          NEXUS BUSINESS MANAGER
        </span>
        <span>&copy; {currentYear}</span>
      </div>
      
      <div className="flex items-center gap-6">
        <a href="#" className="transition-colors hover:text-white">Suporte</a>
        <a href="#" className="transition-colors hover:text-white">Documentacao</a>
        <a href="#" className="transition-colors hover:text-white">Termos</a>
        <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted-2)' }}>
          v2.1.0
        </span>
      </div>
    </footer>
  );
}
