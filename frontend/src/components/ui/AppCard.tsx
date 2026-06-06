import { motion } from 'framer-motion';

interface AppCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
}

export function AppCard({ children, className = '', style, hover = true, onClick }: AppCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -2, boxShadow: '0 0 30px rgba(212, 149, 86, 0.12)' } : undefined}
      className={`rounded-xl p-6 transition-colors duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'var(--nexus-card)',
        border: '1px solid var(--nexus-border)',
        color: 'var(--nexus-text)',
        boxShadow: 'var(--nexus-shadow)',
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
