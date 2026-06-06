interface PremiumBadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'default';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const variants = {
  success: { bg: 'rgba(125, 218, 106, 0.12)', color: '#7DDA6A' },
  warning: { bg: 'rgba(216, 154, 40, 0.12)', color: '#D89A28' },
  danger: { bg: 'rgba(216, 75, 95, 0.12)', color: '#D84B5F' },
  info: { bg: 'rgba(212, 149, 86, 0.12)', color: '#D49556' },
  default: { bg: 'rgba(168, 168, 168, 0.12)', color: '#A8A8A8' },
};

export function PremiumBadge({ variant, children, size = 'sm' }: PremiumBadgeProps) {
  const v = variants[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'}`}
      style={{ background: v.bg, color: v.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: v.color }} />
      {children}
    </span>
  );
}
