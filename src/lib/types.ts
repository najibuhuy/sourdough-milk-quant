export interface Envelope {
  group: 'MARKET_SOURCE' | 'FINANCIAL_SOURCE' | 'NEWS_SOURCE'
  source: string
  kind: 'ticker' | 'stock' | 'stock_trade' | 'forex' | 'news'
  symbol: string
  ts: number
  data: Record<string, unknown>
}

export interface Instrument {
  symbol: string
  price: number
  changePct: number
  open?: number
  high?: number
  low?: number
  volume?: number
  delayed?: boolean
  /** exchange grouping: US | IDX | INDEX | COMMODITY */
  market?: string
  /** human-readable name, e.g. "Gold" for XAUUSD (set by commodity feeds) */
  name?: string
  currency?: string
  source: string
  ts: number
  /** rolling price history for sparklines */
  history: number[]
}

export interface ForexRate {
  pair: string
  base: string
  quote: string
  rate: number
  delayed: boolean
  source: string
  ts: number
  history: number[]
}

export interface NewsItem {
  id: string
  title: string
  link?: string
  source: string
  published: number
}

/** One OHLC bar from /api/history. */
export interface Candle {
  ts: number
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

/** A symbol-search hit from /api/search (Yahoo). */
export interface SymbolSearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

/** A one-off quote from /api/quote for a searched symbol. */
export interface Quote {
  symbol: string
  price: number
  prev_close: number | null
  change_pct: number
  high: number | null
  low: number | null
  currency: string | null
  delayed: boolean
}

/** An upcoming economic-calendar event from /api/calendar (MACRO_SOURCE). */
export interface EconEvent {
  title: string
  country: string
  impact: 'High' | 'Medium' | 'Low' | string
  ts: number
  forecast: string
  previous: string
}

/** A journaled prediction (+ its outcome once resolved) from /api/predictions. */
export interface Prediction {
  id: number
  symbol: string
  group: string
  method: string
  verdict: 'bull' | 'bear' | 'neutral'
  confidence: number | null
  price_at: number
  horizon_secs: number
  made_at: number
  resolve_at: number
  resolved: boolean
  price_after: number | null
  correct: boolean | null
  note: string | null
}
