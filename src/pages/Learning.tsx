import { useEffect, useMemo, useState } from 'react'
import { fetchPredictions } from '../lib/api'
import type { Prediction } from '../lib/types'
import { fmtPrice, timeAgo } from '../lib/format'

export function Learning() {
  const [items, setItems] = useState<Prediction[]>([])
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    const load = () =>
      fetchPredictions()
        .then((r) => {
          if (live) {
            setItems(r.items)
            setEnabled(r.enabled)
            setError(null)
          }
        })
        .catch((e) => live && setError(String(e?.message ?? e)))
    load()
    const t = setInterval(load, 30_000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [])

  const byMethod = useMemo(() => {
    const m = new Map<string, { total: number; correct: number }>()
    for (const p of items) {
      if (!p.resolved || p.correct === null) continue
      const e = m.get(p.method) ?? { total: 0, correct: 0 }
      e.total++
      if (p.correct) e.correct++
      m.set(p.method, e)
    }
    return [...m.entries()]
  }, [items])

  if (enabled === false) {
    return (
      <>
        <h1 className="page-title">Learning</h1>
        <p className="page-sub">Prediction history and what the market did next.</p>
        <div className="placeholder">
          <div className="milestone">Persistence disabled</div>
          <h2>Turn on the prediction journal</h2>
          <p>
            Set <code>DATABASE_URL</code> and restart the backend (e.g.{' '}
            <code>docker compose up -d postgres</code>, then uncomment it in{' '}
            <code>.env</code>). Predictions you save on the Statistics page are then
            journaled here and scored against realized prices when their horizon closes.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <h1 className="page-title">Learning</h1>
      <p className="page-sub">
        Every call saved in Statistics, scored against what the market actually did.
      </p>

      <div className="stat-grid">
        {byMethod.length === 0 ? (
          <div className="empty">
            No resolved predictions yet — each scores automatically when its horizon elapses.
          </div>
        ) : (
          byMethod.map(([method, s]) => (
            <div className="card" key={method}>
              <h3>
                {method}
                <span className="tag">{s.total} scored</span>
              </h3>
              <div className="stat-price">{Math.round((s.correct / s.total) * 100)}%</div>
              <div className="pair-note">
                {s.correct}/{s.total} correct
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>
          Prediction journal<span className="tag">{items.length}</span>
        </h3>
        {error && <div className="empty">{error}</div>}
        {items.length === 0 && !error ? (
          <div className="empty">No predictions yet — make one on the Statistics page.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Made</th>
                <th>Instrument</th>
                <th>Method</th>
                <th>Call</th>
                <th className="num">Price @</th>
                <th className="num">Price after</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{timeAgo(p.made_at)}</td>
                  <td style={{ fontWeight: 600 }}>{p.symbol}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.method}</td>
                  <td className={`verdict-${p.verdict}`} style={{ fontWeight: 600 }}>
                    {p.verdict}
                  </td>
                  <td className="num">{fmtPrice(p.price_at)}</td>
                  <td className="num">
                    {p.price_after !== null ? fmtPrice(p.price_after) : '—'}
                  </td>
                  <td>
                    {!p.resolved ? (
                      <span style={{ color: 'var(--text-muted)' }}>pending</span>
                    ) : p.correct ? (
                      <span className="verdict-bull">✓ correct</span>
                    ) : (
                      <span className="verdict-bear">✗ missed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
