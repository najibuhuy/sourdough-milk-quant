import type { Candle } from '../lib/types'
import type { Overlay } from '../lib/indicators'
import { fmtPrice } from '../lib/format'

interface Props {
  candles: Candle[]
  overlays?: Overlay[]
  height?: number
}

/** Candlestick chart with price grid, right-hand price axis, date axis, a
 *  last-price marker, and indicator overlays. Drawn in a fixed viewBox and
 *  stretched to width; strokes are non-scaling and axis labels are HTML so they
 *  never distort. */
export function PriceChart({ candles, overlays = [], height = 340 }: Props) {
  if (candles.length < 2) {
    return <div className="empty">Not enough history to chart.</div>
  }

  const W = 1000
  const padTop = 8
  const padBot = 22
  const padRight = 62
  const plotH = height - padTop - padBot
  const plotW = W - padRight
  const n = candles.length

  const vals: number[] = []
  for (const c of candles) vals.push(c.high, c.low)
  for (const o of overlays) for (const v of o.values) if (Number.isFinite(v)) vals.push(v)
  const rawMin = Math.min(...vals)
  const rawMax = Math.max(...vals)
  const pad = (rawMax - rawMin || 1) * 0.04
  const lo = rawMin - pad
  const hi = rawMax + pad
  const range = hi - lo || 1

  const step = plotW / n
  const bw = Math.max(1, step * 0.62)
  const cx = (i: number) => i * step + step / 2
  const y = (v: number) => padTop + (1 - (v - lo) / range) * plotH

  const toPoints = (arr: number[]) =>
    arr
      .map((v, i) => (Number.isFinite(v) ? `${cx(i).toFixed(1)},${y(v).toFixed(1)}` : ''))
      .filter(Boolean)
      .join(' ')

  const lastClose = candles[n - 1].close
  const lastY = y(lastClose)
  const lastUp = lastClose >= candles[0].close

  const levels = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + f * range)
  const nLabels = Math.min(6, n)
  const dateIdx = Array.from({ length: nLabels }, (_, k) =>
    Math.round((k / (nLabels - 1)) * (n - 1)),
  )
  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

  return (
    <div className="chart-wrap" style={{ height }}>
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
        {candles.map((c, i) => {
          const up = c.close >= c.open
          const color = up ? 'var(--up)' : 'var(--down)'
          const yO = y(c.open)
          const yC = y(c.close)
          const x = cx(i)
          return (
            <g key={i}>
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
          {fmtDate(candles[idx].ts)}
        </span>
      ))}
    </div>
  )
}
