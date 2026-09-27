import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { Candle } from '../lib/types'
import type { Overlay } from '../lib/indicators'
import type { ChartView } from '../lib/useChartView'
import { CHART_PLOT_W, CHART_W, idxAt, plotFrac, pxPerBar } from '../lib/chartGeom'
import { fmtCompact, fmtPct, fmtPrice } from '../lib/format'
import './chart.css'

interface Props {
  /** full series; the chart draws `view.start..view.end` */
  candles: Candle[]
  /** indicator overlays aligned to the full series */
  overlays?: Overlay[]
  height?: number
  view: ChartView
  /** hovered bar as an index into the full series (shared with VolumeBars) */
  hoverIdx: number | null
  onHover: (idx: number | null) => void
}

const DAY_MS = 86_400_000

/** Pick date formats from the visible bars: intraday bars show clock time,
 *  multi-year spans show month/year, everything else day/month. */
function timeFormats(visible: Candle[]) {
  const n = visible.length
  const gaps: number[] = []
  for (let i = 1; i < n; i++) gaps.push(visible[i].ts - visible[i - 1].ts)
  gaps.sort((a, b) => a - b)
  const gap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : DAY_MS
  const span = n ? visible[n - 1].ts - visible[0].ts : 0
  const intraday = gap < DAY_MS * 0.8

  const axis: Intl.DateTimeFormatOptions = intraday
    ? span > DAY_MS
      ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' }
    : span > 400 * DAY_MS
      ? { month: 'short', year: '2-digit' }
      : { day: '2-digit', month: 'short' }
  const pill: Intl.DateTimeFormatOptions = intraday
    ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' }
  const full: Intl.DateTimeFormatOptions = intraday
    ? { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }

  const f = (o: Intl.DateTimeFormatOptions) => (ts: number) => new Date(ts).toLocaleString('en-GB', o)
  return { axis: f(axis), pill: f(pill), full: f(full) }
}

/** Candlestick chart with price grid, right-hand price axis, date axis, a
 *  last-price marker and indicator overlays. Hovering (no click) shows a
 *  crosshair with the bar's time and the price under the cursor, plus an OHLC
 *  readout above the plot. Mouse wheel zooms the time axis around the cursor,
 *  horizontal scroll or dragging pans, double-click resets. Drawn in a fixed
 *  viewBox and stretched to width; strokes are non-scaling and labels are HTML
 *  so they never distort. */
export function PriceChart({ candles, overlays = [], height = 340, view, hoverIdx, onHover }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; start: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  /** cursor y within the plot (px == viewBox units), for the horizontal crosshair */
  const [cursorY, setCursorY] = useState<number | null>(null)

  const { start, end } = view
  const visible = candles.slice(start, end)
  const n = visible.length
  const ready = n >= 2

  const W = CHART_W
  const padTop = 8
  const padBot = 22
  const plotH = height - padTop - padBot
  const plotW = CHART_PLOT_W
  const step = plotW / Math.max(n, 1)

  // Wheel must be a native non-passive listener: React registers `wheel` as
  // passive, so preventDefault (to stop the page scrolling) would be ignored.
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {})
  wheelRef.current = (e) => {
    const el = wrapRef.current
    if (!el || n === 0) return
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // horizontal scroll (trackpad / shift-wheel) pans
      const bars = Math.round(e.deltaX / pxPerBar(rect, n))
      if (bars !== 0) view.panTo(start + bars)
      return
    }
    const anchor = Math.max(0, Math.min(1, plotFrac(rect, e.clientX)))
    view.zoomAt(e.deltaY > 0 ? 1.25 : 1 / 1.25, anchor)
  }
  useEffect(() => {
    const el = wrapRef.current
    if (!el || !ready) return
    const h = (e: WheelEvent) => wheelRef.current(e)
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [ready])

  if (!ready) {
    return <div className="empty">Not enough history to chart.</div>
  }

  const vals: number[] = []
  for (const c of visible) vals.push(c.high, c.low)
  for (const o of overlays)
    for (let i = start; i < end; i++) {
      const v = o.values[i]
      if (Number.isFinite(v)) vals.push(v)
    }
  const rawMin = Math.min(...vals)
  const rawMax = Math.max(...vals)
  const pad = (rawMax - rawMin || 1) * 0.04
  const lo = rawMin - pad
  const hi = rawMax + pad
  const range = hi - lo || 1

  const bw = Math.max(1, step * 0.62)
  const cx = (i: number) => i * step + step / 2
  const y = (v: number) => padTop + (1 - (v - lo) / range) * plotH
  const priceAt = (yy: number) => lo + (1 - (yy - padTop) / plotH) * range

  const toPoints = (arr: number[]) =>
    arr
      .slice(start, end)
      .map((v, i) => (Number.isFinite(v) ? `${cx(i).toFixed(1)},${y(v).toFixed(1)}` : ''))
      .filter(Boolean)
      .join(' ')

  const lastClose = visible[n - 1].close
  const lastY = y(lastClose)
  const lastUp = lastClose >= visible[0].close

  const levels = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * range)
  const nLabels = Math.min(6, n)
  const dateIdx = Array.from({ length: nLabels }, (_, k) =>
    Math.round((k / (nLabels - 1)) * (n - 1)),
  )
  const fmt = timeFormats(visible)

  // hovered bar (index within the visible window) and the readout bar
  const hv = hoverIdx !== null && hoverIdx >= start && hoverIdx < end ? hoverIdx - start : null
  const infoAbs = hv !== null ? start + hv : end - 1
  const info = candles[infoAbs]
  const prev = infoAbs > 0 ? candles[infoAbs - 1] : undefined
  const chg = prev ? info.close - prev.close : info.close - info.open
  const chgPct = prev ? (chg / prev.close) * 100 : (chg / info.open) * 100

  // ---- pointer interaction: hover crosshair + drag-to-pan ----
  const hoverAt = (clientX: number, clientY: number, rect: DOMRect) => {
    const i = idxAt(rect, clientX, n)
    onHover(i === null ? null : start + i)
    const yy = clientY - rect.top
    setCursorY(yy >= padTop && yy <= padTop + plotH ? yy : null)
  }
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const drag = dragRef.current
    if (drag) {
      const bars = Math.round((drag.x - e.clientX) / pxPerBar(rect, n))
      view.panTo(drag.start + bars)
    }
    hoverAt(e.clientX, e.clientY, rect)
  }
  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !view.zoomed) return // nothing to pan when everything is visible
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, start }
    setDragging(true)
  }
  const endDrag = (e: RPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    const rect = e.currentTarget.getBoundingClientRect()
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
    if (!inside) {
      onHover(null)
      setCursorY(null)
    }
  }
  const onPointerLeave = () => {
    if (dragRef.current) return // still captured while dragging
    onHover(null)
    setCursorY(null)
  }

  return (
    <div className="chart-block">
      <div className="chart-info" aria-label="bar readout">
        <span className="ci-date">{fmt.full(info.ts)}</span>
        <span>
          O <b>{fmtPrice(info.open)}</b>
        </span>
        <span>
          H <b>{fmtPrice(info.high)}</b>
        </span>
        <span>
          L <b>{fmtPrice(info.low)}</b>
        </span>
        <span>
          C <b>{fmtPrice(info.close)}</b>
        </span>
        <span className={chg >= 0 ? 'delta-up' : 'delta-down'}>
          {chg >= 0 ? '+' : '−'}
          {fmtPrice(Math.abs(chg))} ({fmtPct(chgPct)})
        </span>
        {info.volume !== null && (
          <span>
            Vol <b>{fmtCompact(info.volume)}</b>
          </span>
        )}
      </div>

      <div
        ref={wrapRef}
        className={`chart-wrap pc-wrap${dragging ? ' dragging' : ''}`}
        style={{ height }}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onPointerLeave={onPointerLeave}
        onDoubleClick={view.reset}
      >
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          className="price-chart"
          role="img"
          aria-label="candlestick price chart"
        >
          {levels.map((lv, i) => (
            <line
              key={`g${i}`}
              x1={0}
              x2={plotW}
              y1={y(lv)}
              y2={y(lv)}
              stroke="var(--grid)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {hv !== null && (
            <rect
              x={hv * step}
              y={padTop}
              width={step}
              height={plotH}
              fill="var(--text-muted)"
              opacity="0.08"
            />
          )}
          {visible.map((c, i) => {
            const up = c.close >= c.open
            const color = up ? 'var(--up)' : 'var(--down)'
            const yO = y(c.open)
            const yC = y(c.close)
            const x = cx(i)
            return (
              <g key={c.ts}>
                <line
                  x1={x}
                  x2={x}
                  y1={y(c.high)}
                  y2={y(c.low)}
                  stroke={color}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={x - bw / 2}
                  y={Math.min(yO, yC)}
                  width={bw}
                  height={Math.max(1, Math.abs(yC - yO))}
                  fill={color}
                />
              </g>
            )
          })}
          {overlays.map((o) => (
            <polyline
              key={o.label}
              points={toPoints(o.values)}
              fill="none"
              stroke={o.color}
              strokeWidth="1.3"
              strokeDasharray={o.label.startsWith('BB') ? '4 3' : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1={0}
            x2={plotW}
            y1={lastY}
            y2={lastY}
            stroke={lastUp ? 'var(--up)' : 'var(--down)'}
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.75"
            vectorEffect="non-scaling-stroke"
          />
          {/* crosshair */}
          {hv !== null && (
            <line
              x1={cx(hv)}
              x2={cx(hv)}
              y1={padTop}
              y2={padTop + plotH}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {cursorY !== null && (
            <line
              x1={0}
              x2={plotW}
              y1={cursorY}
              y2={cursorY}
              stroke="var(--text-muted)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {levels.map((lv, i) => (
          <span key={`y${i}`} className="chart-ylabel" style={{ top: `${y(lv)}px` }}>
            {fmtPrice(lv)}
          </span>
        ))}
        <span
          className={`chart-last ${lastUp ? 'up' : 'down'}`}
          style={{ top: `${lastY}px` }}
        >
          {fmtPrice(lastClose)}
        </span>
        {dateIdx.map((idx, k) => (
          <span key={`x${k}`} className="chart-xlabel" style={{ left: `${(cx(idx) / W) * 100}%` }}>
            {fmt.axis(visible[idx].ts)}
          </span>
        ))}

        {cursorY !== null && (
          <span className="chart-hlabel" style={{ top: `${cursorY}px` }}>
            {fmtPrice(priceAt(cursorY))}
          </span>
        )}
        {hv !== null && (
          <span className="chart-hdate" style={{ left: `${(cx(hv) / W) * 100}%` }}>
            {fmt.pill(visible[hv].ts)}
          </span>
        )}
      </div>
    </div>
  )
}
