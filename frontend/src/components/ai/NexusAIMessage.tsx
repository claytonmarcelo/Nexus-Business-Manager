import { SparklesIcon, UserIcon } from '@heroicons/react/24/solid';

interface Props {
  text: string;
  isUser: boolean;
  suggestions?: string[];
  onSuggestionClick?: (s: string) => void;
}

export function NexusAIMessage({ text, isUser, suggestions, onSuggestionClick }: Props) {
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-brand-primary/20' : 'bg-brand-rose/20'}`}>
        {isUser ? (
          <UserIcon className="w-4 h-4 text-brand-primary" />
        ) : (
          <SparklesIcon className="w-4 h-4 text-brand-rose" />
        )}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-primary/20 text-brand-text border border-brand-primary/30'
              : 'bg-[rgba(24,22,22,0.94)] text-brand-text border border-brand-border'
          }`}
        >
          {text}
        </div>
        {!isUser && suggestions && suggestions.length > 0 && onSuggestionClick && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="text-xs px-2.5 py-1 rounded-full border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold transition-colors"
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
