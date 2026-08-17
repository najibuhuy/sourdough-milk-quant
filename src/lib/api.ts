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
