import { useNavigate } from 'react-router-dom'
import type { Instrument } from '../lib/types'
import { fmtPrice, fmtPct } from '../lib/format'
import { usePinnedQuotes } from '../lib/usePinnedQuotes'
import { SymbolSearch } from './SymbolSearch'

const DISPLAY_NAMES: Record<string, string> = {
  '^JKSE': 'IHSG',
}

function Row({ s, onRemove }: { s: Instrument; onRemove?: () => void }) {
  const navigate = useNavigate()
  const dir = s.changePct > 0.005 ? 'up' : s.changePct < -0.005 ? 'down' : 'flat'
  const cls = dir === 'up' ? 'delta-up' : dir === 'down' ? 'delta-down' : 'delta-flat'
  const group = ['IDX', 'INDEX'].includes(s.market ?? '') ? 'idx' : 'us'
  const analyze = () =>
    navigate(`/statistics?group=${group}&symbol=${encodeURIComponent(s.symbol)}`)
  return (
    <tr className="clickable-row" onClick={analyze} title={`Analyse ${s.symbol} in Statistics`}>
      <td style={{ fontWeight: 600 }}>
        {onRemove && <span className="pin-dot" title="pinned">★ </span>}
        {DISPLAY_NAMES[s.symbol] ?? s.symbol.replace(/\.JK$/, '')}
        {s.symbol.endsWith('.JK') && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}> .JK</span>
        )}
      </td>
      <td className="num">{fmtPrice(s.price)}</td>
      <td className={`num ${cls}`}>
        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} {fmtPct(s.changePct)}
      </td>
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

/** A single-market watchlist card (IHSG or S&P 500) with symbol search. */
export function StockTable({
  title,
  stocks,
  hint,
  group,
}: {
  title: string
  stocks: Instrument[]
  hint?: string
  group: 'idx' | 'us'
}) {
  const pinned = usePinnedQuotes(group)
  const pinnedSet = new Set(pinned.list.map((i) => i.symbol))
  const base = stocks.filter((s) => !pinnedSet.has(s.symbol))
  const total = pinned.list.length + base.length

  return (
    <div className="card">
      <h3>
        {title}
        <span className="tag">FINANCIAL_SOURCE</span>
      </h3>
      <SymbolSearch
        group={group}
        placeholder={group === 'idx' ? 'Search IDX (e.g. GOTO)…' : 'Search US (e.g. GOOGL)…'}
        onPick={(r) => pinned.add(r.symbol, r.name)}
      />
      {total === 0 ? (
        <div className="empty">{hint ?? 'Waiting for quotes…'}</div>
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
            {pinned.list.map((s) => (
              <Row key={`pin-${s.symbol}`} s={s} onRemove={() => pinned.remove(s.symbol)} />
            ))}
            {base.map((s) => (
              <Row key={s.symbol} s={s} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
