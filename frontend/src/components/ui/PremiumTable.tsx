export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  hide?: 'sm' | 'md' | 'lg';
}

interface PremiumTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function PremiumTable<T extends { id: number | string }>({
  columns, data, loading, emptyMessage = 'Nenhum registro encontrado.', onRowClick,
}: PremiumTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'rgba(var(--nexus-gold-rgb), 0.06)' }} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: 'var(--nexus-muted)' }}>{emptyMessage}</p>
      </div>
    );
  }

  const hideClass = (hide?: 'sm' | 'md' | 'lg') => {
    if (hide === 'sm') return 'hidden sm:table-cell';
    if (hide === 'md') return 'hidden md:table-cell';
    if (hide === 'lg') return 'hidden lg:table-cell';
    return '';
  };

  return (
    <div className="overflow-x-auto animate-fade-in-up">
      <table className="stock-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={hideClass(col.hide)}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className={hideClass(col.hide)}>{col.render(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
