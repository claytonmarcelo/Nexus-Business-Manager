interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onChange: (page: number) => void;
}

// Paginação global reutilizável, coerente com o design system (seção 25).
export function Pagination({ page, pageSize, total, totalPages, onChange }: PaginationProps) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages = buildWindow(page, totalPages);

  return (
    <nav className="pagination" aria-label="Paginação de resultados">
      <span className="pagination-info">
        Exibindo <span className="mono">{start}–{end}</span> de <span className="mono">{total}</span>
      </span>
      <ul className="pagination-list">
        <li>
          <button type="button" disabled={page <= 1} onClick={() => onChange(1)} aria-label="Primeira página">«</button>
        </li>
        <li>
          <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">‹</button>
        </li>
        {pages.map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className="pagination-gap">…</li>
          ) : (
            <li key={p}>
              <button
                type="button"
                className={p === page ? "is-active" : undefined}
                aria-current={p === page ? "page" : undefined}
                onClick={() => onChange(p)}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Próxima página">›</button>
        </li>
        <li>
          <button type="button" disabled={page >= totalPages} onClick={() => onChange(totalPages)} aria-label="Última página">»</button>
        </li>
      </ul>
    </nav>
  );
}

function buildWindow(page: number, totalPages: number): (number | "…")[] {
  const delta = 1;
  const range: number[] = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) range.push(i);
  const out: (number | "…")[] = [];
  if (range[0] && range[0] > 1) {
    out.push(1);
    if (range[0] > 2) out.push("…");
  }
  out.push(...range);
  const last = range[range.length - 1];
  if (last && last < totalPages) {
    if (last < totalPages - 1) out.push("…");
    out.push(totalPages);
  }
  return out;
}
