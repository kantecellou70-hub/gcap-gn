import {
  useState, useRef, useEffect, useId,
  type ReactNode, type KeyboardEvent,
} from 'react'
import { Search, ChevronDown, Loader2, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface ComboboxItem {
  id: string
  label: string
  disabled?: boolean
}

interface ComboboxRechercheProps<T extends ComboboxItem> {
  items: T[]
  onSelect: (item: T) => void
  placeholder?: string
  renderItem?: (item: T, isHighlighted: boolean) => ReactNode
  isLoading?: boolean
  value?: T | null
  onSearchChange?: (query: string) => void
  disabled?: boolean
  className?: string
  emptyText?: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function ComboboxRecherche<T extends ComboboxItem>({
  items,
  onSelect,
  placeholder = 'Rechercher…',
  renderItem,
  isLoading = false,
  value,
  onSearchChange,
  disabled = false,
  className,
  emptyText = 'Aucun résultat',
}: ComboboxRechercheProps<T>) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const listRef      = useRef<HTMLUListElement>(null)

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    onSearchChange?.(debouncedSearch)
  }, [debouncedSearch, onSearchChange])

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  )

  // Fermer si clic extérieur
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(item: T) {
    if (item.disabled) return
    onSelect(item)
    setSearch('')
    setOpen(false)
    setHighlighted(0)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[highlighted]
      if (item && !item.disabled) { handleSelect(item) }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onSelect(null as unknown as T)
    setSearch('')
  }

  // Scroll l'item en surbrillance dans la liste
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[highlighted] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-sm bg-white',
          'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent',
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'border-slate-300 cursor-text',
        )}
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus() } }}
      >
        <Search size={14} className="text-slate-400 shrink-0" />
        {value && !open ? (
          <span className="flex-1 truncate text-slate-900">{value.label}</span>
        ) : (
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setHighlighted(0); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value ? value.label : placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none placeholder-slate-400 text-slate-900"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={`${id}-list`}
          />
        )}
        {isLoading && <Loader2 size={14} className="animate-spin text-slate-400 shrink-0" />}
        {value && !isLoading && (
          <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X size={14} />
          </button>
        )}
        {!value && <ChevronDown size={14} className={cn('text-slate-400 shrink-0 transition-transform', open && 'rotate-180')} />}
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          id={`${id}-list`}
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1"
        >
          {filtered.length === 0 && !isLoading ? (
            <li className="px-4 py-3 text-sm text-slate-400 text-center">{emptyText}</li>
          ) : (
            filtered.map((item, idx) => (
              <li
                key={item.id}
                role="option"
                aria-selected={idx === highlighted}
                aria-disabled={item.disabled}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlighted(idx)}
                className={cn(
                  'px-4 py-2 text-sm cursor-pointer select-none',
                  item.disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-800',
                  idx === highlighted && !item.disabled && 'bg-indigo-50 text-indigo-900',
                )}
              >
                {renderItem ? renderItem(item, idx === highlighted) : item.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
