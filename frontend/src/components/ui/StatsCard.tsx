import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'gold' | 'rose' | 'green' | 'blue' | 'purple';
  trend?: { value: string; direction: 'up' | 'down' };
  subtitle?: string;
  sparklineData?: number[];
}

const colorMap = {
  gold: { bar: 'var(--nexus-gold)', iconBg: 'rgba(212, 149, 86, 0.15)', iconColor: 'var(--nexus-gold)' },
  rose: { bar: 'var(--nexus-rose)', iconBg: 'rgba(198, 90, 113, 0.15)', iconColor: 'var(--nexus-rose)' },
  green: { bar: 'var(--nexus-success)', iconBg: 'rgba(125, 218, 106, 0.15)', iconColor: 'var(--nexus-success)' },
  blue: { bar: 'var(--nexus-chart-blue)', iconBg: 'rgba(96, 165, 250, 0.15)', iconColor: 'var(--nexus-chart-blue)' },
  purple: { bar: 'var(--nexus-chart-purple)', iconBg: 'rgba(167, 139, 250, 0.15)', iconColor: 'var(--nexus-chart-purple)' },
};

export function StatsCard({ label, value, icon, color, trend, subtitle, sparklineData }: StatsCardProps) {
  const c = colorMap[color] || colorMap.gold;
  const chartData = sparklineData?.map((val, idx) => ({ name: idx, value: val }));

  // Adjust font size based on value length
  const valueFontSize = value.length > 12 ? 'text-base' : value.length > 9 ? 'text-lg' : 'text-xl';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -3, boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px ${c.bar}30` }}
      className="relative rounded-xl overflow-hidden flex flex-col justify-between"
      style={{
        background: 'var(--nexus-card)',
        border: '1px solid var(--nexus-border)',
        boxShadow: 'var(--nexus-shadow)',
        minHeight: '130px',
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: `linear-gradient(90deg, transparent, ${c.bar}, transparent)`,
        opacity: 0.5,
      }} />

      <div className="p-4 pb-0 relative z-10 flex-1">
        <div className="flex items-start justify-between mb-2 gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest truncate" style={{ color: 'var(--nexus-muted-2)' }}>
            {label}
          </span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: c.iconBg, color: c.iconColor }}
          >
            {icon}
          </div>
        </div>

        <p className={`${valueFontSize} font-bold mb-1 leading-tight truncate`} style={{ color: 'var(--nexus-text)' }}>
          {value}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {trend && (
            <span
              className="text-[11px] font-semibold flex-shrink-0"
              style={{ color: trend.direction === 'up' ? 'var(--nexus-success)' : 'var(--nexus-danger)' }}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-[10px] truncate" style={{ color: 'var(--nexus-muted-2)' }}>{subtitle}</span>
          )}
        </div>
      </div>

      {chartData && (
        <div className="h-9 w-full mt-1 relative z-0 px-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={c.bar}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
