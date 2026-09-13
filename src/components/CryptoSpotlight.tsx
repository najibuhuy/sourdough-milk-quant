import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarket } from '../state/store'
import { fmtPrice, fmtPct } from '../lib/format'
import { Sparkline } from './Sparkline'

/** One crypto at a time, user-selectable — big price, delta, day range, trend. */
export function CryptoSpotlight() {
  const { crypto } = useMarket()
  const navigate = useNavigate()
  const symbols = Object.keys(crypto).sort()
  const [selected, setSelected] = useState<string | null>(null)

  const active = selected && crypto[selected] ? selected : symbols[0]
  const inst = active ? crypto[active] : undefined

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

  if (!inst) {
    return (
      <div className="card ticker-card">
        <h3>
          Crypto<span className="tag">MARKET_SOURCE</span>
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

  return (
    <div className="card ticker-card">
      <div className="ticker-head">
        <h3 style={{ margin: 0 }}>
          Crypto<span className="tag">MARKET_SOURCE</span>
        </h3>
        <select
          className="crypto-select"
          value={active}
          onChange={(e) => setSelected(e.target.value)}
          aria-label="choose crypto"
        >
          {symbols.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className={`spotlight-price ${flash}`}>{fmtPrice(inst.price)}</div>
      <div className={`ticker-delta ${deltaClass}`}>
        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} {fmtPct(inst.changePct)}
        <span className="spotlight-range">
          {inst.low !== undefined && inst.high !== undefined
            ? ` · day ${fmtPrice(inst.low)} – ${fmtPrice(inst.high)}`
            : ''}
        </span>
      </div>
      <Sparkline data={inst.history} direction={dir} height={80} />
      <button
        className="analyze-link"
        onClick={() => navigate(`/statistics?group=crypto&symbol=${active}`)}
      >
        Analyse in Statistics →
      </button>
    </div>
  )
}
