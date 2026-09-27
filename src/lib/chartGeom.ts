/** Shared horizontal geometry for the Statistics price + volume panes. Both
 *  SVGs use the same fixed viewBox width (stretched to the container with
 *  preserveAspectRatio="none") and the same right-hand gutter for the price
 *  axis, so bars line up and one crosshair spans both panes. */
export const CHART_W = 1000
export const CHART_PAD_RIGHT = 62
export const CHART_PLOT_W = CHART_W - CHART_PAD_RIGHT

/** Fraction across the plot area under `clientX` (outside 0..1 over the gutter). */
export function plotFrac(rect: DOMRect, clientX: number): number {
  if (rect.width <= 0) return -1
  return ((clientX - rect.left) / rect.width) * (CHART_W / CHART_PLOT_W)
}

/** Index (0..n-1) of the bar under `clientX`, or null when off the plot. */
export function idxAt(rect: DOMRect, clientX: number, n: number): number | null {
  if (n <= 0) return null
  const f = plotFrac(rect, clientX)
  if (f < 0 || f >= 1) return null
  return Math.min(n - 1, Math.floor(f * n))
}

/** CSS pixels per bar for `n` visible bars in an element of this width. */
export function pxPerBar(rect: DOMRect, n: number): number {
  return Math.max(1e-6, ((rect.width * CHART_PLOT_W) / CHART_W) / Math.max(n, 1))
}
