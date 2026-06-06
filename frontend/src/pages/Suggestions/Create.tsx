import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSuggestion } from '../../services/suggestions.service';
import { useToast } from '../../contexts/ToastContext';

const categories = [
  { value: 'general', label: 'Geral' },
  { value: 'improvement', label: 'Melhoria' },
  { value: 'feature', label: 'Nova Funcionalidade' },
  { value: 'complaint', label: 'Reclamacao' },
  { value: 'praise', label: 'Elogio' },
];

export function CreateSuggestion() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      showToast('Voce precisa aceitar os termos legais antes de enviar.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSuggestion({ title, description, category, accepted_terms: acceptedTerms });
      if (res.blocked) {
        showToast(res.message || 'Sugestao bloqueada por conteudo ofensivo.', 'error');
      } else {
        showToast(res.message || 'Sugestao enviada com sucesso!');
      }
      navigate('/suggestions');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao enviar sugestao.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Enviar Sugestao</h1>
        <p className="text-brand-graphiteWine/60 mt-1">
          Compartilhe sua ideia, melhoria ou feedback conosco.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-brand-graphiteWine/80 mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-graphiteWine/80 mb-1">Titulo</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder="Ex: Melhorar relatorio de vendas"
            required
            minLength={5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-graphiteWine/80 mb-1">Descricao</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-[160px] resize-y"
            placeholder="Descreva sua sugestao em detalhes (minimo 20 caracteres)..."
            required
            minLength={20}
          />
        </div>

        <div className="bg-brand-ivorySmoke/30 rounded-lg p-4 text-sm text-brand-graphiteWine/70 space-y-2 border border-brand-ivorySmoke/50">
          <p className="font-semibold text-brand-graphiteWine/90">Aviso Legal</p>
          <p>
            Ao enviar esta sugestao, voce concede ao Nexus Business Manager o direito de 
            analisar, implementar ou recusar a sugestao conforme seu criterio. 
          </p>
          <p>
            Conteudos ofensivos, difamatorios ou inapropriados serao automaticamente 
            bloqueados e podem resultar em restricoes na sua conta.
          </p>
          <p>
            Seus dados pessoais serao tratados conforme nossa Politica de Privacidade.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-brand-ivorySmoke text-brand-primary focus:ring-brand-primary"
          />
          <span className="text-sm text-brand-graphiteWine/70">
            Eu li e aceito os termos legais acima e concordo com o tratamento dos meus dados
          </span>
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Enviando...' : 'Enviar Sugestao'}
          </button>
          <button type="button" onClick={() => navigate('/suggestions')} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
