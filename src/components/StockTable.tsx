import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Instrument, UniverseItem } from '../lib/types'
import { fmtPrice, fmtPct } from '../lib/format'
import { fetchQuote, fetchUniverse } from '../lib/api'
import { usePinnedQuotes, quoteToInstrument } from '../lib/usePinnedQuotes'
import { SymbolSearch } from './SymbolSearch'

const DISPLAY_NAMES: Record<string, string> = { '^JKSE': 'IHSG' }
type Group = 'idx' | 'us'

const dirOf = (pct: number) => (pct > 0.005 ? 'up' : pct < -0.005 ? 'down' : 'flat')

function SymbolCell({ symbol, name, pinned }: { symbol: string; name?: string; pinned?: boolean }) {
  return (
    <td style={{ fontWeight: 600 }}>
      {pinned && <span className="pin-dot" title="pinned">★ </span>}
      {DISPLAY_NAMES[symbol] ?? symbol.replace(/\.JK$/, '')}
      {symbol.endsWith('.JK') && (
        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}> .JK</span>
      )}
      {name && <div className="row-name">{name}</div>}
    </td>
  )
}

function PriceCells({ s }: { s: Instrument }) {
  const dir = dirOf(s.changePct)
  const cls = dir === 'up' ? 'delta-up' : dir === 'down' ? 'delta-down' : 'delta-flat'
  return (
    <>
      <td className="num">{fmtPrice(s.price)}</td>
      <td className={`num ${cls}`}>
        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} {fmtPct(s.changePct)}
      </td>
    </>
  )
}

/** Streamed (.env) or pinned (searched) instrument — has a live quote. */
function LiveRow({ s, onRemove }: { s: Instrument; onRemove?: () => void }) {
  const navigate = useNavigate()
  const group = ['IDX', 'INDEX'].includes(s.market ?? '') ? 'idx' : 'us'
  return (
    <tr
      className="clickable-row"
      onClick={() => navigate(`/statistics?group=${group}&symbol=${encodeURIComponent(s.symbol)}`)}
      title={`Analyse ${s.symbol} in Statistics`}
    >
      <SymbolCell symbol={s.symbol} name={s.name} pinned={!!onRemove} />
      <PriceCells s={s} />
      <td className="num" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        {onRemove ? (
          <button
            className="pin-x"
            title="remove"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            ×
          </button>
        ) : s.delayed ? (
          'delayed'
        ) : (
          'live'
        )}
      </td>
    </tr>
  )
}

/** Universe row — its quote loads lazily once it has been in view for a moment,
 *  so scrolling 500 names doesn't fire 500 requests. */
function UniverseRow({
  item,
  group,
  quote,
  onVisible,
}: {
  item: UniverseItem
  group: Group
  quote?: Instrument
  onVisible: (symbol: string) => void
}) {
  const navigate = useNavigate()
  const ref = useRef<HTMLTableRowElement>(null)
  useEffect(() => {
    if (quote || !ref.current) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        timer = setTimeout(() => onVisible(item.symbol), 350)
      } else if (timer) {
        clearTimeout(timer)
        timer = null
      }
    })
    io.observe(ref.current)
    return () => {
      io.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [item.symbol, quote, onVisible])
  return (
    <tr
      ref={ref}
      className="clickable-row"
      onClick={() => navigate(`/statistics?group=${group}&symbol=${encodeURIComponent(item.symbol)}`)}
      title={`Analyse ${item.symbol} in Statistics`}
    >
      <SymbolCell symbol={item.symbol} name={item.name} />
      {quote ? (
        <PriceCells s={quote} />
      ) : (
        <>
          <td className="num muted-cell">…</td>
          <td className="num muted-cell">…</td>
        </>
      )}
      <td className="num" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        {quote ? 'delayed' : '—'}
      </td>
    </tr>
  )
}

/** A single-market watchlist card: pinned + streamed rows on top, then the whole
 *  universe (S&P 500 / IDX) to scroll, with backend-powered search that also
 *  filters the list as you type. */
export function StockTable({
  title,
  stocks,
  hint,
  group,
}: {
  title: string
  stocks: Instrument[]
  hint?: string
  group: Group
}) {
  const pinned = usePinnedQuotes(group)
  const [universe, setUniverse] = useState<UniverseItem[]>([])
  const [lazy, setLazy] = useState<Record<string, Instrument>>({})
  const [filter, setFilter] = useState('')
  const inflight = useRef(new Set<string>())

  useEffect(() => {
    let live = true
    fetchUniverse(group)
      .then((r) => live && setUniverse(r.items))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [group])

  const loadQuote = useCallback(
    (symbol: string) => {
      if (inflight.current.has(symbol)) return
      inflight.current.add(symbol)
      fetchQuote(symbol, group)
        .then((q) =>
          setLazy((prev) => (prev[symbol] ? prev : { ...prev, [symbol]: quoteToInstrument(symbol, q, group) })),
        )
        .catch(() => {})
    },
    [group],
  )

  const q = filter.trim().toLowerCase()
  const match = (sym: string, name?: string) =>
    !q || sym.toLowerCase().includes(q) || (name ?? '').toLowerCase().includes(q)

  const shown = new Set<string>([...pinned.list.map((i) => i.symbol), ...stocks.map((s) => s.symbol)])
  const pinnedRows = pinned.list.filter((s) => match(s.symbol, s.name))
  const baseRows = stocks.filter((s) => !pinned.has(s.symbol) && match(s.symbol, s.name))
  const universeRows = universe.filter((u) => !shown.has(u.symbol) && match(u.symbol, u.name))
  const total = pinnedRows.length + baseRows.length + universeRows.length

  return (
    <div className="card">
      <h3>
        {title}
        <span className="tag">FINANCIAL_SOURCE</span>
      </h3>
      <SymbolSearch
        group={group}
        placeholder={group === 'idx' ? 'Search IDX (e.g. GOTO)…' : 'Search S&P 500 (e.g. GOOGL)…'}
        onPick={(r) => pinned.add(r.symbol, r.name)}
        onQueryChange={setFilter}
      />
      <div className="table-scroll">
        {total === 0 ? (
          <div className="empty">{q ? 'No matches in this list.' : hint ?? 'Waiting for quotes…'}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="num">Price</th>
                <th className="num">Change</th>
                <th className="num">Feed</th>
              </tr>
            </thead>
            <tbody>
              {pinnedRows.map((s) => (
                <LiveRow key={`pin-${s.symbol}`} s={s} onRemove={() => pinned.remove(s.symbol)} />
              ))}
              {baseRows.map((s) => (
                <LiveRow key={s.symbol} s={s} />
              ))}
              {universeRows.map((u) => (
                <UniverseRow
                  key={`u-${u.symbol}`}
                  item={u}
                  group={group}
                  quote={lazy[u.symbol]}
                  onVisible={loadQuote}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="row-count">
        {total} instruments{universe.length ? ` · ${universe.length} in universe` : ''}
      </div>
    </div>
  )
}
