import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  onFilterClick?: () => void;
  rightContent?: React.ReactNode;
}

export function SearchBar({
  value, onChange, onSubmit, placeholder = 'Buscar...', onFilterClick, rightContent,
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="header-search flex-1 max-w-md">
        <MagnifyingGlassIcon className="w-5 h-5 text-nexus-muted-2 flex-shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && onSubmit) onSubmit(); }}
          placeholder={placeholder}
        />
      </div>
      {onFilterClick && (
        <button
          onClick={onFilterClick}
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors whitespace-nowrap"
          style={{ background: 'var(--nexus-input-bg)', border: '1px solid rgba(var(--nexus-gold-rgb),0.15)', color: 'var(--nexus-muted)' }}
        >
          <FunnelIcon className="w-5 h-5" />
        </button>
      )}
      {rightContent}
    </div>
  );
}
