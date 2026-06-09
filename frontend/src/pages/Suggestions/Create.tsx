import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--nexus-text)' }}>
          Enviar <span style={{ color: 'var(--nexus-gold)' }}>Sugestao</span>
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', marginTop: '0.25rem' }}>
          Compartilhe sua ideia, melhoria ou feedback conosco.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ background: 'var(--nexus-card-strong)', border: '1px solid var(--nexus-border)', borderRadius: '18px', padding: '2rem', maxWidth: '640px', margin: '0 auto' }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Titulo</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem' }}
            placeholder="Ex: Melhorar relatorio de vendas"
            required
            minLength={5}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ color: 'var(--nexus-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>Descricao</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem', background: 'var(--nexus-input-bg)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', fontSize: '0.875rem', resize: 'vertical', minHeight: '100px' }}
            placeholder="Descreva sua sugestao em detalhes (minimo 20 caracteres)..."
            required
            minLength={20}
          />
        </div>

        <div style={{ background: 'var(--nexus-card-soft)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid var(--nexus-border)', fontSize: '0.875rem', color: 'var(--nexus-muted-2)', lineHeight: 1.6 }}>
          <p style={{ fontWeight: 600, color: 'var(--nexus-text)', marginBottom: '0.5rem' }}>Aviso Legal</p>
          <p style={{ marginBottom: '0.5rem' }}>
            Ao enviar esta sugestao, voce concede ao Nexus Business Manager o direito de
            analisar, implementar ou recusar a sugestao conforme seu criterio.
          </p>
          <p style={{ marginBottom: '0.5rem' }}>
            Conteudos ofensivos, difamatorios ou inapropriados serao automaticamente
            bloqueados e podem resultar em restricoes na sua conta.
          </p>
          <p>
            Seus dados pessoais serao tratados conforme nossa Politica de Privacidade.
          </p>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', marginBottom: '1.25rem' }}>
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            style={{ marginTop: '0.25rem', width: '1rem', height: '1rem', accentColor: 'var(--nexus-gold)' }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--nexus-muted-2)', lineHeight: 1.5 }}>
            Eu li e aceito os termos legais acima e concordo com o tratamento dos meus dados
          </span>
        </label>

        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{ background: 'linear-gradient(135deg, var(--nexus-rose), var(--nexus-rose-dark))', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 500, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Enviando...' : 'Enviar Sugestao'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/suggestions')}
            style={{ background: 'var(--nexus-card)', color: 'var(--nexus-text)', border: '1px solid var(--nexus-border)', borderRadius: '10px', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </motion.div>
  );
}
