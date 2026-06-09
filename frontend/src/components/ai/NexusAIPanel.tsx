import { useState, useEffect } from 'react';
import { InsightData, getInsights, analyzeModule, AnalyzeResponse } from '../../services/ai.service';
import { NexusAIInsights } from './NexusAIInsights';
import { useToast } from '../../contexts/ToastContext';
import { ChartBarIcon, SparklesIcon } from '@heroicons/react/24/solid';

const modules = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'fornecedores', label: 'Fornecedores' },
  { value: 'produtos', label: 'Produtos' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'compras', label: 'Compras' },
  { value: 'financeiro', label: 'Financeiro' },
];

export function NexusAIPanel() {
  const { showToast } = useToast();
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [analyzeModuleName, setAnalyzeModuleName] = useState('dashboard');
  const [period, setPeriod] = useState('month');
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    getInsights().then(setInsights).catch(() => {});
  }, []);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await analyzeModule(analyzeModuleName, period);
      setAnalysis(res);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Erro ao analisar.', 'error');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--nexus-text)' }}>Insights do Negocio</h3>
          <SparklesIcon style={{ width: '1.25rem', height: '1.25rem', color: 'var(--nexus-gold)' }} />
        </div>
        <NexusAIInsights />
        {insights.length === 0 && (
          <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)' }}>Nenhum insight disponivel no momento.</p>
        )}
      </div>

      <div style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', borderRadius: '14px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--nexus-text)' }}>Analisar Modulo</h3>
          <ChartBarIcon style={{ width: '1.25rem', height: '1.25rem', color: 'var(--nexus-rose)' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <select
            value={analyzeModuleName}
            onChange={(e) => setAnalyzeModuleName(e.target.value)}
            style={{ flex: 1, padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', outline: 'none' }}
          >
            {modules.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: '8rem', padding: '0.625rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', outline: 'none' }}
          >
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Ano</option>
          </select>
          <button onClick={handleAnalyze} disabled={analyzing} style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: 'var(--nexus-text)', border: 'none', borderRadius: '10px', padding: '0.625rem 1.25rem', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem', opacity: analyzing ? 0.5 : 1 }}>
            {analyzing ? 'Analisando...' : 'Analisar'}
          </button>
        </div>

        {analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(var(--nexus-gold-rgb),0.1)', border: '1px solid rgba(var(--nexus-gold-rgb),0.2)' }}>
              <p style={{ fontWeight: 500, color: 'var(--nexus-text)', marginBottom: '0.25rem' }}>Resumo</p>
              <p style={{ color: 'var(--nexus-muted-2)' }}>{analysis.summary}</p>
            </div>

            {analysis.risks && analysis.risks.length > 0 && (
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239,111,122,0.1)', border: '1px solid rgba(239,111,122,0.2)' }}>
                <p style={{ fontWeight: 500, color: 'var(--nexus-danger)', marginBottom: '0.25rem' }}>Riscos</p>
                <ul style={{ listStyle: 'disc', listStylePosition: 'inside', color: 'var(--nexus-muted-2)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {analysis.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {analysis.opportunities && analysis.opportunities.length > 0 && (
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(143,214,163,0.1)', border: '1px solid rgba(143,214,163,0.2)' }}>
                <p style={{ fontWeight: 500, color: 'var(--nexus-success)', marginBottom: '0.25rem' }}>Oportunidades</p>
                <ul style={{ listStyle: 'disc', listStylePosition: 'inside', color: 'var(--nexus-muted-2)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {analysis.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </div>
            )}

            {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(var(--nexus-blue-rgb),0.1)', border: '1px solid rgba(var(--nexus-blue-rgb),0.2)' }}>
                <p style={{ fontWeight: 500, color: 'var(--nexus-muted)', marginBottom: '0.25rem' }}>Acoes Recomendadas</p>
                <ul style={{ listStyle: 'disc', listStylePosition: 'inside', color: 'var(--nexus-muted-2)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {analysis.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            <p style={{ fontSize: '0.75rem', color: 'var(--nexus-muted-2)' }}>
              Fonte: {analysis.source === 'ollama' ? 'IA (Ollama)' : 'Regras do sistema'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
