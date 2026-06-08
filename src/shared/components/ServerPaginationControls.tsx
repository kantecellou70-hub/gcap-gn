import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface ServerPaginationControlsProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  isFetching: boolean
  onPageChange: (page: number) => void
  className?: string
}

export function ServerPaginationControls({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  isFetching,
  onPageChange,
  className,
}: ServerPaginationControlsProps) {
  if (totalPages <= 1 && totalCount <= pageSize) return null

  const pageNumbers = buildPageNumbers(currentPage, totalPages)

  const start = currentPage * pageSize + 1
  const end = Math.min((currentPage + 1) * pageSize, totalCount)

  return (
    <div
      data-testid="pagination-controls"
      className={cn(
        'flex items-center justify-between gap-4 py-3 border-t border-slate-200 bg-white',
        className,
      )}
    >
      <span className="text-xs text-slate-500 tabular-nums">
        {start}–{end} sur {totalCount} résultat{totalCount > 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Page précédente"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex items-center justify-center w-8 h-8 rounded border border-slate-200 text-slate-600
                     hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
        </button>

        {pageNumbers.map((n, i) =>
          n === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-slate-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-label={`Page ${(n as number) + 1}`}
              aria-current={n === currentPage ? 'page' : undefined}
              onClick={() => onPageChange(n as number)}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded border text-sm',
                n === currentPage
                  ? 'bg-indigo-600 border-indigo-600 text-white font-medium'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50',
              )}
            >
              {isFetching && n === currentPage ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                (n as number) + 1
              )}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="Page suivante"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex items-center justify-center w-8 h-8 rounded border border-slate-200 text-slate-600
                     hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)

  const pages: (number | '…')[] = []
  const WINDOW = 2

  pages.push(0)

  if (current > WINDOW + 1) pages.push('…')

  for (
    let i = Math.max(1, current - WINDOW);
    i <= Math.min(total - 2, current + WINDOW);
    i++
  ) {
    pages.push(i)
  }

  if (current < total - WINDOW - 2) pages.push('…')
  pages.push(total - 1)

  return pages
}
