import { SparklesIcon, UserIcon } from '@heroicons/react/24/solid';

interface Props {
  text: string;
  isUser: boolean;
  suggestions?: string[];
  onSuggestionClick?: (s: string) => void;
}

export function NexusAIMessage({ text, isUser, suggestions, onSuggestionClick }: Props) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isUser ? 'rgba(var(--nexus-gold-rgb), 0.2)' : 'rgba(var(--nexus-rose-rgb), 0.2)' }}>
        {isUser ? (
          <UserIcon style={{ width: '1rem', height: '1rem', color: 'var(--nexus-gold)' }} />
        ) : (
          <SparklesIcon style={{ width: '1rem', height: '1rem', color: 'var(--nexus-rose)' }} />
        )}
      </div>
      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div
          style={{
            borderRadius: '1rem', padding: '0.625rem 1rem', fontSize: '0.875rem', lineHeight: 1.5,
            background: isUser ? 'rgba(var(--nexus-gold-rgb), 0.2)' : 'var(--nexus-card-strong)',
            color: 'var(--nexus-text)', border: '1px solid',
            borderColor: isUser ? 'rgba(var(--nexus-gold-rgb), 0.3)' : 'var(--nexus-border)',
          }}
        >
          {text}
        </div>
        {!isUser && suggestions && suggestions.length > 0 && onSuggestionClick && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                style={{
                  fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', border: '1px solid var(--nexus-border)',
                  color: 'var(--nexus-muted-2)', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--nexus-gold)'; e.currentTarget.style.borderColor = 'var(--nexus-gold)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--nexus-muted-2)'; e.currentTarget.style.borderColor = 'var(--nexus-border)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
