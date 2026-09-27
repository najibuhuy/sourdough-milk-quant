import { useCallback, useMemo, useState } from 'react'

/** A zoomable, pannable window `[start, end)` over a series of `total` bars. */
export interface ChartView {
  start: number
  end: number
  total: number
  /** true when the window is narrower than the full series */
  zoomed: boolean
  /** Scale the visible window by `factor` (>1 zooms out, <1 zooms in) while
   *  keeping the bar at `anchor` (0..1 across the visible width) in place. */
  zoomAt: (factor: number, anchor: number) => void
  zoomIn: () => void
  zoomOut: () => void
  /** Move the window so it starts at `start` (clamped to the series). */
  panTo: (start: number) => void
  /** Show the whole series again. */
  reset: () => void
}

interface Win {
  start: number
  end: number
  /** series length the window was computed for — a different `total` means
   *  new data was loaded, and the window is dropped automatically */
  total: number
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function useChartView(total: number, minBars = 8): ChartView {
  const [win, setWin] = useState<Win | null>(null)
  const active = win && win.total === total ? win : null
  const start = active ? active.start : 0
  const end = active ? active.end : total

  /** Apply `fn(start, end) -> [start, end]` to the current window, then clamp
   *  it to the series; a window covering everything collapses back to null. */
  const apply = useCallback(
    (fn: (s: number, e: number) => [number, number]) => {
      setWin((prev) => {
        const cur = prev && prev.total === total ? prev : { start: 0, end: total, total }
        const [s, e] = fn(cur.start, cur.end)
        const n = clamp(e - s, Math.min(minBars, total), total)
        if (n >= total) return null
        const ns = clamp(s, 0, total - n)
        if (prev && ns === cur.start && ns + n === cur.end) return prev
        return { start: ns, end: ns + n, total }
      })
    },
    [total, minBars],
  )

  const zoomAt = useCallback(
    (factor: number, anchor: number) =>
      apply((s, e) => {
        const n = e - s
        const nn = Math.round(n * factor)
        const at = s + anchor * n // absolute bar position under the cursor
        const ns = Math.round(at - anchor * nn)
        return [ns, ns + nn]
      }),
    [apply],
  )
  const zoomIn = useCallback(() => zoomAt(1 / 1.5, 0.5), [zoomAt])
  const zoomOut = useCallback(() => zoomAt(1.5, 0.5), [zoomAt])
  const panTo = useCallback((s: number) => apply((cs, ce) => [s, s + (ce - cs)]), [apply])
  const reset = useCallback(() => setWin(null), [])

  return useMemo(
    () => ({
      start,
      end,
      total,
      zoomed: end - start < total,
      zoomAt,
      zoomIn,
      zoomOut,
      panTo,
      reset,
    }),
    [start, end, total, zoomAt, zoomIn, zoomOut, panTo, reset],
  )
}
