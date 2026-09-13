import { useEffect, useRef, useState } from 'react'
import { fetchSearch } from '../lib/api'
import type { SymbolSearchResult } from '../lib/types'

type Group = 'idx' | 'us' | 'commodity'

interface Props {
  group: Group
  onPick: (r: SymbolSearchResult) => void
  placeholder?: string
}

/** Debounced symbol search with an autocomplete dropdown. Results come from the
 *  backend /api/search already filtered to the card's group — the frontend just
 *  renders them. */
export function SymbolSearch({ group, onPick, placeholder }: Props) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SymbolSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      fetchSearch(term, group)
        .then((r) => {
          if (!cancelled) {
            setResults(r.results)
            setOpen(true)
          }
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, group])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (r: SymbolSearchResult) => {
    onPick(r)
    setQ('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="sym-search" ref={ref}>
      <input
        className="sym-search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder ?? 'Search symbol…'}
        aria-label="search symbol"
      />
      {open && results.length > 0 && (
        <div className="sym-search-drop">
          {results.map((r) => (
            <button className="sym-search-item" key={r.symbol} onClick={() => pick(r)} type="button">
              <span className="ss-sym">{r.symbol}</span>
              <span className="ss-name">{r.name}</span>
              <span className="ss-exch">{r.exchange}</span>
            </button>
          ))}
        </div>
      )}
      {loading && q.trim().length >= 2 && open === false && (
        <div className="sym-search-hint">searching…</div>
      )}
    </div>
  )
}
