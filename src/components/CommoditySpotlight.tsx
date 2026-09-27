import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarket } from '../state/store'
import { fmtPrice, fmtPct, orderCommodities } from '../lib/format'
import { fetchUniverse } from '../lib/api'
import type { Instrument, UniverseItem } from '../lib/types'
import { usePinnedQuotes } from '../lib/usePinnedQuotes'
import { Sparkline } from './Sparkline'
import { SymbolSearch } from './SymbolSearch'

/** One commodity at a time (gold by default). The dropdown lists the streamed
 *  commodities first, then the WHOLE commodity universe (metals, energy, grains,
 *  softs, livestock) — pick any and it loads on demand. Search also works. */
export function CommoditySpotlight() {
  const { commodities } = useMarket()
  const navigate = useNavigate()
  const pinned = usePinnedQuotes('commodity')
  const [selected, setSelected] = useState<string | null>(null)
  const [universe, setUniverse] = useState<UniverseItem[]>([])

  useEffect(() => {
    let live = true
    fetchUniverse('commodity')
      .then((r) => live && setUniverse(r.items))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const merged: Record<string, Instrument> = { ...commodities }
  for (const i of pinned.list) merged[i.symbol] = i
  const liveSymbols = orderCommodities(Object.keys(merged))
  const liveNames = new Set(
    Object.values(merged)
      .map((i) => (i.name ?? '').toLowerCase())
      .filter(Boolean),
  )
  // universe entries not already live (dedupe gold GC=F vs streamed XAUUSD by name)
  const more = universe.filter((u) => !merged[u.symbol] && !liveNames.has(u.name.toLowerCase()))

  const active = selected && merged[selected] ? selected : liveSymbols[0]
  const inst = active ? merged[active] : undefined
  const pending = selected && !merged[selected] ? selected : null

  const choose = (sym: string) => {
    setSelected(sym)
    if (!merged[sym]) pinned.add(sym, universe.find((u) => u.symbol === sym)?.name)
  }

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

  const header = (
    <div className="ticker-head">
      <h3 style={{ margin: 0 }}>
        Commodities<span className="tag">FINANCIAL_SOURCE</span>
      </h3>
      {(liveSymbols.length > 0 || more.length > 0) && (
        <select
          className="crypto-select"
          value={selected ?? active ?? ''}
          onChange={(e) => choose(e.target.value)}
          aria-label="choose commodity"
        >
          <optgroup label="Live">
            {liveSymbols.map((s) => (
              <option key={s} value={s}>
                {merged[s].name ?? s}
              </option>
            ))}
          </optgroup>
          {more.length > 0 && (
            <optgroup label="All commodities">
              {more.map((u) => (
                <option key={u.symbol} value={u.symbol}>
                  {u.name} · {u.symbol}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      )}
    </div>
  )

  const search = (
    <SymbolSearch
      group="commodity"
      placeholder="Search commodity (e.g. wheat, GLD)…"
      onPick={(r) => {
        pinned.add(r.symbol, r.name)
        setSelected(r.symbol)
      }}
    />
  )

  if (!inst || !active) {
    return (
      <div className="card ticker-card">
        {header}
        {search}
        <div className="skeleton" style={{ width: '55%', height: 26 }} />
        <div className="skeleton" style={{ width: '100%', height: 44 }} />
      </div>
    )
  }

  const dir = inst.changePct > 0.005 ? 'up' : inst.changePct < -0.005 ? 'down' : 'flat'
  const deltaClass = dir === 'up' ? 'delta-up' : dir === 'down' ? 'delta-down' : 'delta-flat'
  const label = inst.name ? `${inst.name} · ${active}` : active
  const isPinned = pinned.has(active)

  return (
    <div className="card ticker-card">
      {header}
      {search}
      <div className="ticker-sym">
        {label}
        {isPinned && (
          <button
            className="pin-x"
            title="remove"
            onClick={() => {
              pinned.remove(active)
              setSelected(null)
            }}
          >
            {' '}×
          </button>
        )}
        {pending && <span className="spotlight-range"> · loading {pending}…</span>}
      </div>
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
      <Sparkline data={inst.history} direction={dir} height={80} />
      <button
        className="analyze-link"
        onClick={() => navigate(`/statistics?group=commodity&symbol=${active}`)}
      >
        Analyse in Statistics →
      </button>
    </div>
  )
}
