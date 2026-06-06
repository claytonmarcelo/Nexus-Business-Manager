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
      <p className="text-xs text-brand-muted mb-2">Perguntas frequentes:</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
