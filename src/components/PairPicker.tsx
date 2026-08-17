import { useEffect, useMemo, useState } from 'react'
import { fetchCurrencies, fetchForexRate } from '../lib/api'
import { fmtPrice, timeAgo } from '../lib/format'
import { useMarket } from '../state/store'
import { Sparkline } from './Sparkline'

const FALLBACK_CURRENCIES = [
  'USD', 'IDR', 'EUR', 'JPY', 'GBP', 'SGD', 'AUD', 'CNY', 'KRW', 'INR', 'CHF', 'MYR', 'THB',
]

/** Pick ANY two currencies. If the pair is one of the streamed pairs it
 *  updates live over the WebSocket; otherwise it's fetched on demand. */
export function PairPicker() {
  const { forex } = useMarket()
  const [currencies, setCurrencies] = useState<string[]>(FALLBACK_CURRENCIES)
  const [base, setBase] = useState('USD')
  const [quote, setQuote] = useState('IDR')
  const [fetched, setFetched] = useState<{ rate: number; ts: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCurrencies()
      .then((r) => r.currencies.length && setCurrencies(r.currencies))
      .catch(() => {}) // fallback list already in place
  }, [])

  const streamed = forex[`${base}/${quote}`]

  useEffect(() => {
    if (streamed || base === quote) {
      setFetched(null)
      setError(null)
      return
    }
    let cancelled = false
    setFetched(null)
    setError(null)
    fetchForexRate(base, quote)
      .then((r) => !cancelled && setFetched({ rate: r.rate, ts: r.ts }))
      .catch(() => !cancelled && setError('rate unavailable for this pair'))
    return () => {
      cancelled = true
    }
  }, [base, quote, streamed])

  const rate = streamed?.rate ?? fetched?.rate
  const ts = streamed?.ts ?? fetched?.ts
  const options = useMemo(
    () => currencies.map((c) => <option key={c} value={c}>{c}</option>),
    [currencies],
  )

  return (
    <div className="card">
      <h3>
        Currency<span className="tag">FINANCIAL_SOURCE</span>
      </h3>
      <div className="pair-row">
        <select value={base} onChange={(e) => setBase(e.target.value)} aria-label="base currency">
          {options}
        </select>
        <button
          className="pair-swap"
          onClick={() => { setBase(quote); setQuote(base) }}
          title="swap currencies"
          aria-label="swap currencies"
        >
          ⇄
        </button>
        <select value={quote} onChange={(e) => setQuote(e.target.value)} aria-label="quote currency">
          {options}
        </select>
      </div>
      {base === quote ? (
        <div className="empty">Pick two different currencies.</div>
      ) : rate !== undefined ? (
        <>
          <div className="pair-rate">
            1 {base} = {fmtPrice(rate)} {quote}
          </div>
          <div className="pair-note">
            {streamed
              ? `streaming · updated ${ts ? timeAgo(ts) : ''}`
              : `on-demand rate · ${ts ? timeAgo(ts) : ''}`}
          </div>
          {streamed && streamed.history.length > 1 && (
            <div style={{ marginTop: 10 }}>
              <Sparkline
                data={streamed.history}
                direction={
                  streamed.history[streamed.history.length - 1] >= streamed.history[0]
                    ? 'up'
                    : 'down'
                }
              />
            </div>
          )}
        </>
      ) : error ? (
        <div className="empty">{error}</div>
      ) : (
        <div className="skeleton" style={{ width: '60%', height: 30 }} />
      )}
    </div>
  )
}
