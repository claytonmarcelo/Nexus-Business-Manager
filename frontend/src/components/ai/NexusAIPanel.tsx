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
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Insights do Negocio</h3>
          <SparklesIcon className="w-5 h-5 text-brand-gold" />
        </div>
        <NexusAIInsights />
        {insights.length === 0 && (
          <p className="text-sm text-brand-muted">Nenhum insight disponivel no momento.</p>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Analisar Modulo</h3>
          <ChartBarIcon className="w-5 h-5 text-brand-rose" />
        </div>

        <div className="flex gap-3 mb-4">
          <select
            value={analyzeModuleName}
            onChange={(e) => setAnalyzeModuleName(e.target.value)}
            className="input-field flex-1"
          >
            {modules.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input-field w-32"
          >
            <option value="week">Semana</option>
            <option value="month">Mes</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Ano</option>
          </select>
          <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary">
            {analyzing ? 'Analisando...' : 'Analisar'}
          </button>
        </div>

        {analysis && (
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(214,168,93,0.1)', border: '1px solid rgba(214,168,93,0.2)' }}>
              <p className="font-medium text-brand-text mb-1">Resumo</p>
              <p className="text-brand-muted">{analysis.summary}</p>
            </div>

            {analysis.risks && analysis.risks.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(239,111,122,0.1)', border: '1px solid rgba(239,111,122,0.2)' }}>
                <p className="font-medium text-brand-danger mb-1">Riscos</p>
                <ul className="list-disc list-inside text-brand-muted space-y-1">
                  {analysis.risks.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}

            {analysis.opportunities && analysis.opportunities.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(143,214,163,0.1)', border: '1px solid rgba(143,214,163,0.2)' }}>
                <p className="font-medium text-brand-success mb-1">Oportunidades</p>
                <ul className="list-disc list-inside text-brand-muted space-y-1">
                  {analysis.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </div>
            )}

            {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
              <div className="p-3 rounded-lg" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <p className="font-medium text-blue-400 mb-1">Acoes Recomendadas</p>
                <ul className="list-disc list-inside text-brand-muted space-y-1">
                  {analysis.recommendedActions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            <p className="text-xs text-brand-muted-2">
              Fonte: {analysis.source === 'ollama' ? 'IA (Ollama)' : 'Regras do sistema'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
