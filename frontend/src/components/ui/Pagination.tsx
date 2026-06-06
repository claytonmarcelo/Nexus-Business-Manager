import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const delta = 1;
  const start = Math.max(2, page - delta);
  const end = Math.min(totalPages - 1, page + delta);

  pages.push(1);
  if (start > 2) pages.push('...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('...');
  if (totalPages > 1) pages.push(totalPages);

  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-xs" style={{ color: 'var(--nexus-muted-2)' }}>
        Pagina {page} de {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
          style={{ color: 'var(--nexus-muted)', border: '1px solid rgba(212,149,86,0.15)' }}
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          typeof p === 'string' ? (
            <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-xs" style={{ color: 'var(--nexus-muted-2)' }}>...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                background: p === page ? 'rgba(212, 149, 86, 0.15)' : 'transparent',
                color: p === page ? '#D49556' : 'var(--nexus-muted)',
                border: p === page ? '1px solid rgba(212, 149, 86, 0.3)' : '1px solid transparent',
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
          style={{ color: 'var(--nexus-muted)', border: '1px solid rgba(212,149,86,0.15)' }}
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
