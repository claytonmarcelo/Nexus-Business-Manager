import { useState } from 'react';

interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
}

export function PremiumInput({ label, icon, error, className = '', ...props }: PremiumInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--nexus-text)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: focused ? 'var(--nexus-gold)' : 'var(--nexus-muted-2)' }}>
            {icon}
          </div>
        )}
        <input
          className={`w-full rounded-xl text-sm transition-all duration-200 ${icon ? 'pl-10' : 'pl-4'} pr-4 ${className}`}
          style={{
            height: '52px',
            background: 'rgba(0, 0, 0, 0.4)',
            color: 'var(--nexus-text)',
            border: `1px solid ${error ? '#D84B5F' : focused ? 'var(--nexus-gold)' : 'rgba(212, 149, 86, 0.2)'}`,
            boxShadow: focused ? '0 0 20px rgba(212, 149, 86, 0.1)' : 'none',
            outline: 'none',
          }}
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        />
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: '#D84B5F' }}>{error}</p>
      )}
    </div>
  );
}
