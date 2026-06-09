import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LightBulbIcon,
  ArrowUpIcon,
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

/* ─── helpers ──────────────────────────────────────────── */
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/* ─── component ────────────────────────────────────────── */
export function Suggestions() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: '' });
  const [suggestions, setSuggestions] = useState([
    { id: 1, title: 'Aumentar margem de lucro em produtos de alta rotação', description: 'Produtos com alta rotação podem ter margens aumentadas em 5-10% sem impacto significativo nas vendas.', category: 'Financeiro', impact: 'Alto', votes: 24, status: 'pending' },
    { id: 2, title: 'Implementar programa de fidelidade para clientes recorrentes', description: 'Criar sistema de pontos e descontos para clientes que compram frequentemente, aumentando a retenção.', category: 'CRM', impact: 'Médio', votes: 18, status: 'pending' },
    { id: 3, title: 'Automatizar processos de estoque com alertas inteligentes', description: 'Implementar sistema de previsão de demanda baseado em histórico de vendas para reduzir faltas e excessos.', category: 'Estoque', impact: 'Alto', votes: 31, status: 'in_progress' },
    { id: 4, title: 'Expandir linha de produtos sazonais', description: 'Adicionar produtos específicos para períodos de alta demanda como Natal e Black Friday.', category: 'Produtos', impact: 'Médio', votes: 15, status: 'pending' },
    { id: 5, title: 'Otimizar rota de entregas para reduzir custos logísticos', description: 'Implementar sistema de roteirização inteligente para reduzir tempo e custo de entregas.', category: 'Logística', impact: 'Alto', votes: 22, status: 'pending' },
  ]);

  const spark1 = [{v:10},{v:15},{v:12},{v:18},{v:16},{v:22},{v:19},{v:25},{v:22},{v:28}];
  const spark2 = [{v:5},{v:12},{v:9},{v:16},{v:13},{v:20},{v:18},{v:22},{v:15},{v:20}];
  const spark3 = [{v:8},{v:10},{v:12},{v:11},{v:16},{v:15},{v:19},{v:22},{v:20},{v:28}];
  const spark4 = [{v:12},{v:10},{v:18},{v:15},{v:22},{v:20},{v:28},{v:25},{v:30},{v:35}];

  const handleVote = (id: number) => {
    setSuggestions(prev => prev.map(s => 
      s.id === id ? { ...s, votes: s.votes + 1 } : s
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSuggestion = {
      id: Date.now(),
      title: formData.title,
      description: formData.description,
      category: formData.category,
      impact: 'Médio',
      votes: 0,
      status: 'pending',
    };
    setSuggestions(prev => [newSuggestion, ...prev]);
    setShowModal(false);
    setFormData({ title: '', description: '', category: '' });
  };

  const categoryColors: Record<string, string> = {
    'Financeiro': 'var(--nexus-rose)',
    'CRM': 'var(--nexus-gold)',
    'Estoque': 'var(--nexus-success)',
    'Produtos': 'var(--nexus-chart-blue)',
    'Logística': 'var(--nexus-bronze)',
  };

  const statusBadge: Record<string, { bg: string; color: string; label: string }> = {
    'pending': { bg: 'rgba(var(--nexus-warning-rgb),0.12)', color: 'var(--nexus-warning)', label: 'Pendente' },
    'in_progress': { bg: 'rgba(var(--nexus-gold-rgb),0.12)', color: 'var(--nexus-gold)', label: 'Em andamento' },
    'completed': { bg: 'rgba(var(--nexus-success-rgb),0.12)', color: 'var(--nexus-success)', label: 'Concluído' },
  };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: 'var(--nexus-bg)' }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-medium" style={{ color: 'var(--nexus-text)' }}>Sugestões</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--nexus-muted)' }}>Ideias e recomendações para melhorar seu negócio</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))' }}
          >
            <PlusIcon className="w-4 h-4" />
            Nova Sugestão
          </button>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total de Sugestões', value: suggestions.length, icon: <LightBulbIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 12% este mês', spark: spark1 },
          { label: 'Em Andamento', value: suggestions.filter(s => s.status === 'in_progress').length, icon: <ClockIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 8% este mês', spark: spark2 },
          { label: 'Concluídas', value: suggestions.filter(s => s.status === 'completed').length, icon: <CheckCircleIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 15% este mês', spark: spark3 },
          { label: 'Impacto Potencial', value: 'R$ 45.230', icon: <CurrencyDollarIcon className="w-4 h-4 lg:w-5 lg:h-5" />, change: '↑ 22% este mês', spark: spark4 },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl border overflow-hidden flex flex-col"
            style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}>
            <div className="p-4 lg:p-5 flex-1 min-w-0">
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                  style={{ background: 'var(--nexus-bg-soft)', borderColor: 'var(--nexus-border)', color: 'var(--nexus-gold)' }}>
                  {kpi.icon}
                </div>
                <span className="text-[11px] lg:text-[13px] font-medium truncate" style={{ color: 'var(--nexus-muted)' }}>{kpi.label}</span>
              </div>
              <div className="min-w-0 mb-1">
                <span className="text-[16px] xl:text-[20px] 2xl:text-[24px] font-semibold tracking-tight truncate block" style={{ color: 'var(--nexus-text)' }}>{kpi.value}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[9px] lg:text-[10px] font-medium truncate block" style={{ color: 'var(--nexus-success)' }}>
                  {kpi.change}
                </span>
              </div>
            </div>
            {/* Sparkline */}
            <div className="h-10 w-full mt-auto opacity-80" style={{ filter: `drop-shadow(0 4px 6px rgba(0,0,0,0.1))` }}>
              <div className="w-full h-full">
                <svg viewBox="0 0 100 30" className="w-full h-full">
                  <polyline
                    fill="none"
                    stroke="var(--nexus-rose)"
                    strokeWidth="2"
                    points={kpi.spark.map((d, i) => `${i * 10},${30 - d.v}`).join(' ')}
                  />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Suggestions List ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--nexus-card)', borderColor: 'var(--nexus-border)' }}
      >
        <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--nexus-border)' }}>
          <h2 className="text-[15px] font-medium" style={{ color: 'var(--nexus-text)' }}>Sugestões Recentes</h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(var(--nexus-gold-rgb),0.05)' }}>
          {suggestions.map((suggestion, idx) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.05 }}
              className="p-6 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Vote Button */}
                <button
                  onClick={() => handleVote(suggestion.id)}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all hover:scale-105"
                  style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', border: '1px solid rgba(var(--nexus-gold-rgb),0.2)' }}
                >
                  <ArrowUpIcon className="w-5 h-5" style={{ color: 'var(--nexus-gold)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--nexus-text)' }}>{suggestion.votes}</span>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-[15px] font-semibold" style={{ color: 'var(--nexus-text)' }}>{suggestion.title}</h3>
                    <span
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                      style={{ background: 'rgba(var(--nexus-gold-rgb),0.1)', color: categoryColors[suggestion.category] || 'var(--nexus-gold)' }}
                    >
                      {suggestion.category}
                    </span>
                    <span
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                      style={{ background: statusBadge[suggestion.status].bg, color: statusBadge[suggestion.status].color }}
                    >
                      {statusBadge[suggestion.status].label}
                    </span>
                  </div>
                  <p className="text-[13px] mb-3" style={{ color: 'var(--nexus-muted)' }}>{suggestion.description}</p>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
                    <span>Impacto: <span className="font-medium" style={{ color: suggestion.impact === 'Alto' ? 'var(--nexus-success)' : 'var(--nexus-text)' }}>{suggestion.impact}</span></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" style={{ color: 'var(--nexus-gold)' }}>
                    <ChartBarIcon className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" style={{ color: 'var(--nexus-muted)' }}>
                    <UserGroupIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══ Create Modal ═══ */}
      {showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'var(--nexus-overlay)' }}
          onClick={() => setShowModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--nexus-text)' }}>Nova Sugestão</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ background: 'var(--nexus-bg-soft)', color: 'var(--nexus-muted)' }}>
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Título</label>
                <input type="text" required value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Categoria</label>
                <select required value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}>
                  <option value="">Selecione...</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="CRM">CRM</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Produtos">Produtos</option>
                  <option value="Logística">Logística</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--nexus-muted)' }}>Descrição</label>
                <textarea rows={4} required value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 resize-none"
                  style={{ background: 'var(--nexus-input-bg)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--nexus-rose)' }}>
                  Salvar
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'var(--nexus-card)', border: '1px solid var(--nexus-border)', color: 'var(--nexus-text)' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
