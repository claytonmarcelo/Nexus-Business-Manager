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
  warning: { icon: ExclamationTriangleIcon, bg: 'rgba(214,168,93,0.12)', border: 'rgba(214,168,93,0.3)' },
  danger: { icon: ExclamationTriangleIcon, bg: 'rgba(239,111,122,0.12)', border: 'rgba(239,111,122,0.3)' },
  success: { icon: CheckCircleIcon, bg: 'rgba(143,214,163,0.12)', border: 'rgba(143,214,163,0.3)' },
  info: { icon: InformationCircleIcon, bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' },
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
    <div className="space-y-2">
      {displayInsights.map((insight, i) => {
        const config = severityConfig[insight.severity] || severityConfig.info;
        const Icon = config.icon;
        return (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg text-sm"
            style={{ background: config.bg, border: `1px solid ${config.border}` }}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: config.border }} />
            <div>
              <p className="font-medium text-brand-text">{insight.title}</p>
              <p className="text-brand-muted text-xs mt-0.5">{insight.message}</p>
            </div>
          </div>
        );
      })}
      {compact && insights.length > 3 && (
        <button
          onClick={() => navigate('/nexus-ai')}
          className="flex items-center gap-2 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors mt-2"
        >
          <ChartBarIcon className="w-4 h-4" />
          Ver todos os {insights.length} insights
        </button>
      )}
    </div>
  );
}
