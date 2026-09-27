import { useCallback, useEffect, useState } from 'react'
import { fetchPortfolio, fetchQuote, postDeposit, postOrder } from '../lib/api'
import type { Portfolio } from '../lib/types'
import { fmtPrice, fmtPct, timeAgo } from '../lib/format'
import { SymbolSearch } from '../components/SymbolSearch'

type TGroup = 'us' | 'idx' | 'commodity' | 'crypto'
const GROUPS: { key: TGroup; label: string }[] = [
  { key: 'us', label: 'US · S&P 500' },
  { key: 'idx', label: 'IHSG · IDX' },
  { key: 'commodity', label: 'Commodities' },
  { key: 'crypto', label: 'Crypto' },
]

const signed = (v: number) => `${v >= 0 ? '+' : ''}${fmtPrice(v)}`

/** Paper trading — a LOCAL SIMULATED account. Deposit virtual cash, place
 *  market orders filled at the live quote, track positions and P&L. Nothing
 *  here touches a real broker. */
export function Trade() {
  const [pf, setPf] = useState<Portfolio | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(() => {
    fetchPortfolio()
      .then((p) => {
        setPf(p)
        setErr(null)
      })
      .catch((e) => setErr(String(e?.message ?? e)))
  }, [])
  useEffect(() => {
    load()
    const t = setInterval(load, 20_000)
    return () => clearInterval(t)
  }, [load])

  // ---- deposit / withdraw ----
  const [depAmt, setDepAmt] = useState('')
  const deposit = async (sign: 1 | -1) => {
    const a = Number(depAmt)
    if (!Number.isFinite(a) || a <= 0) return
    setErr(null)
    try {
      await postDeposit(sign * a, sign > 0 ? 'deposit' : 'withdraw')
      setDepAmt('')
      setMsg(`${sign > 0 ? 'Deposited' : 'Withdrew'} ${fmtPrice(a)}`)
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  // ---- order ----
  const [group, setGroup] = useState<TGroup>('us')
  const [symbol, setSymbol] = useState('')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [qty, setQty] = useState('')
  const [est, setEst] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  // live price estimate for the typed symbol
  useEffect(() => {
    const s = symbol.trim()
    if (!s) {
      setEst(null)
      return
    }
    let live = true
    const t = setTimeout(
      () =>
        fetchQuote(s, group)
          .then((q) => live && setEst(q.price))
          .catch(() => live && setEst(null)),
      400,
    )
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [symbol, group])

  const qtyNum = Number(qty)
  const canSubmit = !busy && symbol.trim().length > 0 && Number.isFinite(qtyNum) && qtyNum > 0

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setErr(null)
    try {
      const r = await postOrder({ symbol: symbol.trim().toUpperCase(), group, side, qty: qtyNum })
      setMsg(
        `${side === 'buy' ? 'Bought' : 'Sold'} ${r.qty} ${r.symbol} @ ${fmtPrice(r.price)} — total ${fmtPrice(r.total)}`,
      )
      setQty('')
      load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const prefillSell = (sym: string, grp: string, held: number) => {
    setGroup((GROUPS.some((g) => g.key === grp) ? grp : 'us') as TGroup)
    setSymbol(sym)
    setSide('sell')
    setQty(String(held))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const unrealized = pf?.positions.reduce((s, p) => s + (p.pnl ?? 0), 0) ?? 0

  if (pf && !pf.enabled) {
    return (
      <>
        <h1 className="page-title">Trade</h1>
        <p className="page-sub">Paper trading — a local simulated account.</p>
        <div className="placeholder">
          <div className="milestone">Persistence disabled</div>
          <h2>Turn on the trading ledger</h2>
          <p>
            Set <code>DATABASE_URL</code> and restart the backend (e.g.{' '}
            <code>docker compose up -d postgres</code>). Cash, orders and positions are
            stored in Postgres.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">Trade</h1>
      <p className="page-sub">
        Paper trading — deposit virtual cash and place market orders filled at the live
        quote. Nothing here touches a real broker.
      </p>
      <div className="paper-banner">Simulated · no real money · local ledger</div>

      {err && (
        <div className="empty" style={{ color: 'var(--down)' }}>
          {err}
        </div>
      )}
      {msg && !err && <div className="pair-note" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="stat-grid">
        <div className="card">
          <h3>Cash</h3>
          <div className="stat-price">{pf ? fmtPrice(pf.cash) : '—'}</div>
          <div className="pair-note">available to buy</div>
        </div>
        <div className="card">
          <h3>Equity</h3>
          <div className="stat-price">{pf ? fmtPrice(pf.equity) : '—'}</div>
          <div className="pair-note">cash + positions at market</div>
        </div>
        <div className="card">
          <h3>Unrealized P&amp;L</h3>
          <div className={`stat-price ${unrealized >= 0 ? 'delta-up' : 'delta-down'}`}>
            {pf ? signed(unrealized) : '—'}
          </div>
          <div className="pair-note">open positions vs avg cost</div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 18 }}>
        <div className="card">
          <h3>
            Deposit / Withdraw<span className="tag">CASH</span>
          </h3>
          <div className="trade-form">
            <input
              className="trade-input"
              type="number"
              min="0"
              step="any"
              placeholder="Amount"
              value={depAmt}
              onChange={(e) => setDepAmt(e.target.value)}
            />
            <button className="run-btn" onClick={() => deposit(1)}>
              Deposit
            </button>
            <button className="run-btn ghost" onClick={() => deposit(-1)}>
              Withdraw
            </button>
          </div>
        </div>

        <div className="card">
          <h3>
            Place order<span className="tag">MARKET</span>
          </h3>
          <div className="trade-form col">
            <div className="trade-row">
              <select
                className="trade-input"
                value={group}
                onChange={(e) => setGroup(e.target.value as TGroup)}
              >
                {GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
              <div className="side-toggle">
                <button
                  className={`side-btn ${side === 'buy' ? 'on-buy' : ''}`}
                  onClick={() => setSide('buy')}
                >
                  Buy
                </button>
                <button
                  className={`side-btn ${side === 'sell' ? 'on-sell' : ''}`}
                  onClick={() => setSide('sell')}
                >
                  Sell
                </button>
              </div>
            </div>
            {group !== 'crypto' && (
              <SymbolSearch
                group={group}
                placeholder="Search symbol…"
                onPick={(r) => setSymbol(r.symbol)}
              />
            )}
            <div className="trade-row">
              <input
                className="trade-input"
                placeholder={group === 'crypto' ? 'e.g. BTCUSDT' : 'Symbol'}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
              <input
                className="trade-input"
                type="number"
                min="0"
                step="any"
                placeholder="Qty"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="pair-note">
              {est !== null
                ? `≈ ${fmtPrice(est)} × ${qty || '0'} = ${fmtPrice(est * (qtyNum || 0))}`
                : symbol.trim()
                  ? 'fetching live price…'
                  : 'pick a symbol to see the live price'}
            </div>
            <button
              className={`run-btn ${side === 'sell' ? 'sell' : ''}`}
              disabled={!canSubmit}
              onClick={submit}
            >
              {busy ? 'Filling…' : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol.trim().toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>
          Positions<span className="tag">{pf?.positions.length ?? 0}</span>
        </h3>
        {!pf || pf.positions.length === 0 ? (
          <div className="empty">No open positions — deposit cash, then buy something.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="num">Qty</th>
                <th className="num">Avg cost</th>
                <th className="num">Price</th>
                <th className="num">Value</th>
                <th className="num">P&amp;L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pf.positions.map((p) => (
                <tr key={`${p.group}-${p.symbol}`}>
                  <td style={{ fontWeight: 600 }}>
                    {p.symbol}
                    <div className="row-name">{p.group}</div>
                  </td>
                  <td className="num">{p.qty}</td>
                  <td className="num">{fmtPrice(p.avg_cost)}</td>
                  <td className="num">{p.price !== null ? fmtPrice(p.price) : '—'}</td>
                  <td className="num">{p.market_value !== null ? fmtPrice(p.market_value) : '—'}</td>
                  <td className={`num ${(p.pnl ?? 0) >= 0 ? 'delta-up' : 'delta-down'}`}>
                    {p.pnl !== null ? `${signed(p.pnl)} (${fmtPct(p.pnl_pct ?? 0)})` : '—'}
                  </td>
                  <td className="num">
                    <button
                      className="pin-x"
                      title="sell all"
                      onClick={() => prefillSell(p.symbol, p.group, p.qty)}
                    >
                      sell
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>
          Activity<span className="tag">{pf?.ledger.length ?? 0}</span>
        </h3>
        {!pf || pf.ledger.length === 0 ? (
          <div className="empty">No activity yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Symbol</th>
                <th className="num">Qty</th>
                <th className="num">Price</th>
                <th className="num">Cash Δ</th>
              </tr>
            </thead>
            <tbody>
              {pf.ledger.map((l) => (
                <tr key={l.id}>
                  <td>{timeAgo(l.ts)}</td>
                  <td
                    style={{ fontWeight: 600 }}
                    className={
                      l.kind === 'buy' ? 'delta-down' : l.kind === 'sell' || l.kind === 'deposit' ? 'delta-up' : ''
                    }
                  >
                    {l.kind}
                  </td>
                  <td>{l.symbol ?? '—'}</td>
                  <td className="num">{l.qty ?? '—'}</td>
                  <td className="num">{l.price !== null ? fmtPrice(l.price) : '—'}</td>
                  <td className={`num ${l.amount >= 0 ? 'delta-up' : 'delta-down'}`}>{signed(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
