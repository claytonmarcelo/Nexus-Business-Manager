import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  EyeIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

export function Analytics() {
  const [analytics, setAnalytics] = useState({
    totalVisits: 12543,
    uniqueVisitors: 8932,
    bounceRate: 32.5,
    avgSessionDuration: '4m 32s',
    topPages: [
      { path: '/dashboard', visits: 3421, percentage: 27.3 },
      { path: '/clients', visits: 2187, percentage: 17.4 },
      { path: '/sales', visits: 1856, percentage: 14.8 },
      { path: '/financial', visits: 1543, percentage: 12.3 },
      { path: '/reports', visits: 1234, percentage: 9.8 },
    ],
    recentActivity: [
      { type: 'visit', page: '/dashboard', time: '2 min atrás', user: 'Visitante Anônimo' },
      { type: 'visit', page: '/clients', time: '5 min atrás', user: 'João Silva' },
      { type: 'visit', page: '/sales', time: '8 min atrás', user: 'Maria Santos' },
      { type: 'visit', page: '/financial', time: '12 min atrás', user: 'Pedro Oliveira' },
    ],
    dailyVisits: [
      { date: '01/06', visits: 1234 },
      { date: '02/06', visits: 1456 },
      { date: '03/06', visits: 1678 },
      { date: '04/06', visits: 1890 },
      { date: '05/06', visits: 2101 },
      { date: '06/06', visits: 2345 },
      { date: '07/06', visits: 2539 },
    ],
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <h1 className="page-title">Analítico do Sistema</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--nexus-muted-2)' }}>
          Métricas de uso e visitantes em tempo real
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="nexus-card p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)' }}>
              <EyeIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Total de Visitas</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--nexus-text)' }}>
            {analytics.totalVisits.toLocaleString()}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--nexus-gold)' }}>+12.5% este mês</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="nexus-card p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)' }}>
              <UsersIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Visitantes Únicos</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--nexus-text)' }}>
            {analytics.uniqueVisitors.toLocaleString()}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--nexus-gold)' }}>+8.3% este mês</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="nexus-card p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)' }}>
              <ArrowTrendingUpIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Taxa de Rejeição</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--nexus-text)' }}>
            {analytics.bounceRate}%
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--nexus-rose)' }}>-2.1% este mês</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="nexus-card p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)' }}>
              <ClockIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
            </div>
            <span className="text-sm" style={{ color: 'var(--nexus-muted)' }}>Tempo Médio</span>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--nexus-text)' }}>
            {analytics.avgSessionDuration}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--nexus-gold)' }}>+15.2% este mês</div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="nexus-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--nexus-text)' }}>
            Visitas Diárias (Últimos 7 dias)
          </h2>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--nexus-muted)' }}>
            <CalendarIcon className="w-4 h-4" />
            <span>Última semana</span>
          </div>
        </div>
        <div className="flex items-end gap-4 h-40">
          {analytics.dailyVisits.map((day, index) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t-lg transition-all duration-300 hover:opacity-80"
                style={{
                  background: 'linear-gradient(180deg, var(--nexus-gold), var(--nexus-bronze))',
                  height: `${(day.visits / analytics.dailyVisits[analytics.dailyVisits.length - 1].visits) * 100}%`,
                  minHeight: '20px',
                }}
              />
              <span className="text-xs" style={{ color: 'var(--nexus-muted)' }}>{day.date}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--nexus-text)' }}>{day.visits}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="nexus-card p-6"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
            Páginas Mais Acessadas
          </h2>
          <div className="space-y-3">
            {analytics.topPages.map((page, index) => (
              <div key={page.path} className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]" style={{ background: 'var(--nexus-card-soft)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, var(--nexus-gold), var(--nexus-bronze))', color: '#000' }}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{page.path}</div>
                  <div className="text-xs" style={{ color: 'var(--nexus-muted)' }}>{page.visits.toLocaleString()} visitas</div>
                </div>
                <div className="text-lg font-bold" style={{ color: 'var(--nexus-gold)' }}>{page.percentage}%</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="nexus-card p-6"
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--nexus-text)' }}>
            Atividade Recente
          </h2>
          <div className="space-y-3">
            {analytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]" style={{ background: 'var(--nexus-card-soft)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.12)' }}>
                  <EyeIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--nexus-text)' }}>{activity.user}</div>
                  <div className="text-xs" style={{ color: 'var(--nexus-muted)' }}>{activity.page}</div>
                </div>
                <div className="text-xs" style={{ color: 'var(--nexus-muted)' }}>{activity.time}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
