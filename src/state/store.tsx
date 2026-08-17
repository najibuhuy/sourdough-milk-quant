import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { Envelope, ForexRate, Instrument, NewsItem } from '../lib/types'
import { wsUrl } from '../lib/api'

const HISTORY_LEN = 120
const NEWS_LEN = 150

export interface MarketState {
  connected: boolean
  crypto: Record<string, Instrument>
  stocks: Record<string, Instrument>
  forex: Record<string, ForexRate>
  news: NewsItem[]
}

const initial: MarketState = {
  connected: false,
  crypto: {},
  stocks: {},
  forex: {},
  news: [],
}

type Action =
  | { type: 'connected'; value: boolean }
  | { type: 'event'; env: Envelope }

function pushHistory(history: number[], value: number): number[] {
  const next = history.length >= HISTORY_LEN ? history.slice(1) : history.slice()
  next.push(value)
  return next
}

function upsertInstrument(
  map: Record<string, Instrument>,
  env: Envelope,
  priceKey = 'price',
): Record<string, Instrument> {
  const d = env.data
  const price = Number(d[priceKey])
  if (!Number.isFinite(price)) return map
  const prev = map[env.symbol]
  const inst: Instrument = {
    symbol: env.symbol,
    price,
    changePct: Number(d['change_pct'] ?? prev?.changePct ?? 0),
    open: Number(d['open'] ?? prev?.open ?? NaN) || prev?.open,
    high: Number(d['high'] ?? prev?.high ?? NaN) || prev?.high,
    low: Number(d['low'] ?? prev?.low ?? NaN) || prev?.low,
    volume: Number(d['volume'] ?? prev?.volume ?? NaN) || prev?.volume,
    delayed: Boolean(d['delayed'] ?? prev?.delayed ?? false),
    market: (d['market'] as string | undefined) ?? prev?.market,
    currency: (d['currency'] as string | undefined) ?? prev?.currency,
    source: env.source,
    ts: env.ts,
    history: pushHistory(prev?.history ?? [], price),
  }
  return { ...map, [env.symbol]: inst }
}

function reducer(state: MarketState, action: Action): MarketState {
  if (action.type === 'connected') {
    return { ...state, connected: action.value }
  }
  const env = action.env
  switch (env.kind) {
    case 'ticker':
      return { ...state, crypto: upsertInstrument(state.crypto, env) }
    case 'stock':
    case 'stock_trade':
      return { ...state, stocks: upsertInstrument(state.stocks, env) }
    case 'forex': {
      const rate = Number(env.data['rate'])
      if (!Number.isFinite(rate)) return state
      const prev = state.forex[env.symbol]
      const fx: ForexRate = {
        pair: env.symbol,
        base: String(env.data['base'] ?? ''),
        quote: String(env.data['quote'] ?? ''),
        rate,
        delayed: Boolean(env.data['delayed'] ?? false),
        source: env.source,
        ts: env.ts,
        history: pushHistory(prev?.history ?? [], rate),
      }
      return { ...state, forex: { ...state.forex, [env.symbol]: fx } }
    }
    case 'news': {
      const d = env.data
      const id = String(d['link'] ?? d['title'] ?? env.ts)
      if (state.news.some((n) => n.id === id)) return state
      const item: NewsItem = {
        id,
        title: String(d['title'] ?? '(untitled)'),
        link: d['link'] ? String(d['link']) : undefined,
        source: String(d['source'] ?? env.symbol),
        published: Number(d['published'] ?? env.ts),
      }
      const news = [item, ...state.news]
        .sort((a, b) => b.published - a.published)
        .slice(0, NEWS_LEN)
      return { ...state, news }
    }
    default:
      return state
  }
}

const StoreContext = createContext<MarketState>(initial)

export function useMarket(): MarketState {
  return useContext(StoreContext)
}

/** Single WebSocket for the whole app: auto-reconnect with backoff,
 *  snapshot replay handled server-side, every event dispatched here. */
export function MarketProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)

  useEffect(() => {
    let ws: WebSocket | null = null
    let closed = false
    let backoff = 1000

    const connect = () => {
      if (closed) return
      ws = new WebSocket(wsUrl())
      ws.onopen = () => {
        backoff = 1000
        dispatch({ type: 'connected', value: true })
      }
      ws.onmessage = (e) => {
        try {
          dispatch({ type: 'event', env: JSON.parse(e.data as string) })
        } catch {
          /* ignore malformed frames */
        }
      }
      ws.onclose = () => {
        dispatch({ type: 'connected', value: false })
        if (!closed) {
          setTimeout(connect, backoff)
          backoff = Math.min(backoff * 2, 15000)
        }
      }
      ws.onerror = () => ws?.close()
    }

    connect()
    return () => {
      closed = true
      ws?.close()
    }
  }, [])

  return <StoreContext.Provider value={state}>{children}</StoreContext.Provider>
}
