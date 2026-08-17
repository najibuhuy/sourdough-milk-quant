import { Fragment } from 'react'
import type { Instrument } from '../lib/types'
import { fmtPrice, fmtPct } from '../lib/format'

const DISPLAY_NAMES: Record<string, string> = {
  '^JKSE': 'IHSG',
}

const MARKET_LABELS: Record<string, string> = {
  IDX: 'Indonesia · IDX',
  US: 'United States',
  INDEX: 'Indices',
}

function Row({ s }: { s: Instrument }) {
  const dir =
    s.changePct > 0.005 ? 'up' : s.changePct < -0.005 ? 'down' : 'flat'
  const cls =
    dir === 'up' ? 'delta-up' : dir === 'down' ? 'delta-down' : 'delta-flat'
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>
        {DISPLAY_NAMES[s.symbol] ?? s.symbol.replace(/\.JK$/, '')}
        {s.symbol.endsWith('.JK') && (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>
            {' '}.JK
          </span>
        )}
      </td>
      <td className="num">{fmtPrice(s.price)}</td>
      <td className={`num ${cls}`}>
        {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} {fmtPct(s.changePct)}
      </td>
      <td className="num" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        {s.delayed ? 'delayed' : 'live'}
      </td>
    </tr>
  )
}

export function StockTable({ stocks }: { stocks: Instrument[] }) {
  const markets = ['IDX', 'US', 'INDEX'] as const
  const grouped = markets
    .map((m) => ({
      market: m,
      rows: stocks.filter((s) => (s.market ?? 'US') === m),
    }))
    .filter((g) => g.rows.length > 0)
  const ungrouped = stocks.filter(
    (s) => !markets.includes((s.market ?? 'US') as (typeof markets)[number]),
  )

  return (
    <div className="card">
      <h3>
        Stocks<span className="tag">FINANCIAL_SOURCE</span>
      </h3>
      {stocks.length === 0 ? (
        <div className="empty">
          Waiting for stock quotes… (IHSG/IDX arrives keyless; set
          FINNHUB_API_KEY for real-time US stocks)
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th className="num">Price</th>
              <th className="num">Change</th>
              <th className="num">Feed</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <Fragment key={g.market}>
                <tr>
                  <td colSpan={4} className="market-head">
                    {MARKET_LABELS[g.market]}
                  </td>
                </tr>
                {g.rows.map((s) => (
                  <Row key={s.symbol} s={s} />
                ))}
              </Fragment>
            ))}
            {ungrouped.map((s) => (
              <Row key={s.symbol} s={s} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
