import type { Candle, EconEvent, Prediction, Quote, SymbolSearchResult } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export const fetchCurrencies = () =>
  getJson<{ currencies: string[] }>('/api/currencies')

export const fetchForexRate = (base: string, quote: string) =>
  getJson<{ base: string; quote: string; rate: number; ts: number }>(
    `/api/forex?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}`,
  )

export function wsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL
  if (explicit) return explicit
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${location.host}/ws`
}

export const fetchHistory = (
  symbol: string,
  group: string,
  range = '6mo',
  interval = '1d',
) =>
  getJson<{ symbol: string; group: string; candles: Candle[] }>(
    `/api/history?symbol=${encodeURIComponent(symbol)}&group=${encodeURIComponent(
      group,
    )}&range=${range}&interval=${interval}`,
  )

export const fetchPredictions = () =>
  getJson<{ enabled: boolean; items: Prediction[] }>('/api/predictions')

export const fetchCalendar = () =>
  getJson<{ ts: number; events: EconEvent[] }>('/api/calendar')

export const fetchSearch = (q: string, group?: string) =>
  getJson<{ results: SymbolSearchResult[] }>(
    `/api/search?q=${encodeURIComponent(q)}${group ? `&group=${encodeURIComponent(group)}` : ''}`,
  )

export const fetchQuote = (symbol: string, group: string) =>
  getJson<Quote>(
    `/api/quote?symbol=${encodeURIComponent(symbol)}&group=${encodeURIComponent(group)}`,
  )

export interface NewPrediction {
  symbol: string
  group: string
  method: string
  verdict: 'bull' | 'bear' | 'neutral'
  confidence: number | null
  price_at: number
  horizon_secs: number
  note?: string | null
}

export async function createPrediction(
  body: NewPrediction,
): Promise<{ id: number; saved: boolean }> {
  const res = await fetch(`${API_BASE}/api/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `save failed (${res.status})`)
  return data
}
