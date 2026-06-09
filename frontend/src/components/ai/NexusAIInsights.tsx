import { useState, useEffect } from 'react';
import { InsightData, getInsights } from '../../services/ai.service';
import { useNavigate } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/solid';

const severityConfig: Record<string, { icon: any; bg: string; border: string }> = {
  warning: { icon: ExclamationTriangleIcon, bg: 'rgba(var(--nexus-gold-rgb),0.12)', border: 'rgba(var(--nexus-gold-rgb),0.3)' },
  danger: { icon: ExclamationTriangleIcon, bg: 'rgba(239,111,122,0.12)', border: 'rgba(239,111,122,0.3)' },
  success: { icon: CheckCircleIcon, bg: 'rgba(143,214,163,0.12)', border: 'rgba(143,214,163,0.3)' },
  info: { icon: InformationCircleIcon, bg: 'rgba(var(--nexus-blue-rgb),0.12)', border: 'rgba(var(--nexus-blue-rgb),0.3)' },
};

interface Props {
  compact?: boolean;
}

export function NexusAIInsights({ compact }: Props) {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<InsightData[]>([]);

  useEffect(() => {
    getInsights().then(setInsights).catch(() => {});
  }, []);

  if (insights.length === 0) return null;

  const displayInsights = compact ? insights.slice(0, 3) : insights;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {displayInsights.map((insight, i) => {
        const config = severityConfig[insight.severity] || severityConfig.info;
        const Icon = config.icon;
        return (
          <div
            key={i}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', background: config.bg, border: `1px solid ${config.border}` }}
          >
            <Icon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0, marginTop: '0.125rem', color: config.border }} />
            <div>
              <p style={{ fontWeight: 500, color: 'var(--nexus-text)' }}>{insight.title}</p>
              <p style={{ color: 'var(--nexus-muted-2)', fontSize: '0.75rem', marginTop: '0.125rem' }}>{insight.message}</p>
            </div>
          </div>
        );
      })}
      {compact && insights.length > 3 && (
        <button
          onClick={() => navigate('/nexus-ai')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--nexus-gold)', cursor: 'pointer', background: 'none', border: 'none', marginTop: '0.5rem' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <ChartBarIcon style={{ width: '1rem', height: '1rem' }} />
          Ver todos os {insights.length} insights
        </button>
      )}
    </div>
  );
}
