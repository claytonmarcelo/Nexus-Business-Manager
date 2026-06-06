import { motion } from 'framer-motion';

interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'gold' | 'rose' | 'green' | 'blue' | 'purple';
  trend?: { value: string; direction: 'up' | 'down' };
  subtitle?: string;
}

const colorMap = {
  gold: { bar: '#D49556', iconBg: 'rgba(212, 149, 86, 0.12)', iconColor: '#D49556' },
  rose: { bar: '#C65A71', iconBg: 'rgba(198, 90, 113, 0.12)', iconColor: '#C65A71' },
  green: { bar: '#7DDA6A', iconBg: 'rgba(125, 218, 106, 0.12)', iconColor: '#7DDA6A' },
  blue: { bar: '#60a5fa', iconBg: 'rgba(96, 165, 250, 0.12)', iconColor: '#60a5fa' },
  purple: { bar: '#a78bfa', iconBg: 'rgba(167, 139, 250, 0.12)', iconColor: '#a78bfa' },
};

export function StatsCard({ label, value, icon, color, trend, subtitle }: StatsCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -3, boxShadow: `0 0 30px rgba(212, 149, 86, 0.1)` }}
      className="relative rounded-xl p-5 overflow-hidden"
      style={{
        background: 'var(--nexus-card)',
        border: '1px solid var(--nexus-border)',
      }}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-r" style={{ background: c.bar }} />

      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--nexus-muted-2)' }}>
          {label}
        </span>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: c.iconBg, color: c.iconColor }}
        >
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold mb-1" style={{ color: 'var(--nexus-text)' }}>
        {value}
      </p>

      <div className="flex items-center gap-2">
        {trend && (
          <span
            className="text-xs font-medium"
            style={{ color: trend.direction === 'up' ? '#7DDA6A' : '#D84B5F' }}
          >
            {trend.direction === 'up' ? '\u2191' : '\u2193'} {trend.value}
          </span>
        )}
        {subtitle && (
          <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>{subtitle}</span>
        )}
      </div>
    </motion.div>
  );
}
