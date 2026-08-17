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
