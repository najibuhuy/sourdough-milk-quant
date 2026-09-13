import { useCallback, useEffect, useState } from 'react'
import { fetchQuote } from './api'
import type { Instrument, Quote } from './types'

function toInstrument(symbol: string, q: Quote, group: string, name?: string): Instrument {
  return {
    symbol,
    price: q.price,
    changePct: q.change_pct,
    high: q.high ?? undefined,
    low: q.low ?? undefined,
    delayed: q.delayed,
    market: group === 'idx' ? 'IDX' : group === 'commodity' ? 'COMMODITY' : 'US',
    name,
    currency: q.currency ?? undefined,
    source: 'yahoo',
    ts: Date.now(),
    history: [],
  }
}

/** Session watchlist of user-searched symbols: fetches an initial quote on add
 *  and refreshes every 20s. Not streamed over the WS (those are the configured
 *  symbols) — these are on-demand /api/quote pulls. */
export function usePinnedQuotes(group: string) {
  const [symbols, setSymbols] = useState<string[]>([])
  const [quotes, setQuotes] = useState<Record<string, Instrument>>({})

  const add = useCallback(
    (symbol: string, name?: string) => {
      setSymbols((prev) => (prev.includes(symbol) ? prev : [symbol, ...prev]))
      fetchQuote(symbol, group)
        .then((q) => setQuotes((prev) => ({ ...prev, [symbol]: toInstrument(symbol, q, group, name) })))
        .catch(() => {})
    },
    [group],
  )

  const remove = useCallback((symbol: string) => {
    setSymbols((prev) => prev.filter((s) => s !== symbol))
    setQuotes((prev) => {
      const next = { ...prev }
      delete next[symbol]
      return next
    })
  }, [])

  useEffect(() => {
    if (symbols.length === 0) return
    const t = setInterval(() => {
      symbols.forEach((s) =>
        fetchQuote(s, group)
          .then((q) =>
            setQuotes((prev) =>
              prev[s]
                ? {
                    ...prev,
                    [s]: {
                      ...prev[s],
                      price: q.price,
                      changePct: q.change_pct,
                      high: q.high ?? prev[s].high,
                      low: q.low ?? prev[s].low,
                      ts: Date.now(),
                    },
                  }
                : prev,
            ),
          )
          .catch(() => {}),
      )
    }, 20_000)
    return () => clearInterval(t)
  }, [symbols, group])

  const list = symbols.map((s) => quotes[s]).filter(Boolean) as Instrument[]
  return { list, add, remove, has: (s: string) => symbols.includes(s) }
}
