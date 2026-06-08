interface PremiumBadgeProps {
  variant: 'success' | 'warning' | 'danger' | 'info' | 'default';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

const variants = {
  success: { bg: 'rgba(var(--nexus-success-rgb), 0.12)', color: 'var(--nexus-success)' },
  warning: { bg: 'rgba(216, 154, 40, 0.12)', color: 'var(--nexus-warning)' },
  danger: { bg: 'rgba(var(--nexus-danger-rgb), 0.12)', color: 'var(--nexus-danger)' },
  info: { bg: 'rgba(var(--nexus-gold-rgb), 0.12)', color: 'var(--nexus-gold)' },
  default: { bg: 'rgba(var(--nexus-muted-rgb), 0.12)', color: 'var(--nexus-muted)' },
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
