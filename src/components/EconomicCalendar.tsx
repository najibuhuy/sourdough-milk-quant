import { useEffect, useState } from 'react'
import { fetchCalendar } from '../lib/api'
import type { EconEvent } from '../lib/types'

const IMPACT_CLASS: Record<string, string> = {
  High: 'imp-high',
  Medium: 'imp-med',
  Low: 'imp-low',
}

const dayLabel = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
const timeLabel = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

/** Upcoming high/medium-impact macro events (Fed decisions, CPI, jobs…). */
export function EconomicCalendar() {
  const [events, setEvents] = useState<EconEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let live = true
    const load = () =>
      fetchCalendar()
        .then((r) => {
          if (live) {
            setEvents(r.events)
            setError(null)
            setLoaded(true)
          }
        })
        .catch((e) => {
          if (live) {
            setError(String(e?.message ?? e))
            setLoaded(true)
          }
        })
    load()
    const t = setInterval(load, 600_000) // refresh every 10 min
    return () => {
      live = false
      clearInterval(t)
    }
  }, [])

  // group consecutive events by day
  const groups: { day: string; items: EconEvent[] }[] = []
  for (const e of events) {
    const d = dayLabel(e.ts)
    const g = groups[groups.length - 1]
    if (g && g.day === d) g.items.push(e)
    else groups.push({ day: d, items: [e] })
  }

  return (
    <div className="card">
      <h3>
        Economic Calendar<span className="tag">MACRO_SOURCE</span>
      </h3>
      {!loaded ? (
        <div>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: `${80 - i * 8}%`, marginBottom: 8 }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="empty">Calendar unavailable: {error}</div>
      ) : events.length === 0 ? (
        <div className="empty">No upcoming high-impact events this week.</div>
      ) : (
        <div className="cal-list">
          {groups.map((g) => (
            <div key={g.day}>
              <div className="cal-day">{g.day}</div>
              {g.items.map((e, i) => (
                <div className="cal-row" key={`${g.day}-${i}`}>
                  <span
                    className={`cal-impact ${IMPACT_CLASS[e.impact] ?? ''}`}
                    title={`${e.impact} impact`}
                  />
                  <span className="cal-time">{timeLabel(e.ts)}</span>
                  <span className="cal-country">{e.country}</span>
                  <span className="cal-title" title={e.title}>
                    {e.title}
                  </span>
                  {(e.forecast || e.previous) && (
                    <span className="cal-nums">
                      {e.forecast ? `f/c ${e.forecast}` : ''}
                      {e.forecast && e.previous ? ' · ' : ''}
                      {e.previous ? `prev ${e.previous}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
