import { useState, useEffect } from 'react';
import { getSuggestions } from '../../services/ai.service';

interface Props {
  module?: string;
  onSelect: (suggestion: string) => void;
}

export function NexusAISuggestions({ module, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    getSuggestions(module).then(setSuggestions).catch(() => {});
  }, [module]);

  if (suggestions.length === 0) return null;

  return (
    <div>
      <p style={{ fontSize: '0.75rem', color: 'var(--nexus-muted-2)', marginBottom: '0.5rem' }}>Perguntas frequentes:</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            style={{
              fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--nexus-border)',
              color: 'var(--nexus-muted-2)', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--nexus-gold)'; e.currentTarget.style.borderColor = 'var(--nexus-gold)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--nexus-muted-2)'; e.currentTarget.style.borderColor = 'var(--nexus-border)'; }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
