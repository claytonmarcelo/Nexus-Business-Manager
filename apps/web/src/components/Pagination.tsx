import { useState } from "react";

// Paginação única do sistema (seção 25 do PROMPT MESTRE).
// Todas as tabelas e listagens usam este componente no rodapé, com o mesmo
// resumo à esquerda e a mesma navegação à direita, no tema escuro do Nexus.

// Limite padrão por página e as opções que o usuário pode escolher.
export const PAGE_SIZE_PADRAO = 10;
export const PAGE_SIZES = [10, 25, 50, 100];

interface PaginationProps {
  /** Página atual (1-baseada). */
  page: number;
  /** Itens exibidos por página. */
  pageSize: number;
  /** Total de registros do recorte (todos os páginas). */
  total: number;
  /** Total de páginas do recorte. */
  totalPages: number;
  /** Vai para a página informada. */
  onChange: (page: number) => void;
  /** Quando informado, mostra o seletor de itens por página. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Opções do seletor. Padrão [10, 25, 50, 100]. */
  pageSizeOptions?: number[];
  /** Nome do que está sendo paginado no plural: "clientes", "leads". */
  itemLabel?: string;
  /** Mesmo nome no singular, para "1 cliente" ficar correto. */
  itemLabelSingular?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZES,
  itemLabel = "registros",
  itemLabelSingular,
}: PaginationProps) {
  if (total <= 0) return null;

  const atual = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const inicio = (atual - 1) * pageSize + 1;
  const fim = Math.min(atual * pageSize, total);
  const nome = total === 1 ? itemLabelSingular ?? itemLabel : itemLabel;
  const opciones = opcoesDePageSize(pageSizeOptions, pageSize);

  return (
    <nav className="pagination" aria-label="Paginação dos resultados">
      <p className="pagination-info" aria-live="polite">
        Exibindo <span className="mono">{inicio}–{fim}</span> de <span className="mono">{total}</span> {nome}{" "}
        <span className="pagination-page">página {atual} de {Math.max(1, totalPages)}</span>
      </p>

      <div className="pagination-controls">
        {onPageSizeChange ? (
          <label className="pagination-size">
            <span>Itens por página</span>
            <select
              className="select select-sm"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Itens exibidos por página"
            >
              {opciones.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        ) : null}

        <ul className="pagination-list">
          <li>
            <button type="button" disabled={atual <= 1} onClick={() => onChange(1)} aria-label="Primeira página">«</button>
          </li>
          <li>
            <button type="button" disabled={atual <= 1} onClick={() => onChange(atual - 1)} aria-label="Página anterior">‹</button>
          </li>
          {janela(atual, totalPages).map((p, i) =>
            p === "…" ? (
              <li key={`vão-${i}`} className="pagination-gap" aria-hidden="true">…</li>
            ) : (
              <li key={p}>
                <button
                  type="button"
                  className={p === atual ? "is-active" : undefined}
                  aria-current={p === atual ? "page" : undefined}
                  aria-label={"Página " + p}
                  onClick={() => onChange(p)}
                >
                  {p}
                </button>
              </li>
            ),
          )}
          <li>
            <button type="button" disabled={atual >= totalPages} onClick={() => onChange(atual + 1)} aria-label="Próxima página">›</button>
          </li>
          <li>
            <button type="button" disabled={atual >= totalPages} onClick={() => onChange(totalPages)} aria-label="Última página">»</button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

// Paginação do lado do navegador, para as listas que o servidor devolve prontas
// (análises, sessões, cotações). Mantém o mesmo visual e o mesmo seletor.
export function usePaginacaoLocal<T>(itens: readonly T[], tamanhoInicial: number = PAGE_SIZE_PADRAO) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(tamanhoInicial);
  const total = itens.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const atual = Math.min(Math.max(1, page), totalPages);
  return {
    itens: itens.slice((atual - 1) * pageSize, (atual - 1) * pageSize + pageSize),
    total,
    pagina: {
      page: atual,
      pageSize,
      total,
      totalPages,
      onChange: setPage,
      onPageSizeChange: (n: number) => {
        setPageSize(n);
        setPage(1);
      },
    },
  };
}

// O valor vindo do servidor precisa existir no seletor, mesmo fora do padrão.
function opcoesDePageSize(opcoes: number[], atual: number): number[] {
  return opcoes.includes(atual) ? opcoes : [...opcoes, atual].sort((a, b) => a - b);
}

// Janela de páginas: sempre a primeira, a última e as vizinhas da atual.
function janela(page: number, totalPages: number): (number | "…")[] {
  const margem = 2;
  const dentro: number[] = [];
  for (let i = Math.max(1, page - margem); i <= Math.min(totalPages, page + margem); i++) dentro.push(i);
  const saida: (number | "…")[] = [];
  if (dentro[0] && dentro[0] > 1) {
    saida.push(1);
    if (dentro[0] > 2) saida.push("…");
  }
  saida.push(...dentro);
  const ultima = dentro[dentro.length - 1];
  if (ultima && ultima < totalPages) {
    if (ultima < totalPages - 1) saida.push("…");
    saida.push(totalPages);
  }
  return saida;
}
