import { useEffect, useRef, useState } from 'react'
import type { Instrument } from '../lib/types'
import { fmtPrice, fmtPct } from '../lib/format'
import { Sparkline } from './Sparkline'

export function TickerCard({ inst }: { inst: Instrument }) {
  const prevPrice = useRef(inst.price)
  const [flash, setFlash] = useState<'flash-up' | 'flash-down' | ''>('')

  useEffect(() => {
    if (inst.price > prevPrice.current) setFlash('flash-up')
    else if (inst.price < prevPrice.current) setFlash('flash-down')
    prevPrice.current = inst.price
    const t = setTimeout(() => setFlash(''), 450)
    return () => clearTimeout(t)
  }, [inst.price])

  const dir =
    inst.changePct > 0.005 ? 'up' : inst.changePct < -0.005 ? 'down' : 'flat'
  const deltaClass =
    dir === 'up' ? 'delta-up' : dir === 'down' ? 'delta-down' : 'delta-flat'
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'

  return (
    <div className="card ticker-card">
      <div className="ticker-head">
        <span className="ticker-sym">{inst.symbol}</span>
        <span className="ticker-src">
          {inst.source}
          {inst.delayed ? ' · delayed' : ''}
        </span>
      </div>
      <div className={`ticker-price ${flash}`}>{fmtPrice(inst.price)}</div>
      <div className={`ticker-delta ${deltaClass}`}>
        {arrow} {fmtPct(inst.changePct)}
      </div>
      <Sparkline data={inst.history} direction={dir} />
    </div>
  )
}
