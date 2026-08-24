import type { Candle } from './types'

/** Technical-indicator engine for the Statistics page. All functions return
 *  arrays aligned to the input (NaN where the window isn't full yet), so they
 *  can be overlaid directly on the price chart. */

export function sma(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    if (i >= period - 1) out[i] = sum / period
  }
  return out
}

export function ema(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  const k = 2 / (period + 1)
  let prev = NaN
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue
    if (Number.isNaN(prev)) {
      // seed with the SMA of the first `period` values
      let s = 0
      for (let j = i - period + 1; j <= i; j++) s += values[j]
      prev = s / period
    } else {
      prev = values[i] * k + prev * (1 - k)
    }
    out[i] = prev
  }
  return out
}

export function rsi(values: number[], period = 14): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i < values.length; i++) {
    const change = values[i] - values[i - 1]
    const gain = Math.max(0, change)
    const loss = Math.max(0, -change)
    if (i <= period) {
      avgGain += gain
      avgLoss += loss
      if (i === period) {
        avgGain /= period
        avgLoss /= period
        out[i] = 100 - 100 / (1 + avgGain / (avgLoss || 1e-9))
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      out[i] = 100 - 100 / (1 + avgGain / (avgLoss || 1e-9))
    }
  }
  return out
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): { macd: number[]; signal: number[]; hist: number[] } {
  const emaFast = ema(values, fast)
  const emaSlow = ema(values, slow)
  const macdLine = values.map((_, i) =>
    Number.isNaN(emaFast[i]) || Number.isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i],
  )
  // signal = EMA of the (defined part of the) macd line
  const defined = macdLine.filter((v) => !Number.isNaN(v))
  const sigDefined = ema(defined, signal)
  const signalLine = new Array<number>(values.length).fill(NaN)
  let k = 0
  for (let i = 0; i < values.length; i++) {
    if (!Number.isNaN(macdLine[i])) {
      signalLine[i] = sigDefined[k]
      k++
    }
  }
  const hist = values.map((_, i) =>
    Number.isNaN(macdLine[i]) || Number.isNaN(signalLine[i])
      ? NaN
      : macdLine[i] - signalLine[i],
  )
  return { macd: macdLine, signal: signalLine, hist }
}

export function bollinger(
  values: number[],
  period = 20,
  mult = 2,
): { mid: number[]; upper: number[]; lower: number[] } {
  const mid = sma(values, period)
  const upper = new Array<number>(values.length).fill(NaN)
  const lower = new Array<number>(values.length).fill(NaN)
  for (let i = period - 1; i < values.length; i++) {
    let variance = 0
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - mid[i]) ** 2
    const sd = Math.sqrt(variance / period)
    upper[i] = mid[i] + mult * sd
    lower[i] = mid[i] - mult * sd
  }
  return { mid, upper, lower }
}

/** N-period rate of change, as a percentage. */
export function momentum(values: number[], period = 10): number[] {
  const out = new Array<number>(values.length).fill(NaN)
  for (let i = period; i < values.length; i++) {
    out[i] = ((values[i] - values[i - period]) / values[i - period]) * 100
  }
  return out
}

// ---- method registry: each maps candles -> a verdict + chart overlays ----

export type Verdict = 'bull' | 'bear' | 'neutral'

export interface Overlay {
  label: string
  values: number[]
  color: string
}

export interface MethodResult {
  verdict: Verdict
  confidence: number // 0..1
  detail: string
  overlays: Overlay[]
}

export interface MethodDef {
  key: string
  label: string
  run: (candles: Candle[]) => MethodResult
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const last = (a: number[]) => {
  for (let i = a.length - 1; i >= 0; i--) if (!Number.isNaN(a[i])) return a[i]
  return NaN
}

export const METHODS: MethodDef[] = [
  {
    key: 'sma_cross',
    label: 'SMA crossover (20 / 50)',
    run: (candles) => {
      const closes = candles.map((c) => c.close)
      const fast = sma(closes, 20)
      const slow = sma(closes, 50)
      const f = last(fast)
      const s = last(slow)
      const gap = (f - s) / s
      const verdict: Verdict = f > s ? 'bull' : f < s ? 'bear' : 'neutral'
      return {
        verdict,
        confidence: clamp01(Math.abs(gap) * 25),
        detail: `SMA20 ${f.toFixed(2)} ${f >= s ? '≥' : '<'} SMA50 ${s.toFixed(2)} (${(gap * 100).toFixed(2)}% gap)`,
        overlays: [
          { label: 'SMA20', values: fast, color: '#3987e5' },
          { label: 'SMA50', values: slow, color: '#fab219' },
        ],
      }
    },
  },
  {
    key: 'ema_cross',
    label: 'EMA crossover (12 / 26)',
    run: (candles) => {
      const closes = candles.map((c) => c.close)
      const fast = ema(closes, 12)
      const slow = ema(closes, 26)
      const f = last(fast)
      const s = last(slow)
      const gap = (f - s) / s
      const verdict: Verdict = f > s ? 'bull' : f < s ? 'bear' : 'neutral'
      return {
        verdict,
        confidence: clamp01(Math.abs(gap) * 30),
        detail: `EMA12 ${f.toFixed(2)} ${f >= s ? '≥' : '<'} EMA26 ${s.toFixed(2)} — ${f >= s ? 'golden' : 'death'} cross bias`,
        overlays: [
          { label: 'EMA12', values: fast, color: '#3987e5' },
          { label: 'EMA26', values: slow, color: '#fab219' },
        ],
      }
    },
  },
  {
    key: 'rsi',
    label: 'RSI (14)',
    run: (candles) => {
      const closes = candles.map((c) => c.close)
      const r = last(rsi(closes, 14))
      const verdict: Verdict = r < 30 ? 'bull' : r > 70 ? 'bear' : 'neutral'
      const conf = r < 30 ? (30 - r) / 30 : r > 70 ? (r - 70) / 30 : 1 - Math.abs(r - 50) / 20
      return {
        verdict,
        confidence: clamp01(conf),
        detail: `RSI ${r.toFixed(1)} — ${r < 30 ? 'oversold (rebound bias)' : r > 70 ? 'overbought (pullback bias)' : 'neutral zone'}`,
        overlays: [],
      }
    },
  },
  {
    key: 'macd',
    label: 'MACD (12 / 26 / 9)',
    run: (candles) => {
      const closes = candles.map((c) => c.close)
      const m = macd(closes)
      const h = last(m.hist)
      const verdict: Verdict = h > 0 ? 'bull' : h < 0 ? 'bear' : 'neutral'
      const ref = Math.abs(last(closes)) || 1
      return {
        verdict,
        confidence: clamp01((Math.abs(h) / ref) * 200),
        detail: `MACD histogram ${h.toFixed(3)} — momentum ${h >= 0 ? 'positive' : 'negative'}`,
        overlays: [],
      }
    },
  },
  {
    key: 'bollinger',
    label: 'Bollinger Bands (20, 2σ)',
    run: (candles) => {
      const closes = candles.map((c) => c.close)
      const b = bollinger(closes, 20, 2)
      const price = last(closes)
      const up = last(b.upper)
      const lo = last(b.lower)
      const pctB = (price - lo) / (up - lo || 1e-9)
      const verdict: Verdict = pctB < 0.1 ? 'bull' : pctB > 0.9 ? 'bear' : 'neutral'
      const conf = pctB < 0.1 ? (0.1 - pctB) * 5 : pctB > 0.9 ? (pctB - 0.9) * 5 : 1 - Math.abs(pctB - 0.5) * 1.6
      return {
        verdict,
        confidence: clamp01(conf),
        detail: `%B ${pctB.toFixed(2)} — ${pctB < 0.1 ? 'near lower band (mean-revert up)' : pctB > 0.9 ? 'near upper band (mean-revert down)' : 'mid-band'}`,
        overlays: [
          { label: 'BB mid', values: b.mid, color: '#898781' },
          { label: 'BB upper', values: b.upper, color: '#5be58455' },
          { label: 'BB lower', values: b.lower, color: '#5be58455' },
        ],
      }
    },
  },
  {
    key: 'momentum',
    label: 'Momentum (10)',
    run: (candles) => {
      const closes = candles.map((c) => c.close)
      const mo = last(momentum(closes, 10))
      const verdict: Verdict = mo > 0 ? 'bull' : mo < 0 ? 'bear' : 'neutral'
      return {
        verdict,
        confidence: clamp01(Math.abs(mo) / 10),
        detail: `10-bar rate of change ${mo.toFixed(2)}%`,
        overlays: [],
      }
    },
  },
]

export function methodByKey(key: string): MethodDef | undefined {
  return METHODS.find((m) => m.key === key)
}
