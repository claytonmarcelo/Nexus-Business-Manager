import { motion } from 'framer-motion';

interface GradientButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

export function GradientButton({ children, variant = 'primary', loading, icon, className = '', disabled, onClick, type = 'button', style }: GradientButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const textColors: Record<string, string> = {
    primary: 'text-white',
    secondary: 'text-nexus-text border border-nexus-border',
    danger: 'text-white',
  };

  const bgStyles: Record<string, React.CSSProperties> = {
    primary: { background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' },
    secondary: { background: 'var(--nexus-card-strong)' },
    danger: { background: 'linear-gradient(135deg, var(--nexus-danger), #b03e4f)' },
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      className={`${base} ${textColors[variant]} ${className}`}
      style={{ ...bgStyles[variant], ...style }}
      disabled={loading || disabled}
      onClick={onClick}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </motion.button>
  );
}
