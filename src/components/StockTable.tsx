import type { Instrument } from '../lib/types'
import { fmtPrice, fmtPct } from '../lib/format'

export function StockTable({ stocks }: { stocks: Instrument[] }) {
  return (
    <div className="card">
      <h3>
        Stocks<span className="tag">FINANCIAL_SOURCE</span>
      </h3>
      {stocks.length === 0 ? (
        <div className="empty">
          Waiting for stock quotes… (set FINNHUB_API_KEY for real-time; keyless
          mode uses delayed quotes)
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
            {stocks.map((s) => {
              const dir =
                s.changePct > 0.005 ? 'up' : s.changePct < -0.005 ? 'down' : 'flat'
              const cls =
                dir === 'up' ? 'delta-up' : dir === 'down' ? 'delta-down' : 'delta-flat'
              return (
                <tr key={s.symbol}>
                  <td style={{ fontWeight: 600 }}>{s.symbol}</td>
                  <td className="num">{fmtPrice(s.price)}</td>
                  <td className={`num ${cls}`}>
                    {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'}{' '}
                    {fmtPct(s.changePct)}
                  </td>
                  <td className="num" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {s.delayed ? 'delayed' : 'live'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
