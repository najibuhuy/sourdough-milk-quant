import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarket } from '../state/store'
import { fmtPrice, fmtPct, orderCommodities } from '../lib/format'
import { Sparkline } from './Sparkline'

/** One commodity at a time (gold by default) — big price, delta, day range,
 *  trend. Fed by the keyless Yahoo commodity feed (kind:stock, market:COMMODITY),
 *  so XAUUSD, XAGUSD, WTIUSD… all render here as they're configured. */
export function CommoditySpotlight() {
  const { commodities } = useMarket()
  const navigate = useNavigate()
  const symbols = orderCommodities(Object.keys(commodities))
  const [selected, setSelected] = useState<string | null>(null)

  const active = selected && commodities[selected] ? selected : symbols[0]
  const inst = active ? commodities[active] : undefined

  const prevPrice = useRef<number | null>(null)
  const [flash, setFlash] = useState<'flash-up' | 'flash-down' | ''>('')
  useEffect(() => {
    if (!inst) return
    if (prevPrice.current !== null) {
      if (inst.price > prevPrice.current) setFlash('flash-up')
      else if (inst.price < prevPrice.current) setFlash('flash-down')
    }
    prevPrice.current = inst.price
    const t = setTimeout(() => setFlash(''), 450)
    return () => clearTimeout(t)
  }, [inst?.price, inst])

  if (!inst || !active) {
    return (
      <div className="card ticker-card">
        <h3>
          Commodities<span className="tag">FINANCIAL_SOURCE</span>
        </h3>
        <div className="skeleton" style={{ width: '55%', height: 26 }} />
        <div className="skeleton" style={{ width: '100%', height: 44 }} />
      </div>
    )
  }

  const dir =
    inst.changePct > 0.005 ? 'up' : inst.changePct < -0.005 ? 'down' : 'flat'
  const deltaClass =
    dir === 'up' ? 'delta-up' : dir === 'down' ? 'delta-down' : 'delta-flat'
  const label = inst.name ? `${inst.name} · ${active}` : active

  return (
    <div className="card ticker-card">
      <div className="ticker-head">
        <h3 style={{ margin: 0 }}>
          Commodities<span className="tag">FINANCIAL_SOURCE</span>
        </h3>
        {symbols.length > 1 && (
          <select
            className="crypto-select"
            value={active}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="choose commodity"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>
                {commodities[s].name ?? s}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="ticker-sym">{label}</div>
      <div className={`spotlight-price ${flash}`}>
        {fmtPrice(inst.price)}
        <span className="spotlight-range"> {inst.currency ?? 'USD'}</span>
      </div>
      <div className={`ticker-delta ${deltaClass}`}>
        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} {fmtPct(inst.changePct)}
        <span className="spotlight-range">
          {inst.low !== undefined && inst.high !== undefined
            ? ` · day ${fmtPrice(inst.low)} – ${fmtPrice(inst.high)}`
            : ''}
          {inst.delayed ? ' · delayed' : ''}
        </span>
      </div>
      <Sparkline data={inst.history} direction={dir} height={48} />
      <button
        className="analyze-link"
        onClick={() => navigate(`/statistics?group=commodity&symbol=${active}`)}
      >
        Analyse in Statistics →
      </button>
    </div>
  )
}
