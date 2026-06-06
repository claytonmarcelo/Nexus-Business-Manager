import { motion } from 'framer-motion';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, action, className = '' }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-xl p-5 ${className}`}
      style={{
        background: 'var(--nexus-card)',
        border: '1px solid var(--nexus-border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--nexus-text)' }}>{title}</h3>
        {action}
      </div>
      {children}
    </motion.div>
  );
}
