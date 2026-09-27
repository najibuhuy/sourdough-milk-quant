import type { Candle } from '../lib/types'
import type { ChartView } from '../lib/useChartView'
import { CHART_PLOT_W, CHART_W, idxAt } from '../lib/chartGeom'

interface Props {
  /** full series; draws `view.start..view.end` so it lines up with PriceChart */
  candles: Candle[]
  view: ChartView
  hoverIdx: number | null
  onHover: (idx: number | null) => void
  height?: number
}

/** Per-bar volume, coloured by candle direction (up-day = buying pressure,
 *  down-day = selling pressure). A standard proxy for order-flow when true
 *  buy/sell tape isn't available from free data. Shares the price chart's
 *  geometry and hover state so the crosshair highlights the same bar here. */
export function VolumeBars({ candles, view, hoverIdx, onHover, height = 72 }: Props) {
  const { start, end } = view
  const visible = candles.slice(start, end)
  const n = visible.length
  const vols = visible.map((c) => c.volume ?? 0)
  const max = Math.max(...vols, 1)
  const step = CHART_PLOT_W / Math.max(n, 1)
  const bw = Math.max(1, step * 0.62)
  const hv = hoverIdx !== null && hoverIdx >= start && hoverIdx < end ? hoverIdx - start : null

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${CHART_W} ${height}`}
      preserveAspectRatio="none"
      className="vol-chart"
      role="img"
      aria-label="volume by candle direction"
      onPointerMove={(e) => {
        const i = idxAt(e.currentTarget.getBoundingClientRect(), e.clientX, n)
        onHover(i === null ? null : start + i)
      }}
      onPointerLeave={() => onHover(null)}
    >
      {hv !== null && (
        <rect x={hv * step} y={0} width={step} height={height} fill="var(--text-muted)" opacity="0.12" />
      )}
      {visible.map((c, i) => {
        const v = c.volume ?? 0
        const h = (v / max) * (height - 4)
        const up = c.close >= c.open
        const x = i * step + step / 2
        return (
          <rect
            key={c.ts}
            x={x - bw / 2}
            y={height - h}
            width={bw}
            height={h}
            fill={up ? 'var(--up)' : 'var(--down)'}
            opacity={hv === null || hv === i ? 0.85 : 0.5}
          />
        )
      })}
    </svg>
  )
}
