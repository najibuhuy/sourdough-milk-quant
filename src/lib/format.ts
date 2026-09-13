export function fmtPrice(v: number): string {
  if (!Number.isFinite(v)) return '—'
  if (v >= 10000) return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (v >= 100) return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (v >= 1) return v.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return v.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

export function fmtPct(v: number): string {
  if (!Number.isFinite(v)) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

/** Compact number (1.2M, 3.4B) for volumes. */
export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

/** Preferred display order for commodities — gold first. */
export const COMMODITY_ORDER = [
  'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'WTIUSD', 'BRENTUSD', 'NATGAS', 'COPPER',
]

export function orderCommodities(symbols: string[]): string[] {
  return [...symbols].sort((a, b) => {
    const ia = COMMODITY_ORDER.indexOf(a)
    const ib = COMMODITY_ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b)
  })
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
