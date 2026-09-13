import type { Candle } from '../lib/types'

/** Per-bar volume, coloured by candle direction (up-day = buying pressure,
 *  down-day = selling pressure). A standard proxy for order-flow when true
 *  buy/sell tape isn't available from free data. */
export function VolumeBars({ candles, height = 72 }: { candles: Candle[]; height?: number }) {
  const vols = candles.map((c) => c.volume ?? 0)
  const max = Math.max(...vols, 1)
  const W = 960
  const pad = 10
  const n = candles.length
  const step = (W - pad * 2) / Math.max(n, 1)
  const bw = Math.max(1, step * 0.62)

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      className="vol-chart"
      role="img"
      aria-label="volume by candle direction"
    >
      {candles.map((c, i) => {
        const v = c.volume ?? 0
        const h = (v / max) * (height - 4)
        const up = c.close >= c.open
        const x = pad + i * step + step / 2
        return (
          <rect
            key={i}
            x={x - bw / 2}
            y={height - h}
            width={bw}
            height={h}
            fill={up ? 'var(--up)' : 'var(--down)'}
            opacity="0.8"
          />
        )
      })}
    </svg>
  )
}
