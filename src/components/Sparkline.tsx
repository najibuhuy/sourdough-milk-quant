interface Props {
  data: number[]
  width?: number
  height?: number
  /** 'up' | 'down' | 'flat' — colors the line by direction */
  direction: 'up' | 'down' | 'flat'
}

const COLORS = { up: '#0ca30c', down: '#e66767', flat: '#898781' }

/** Minimal single-series sparkline (stat-tile companion — no axes, no grid). */
export function Sparkline({ data, width = 180, height = 36, direction }: Props) {
  if (data.length < 2) {
    return <div style={{ height }} className="skeleton" aria-hidden />
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const step = width / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = (i * step).toFixed(1)
      const y = (height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`price trend, ${direction}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={COLORS[direction]}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
