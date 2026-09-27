import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMarket } from '../state/store'
import { fetchHistory, createPrediction } from '../lib/api'
import { METHODS, methodByKey, type MethodResult } from '../lib/indicators'
import type { Candle, Instrument } from '../lib/types'
import { fmtPrice, fmtCompact, timeAgo, orderCommodities } from '../lib/format'
import { useChartView } from '../lib/useChartView'
import { PriceChart } from '../components/PriceChart'
import { VolumeBars } from '../components/VolumeBars'

type GroupKey = 'us' | 'idx' | 'crypto' | 'commodity'

/** apiGroup is the backend history mapping class; stable per group key. */
const GROUP_META: Record<GroupKey, { label: string; apiGroup: string }> = {
  us: { label: 'US · S&P', apiGroup: 'stock' },
  idx: { label: 'IHSG · IDX', apiGroup: 'stock' },
  crypto: { label: 'Crypto', apiGroup: 'crypto' },
  commodity: { label: 'Commodities', apiGroup: 'commodity' },
}

const HORIZONS = [
  { label: '1 day', secs: 86_400 },
  { label: '1 week', secs: 604_800 },
  { label: '1 month', secs: 2_592_000 },
]

/** Time-range presets for the chart: a Yahoo `range` paired with the bar
 *  `interval` that keeps the bar count reasonable (and that Yahoo allows for
 *  that range). Zooming with the wheel works within whatever is loaded here. */
const RANGES = [
  { key: '1d', label: '1D', range: '1d', interval: '5m', bars: '5-min' },
  { key: '5d', label: '5D', range: '5d', interval: '15m', bars: '15-min' },
  { key: '1mo', label: '1M', range: '1mo', interval: '1h', bars: 'hourly' },
  { key: '3mo', label: '3M', range: '3mo', interval: '1d', bars: 'daily' },
  { key: '6mo', label: '6M', range: '6mo', interval: '1d', bars: 'daily' },
  { key: '1y', label: '1Y', range: '1y', interval: '1d', bars: 'daily' },
  { key: '5y', label: '5Y', range: '5y', interval: '1wk', bars: 'weekly' },
  { key: 'max', label: 'Max', range: 'max', interval: '1mo', bars: 'monthly' },
] as const
type RangeKey = (typeof RANGES)[number]['key']
const DEFAULT_RANGE: RangeKey = '6mo'
const rangeByKey = (k: string | null) => RANGES.find((r) => r.key === k)

/** Indicators need this many bars before Run is enabled. */
const MIN_BARS = 30

/** Extra keywords to widen related-news matching (ticker → common names). */
const NEWS_ALIASES: Record<string, string[]> = {
  BTC: ['bitcoin', 'crypto'],
  ETH: ['ethereum', 'ether', 'crypto'],
  SOL: ['solana', 'crypto'],
  XAU: ['gold', 'bullion'],
  XAG: ['silver'],
  XPT: ['platinum'],
  WTI: ['oil', 'crude'],
  BRENT: ['oil', 'crude', 'brent'],
  NATGAS: ['gas', 'natural gas'],
  COPPER: ['copper'],
}

function instrumentsFor(group: GroupKey, m: ReturnType<typeof useMarket>): Instrument[] {
  const stocks = Object.values(m.stocks)
  switch (group) {
    case 'us':
      return stocks.filter((s) => (s.market ?? 'US') === 'US')
    case 'idx':
      return stocks.filter((s) => ['IDX', 'INDEX'].includes(s.market ?? ''))
    case 'crypto':
      return Object.values(m.crypto)
    case 'commodity':
      return Object.values(m.commodities)
    default:
      return []
  }
}

export function Statistics() {
  const market = useMarket()
  const [params, setParams] = useSearchParams()

  const initialGroup = (params.get('group') ?? '') as GroupKey
  const [group, setGroup] = useState<GroupKey>(
    GROUP_META[initialGroup] ? initialGroup : 'crypto',
  )
  const [symbol, setSymbol] = useState<string>(params.get('symbol') ?? '')
  const [methodKey, setMethodKey] = useState<string>(params.get('method') ?? 'ema_cross')
  const [horizon, setHorizon] = useState<number>(86_400)
  const [rangeKey, setRangeKey] = useState<RangeKey>(
    rangeByKey(params.get('range'))?.key ?? DEFAULT_RANGE,
  )
  const rangeDef = rangeByKey(rangeKey) ?? RANGES[4]

  const instruments = instrumentsFor(group, market)
  const symbols = useMemo(() => {
    const syms = instruments.map((i) => i.symbol)
    return group === 'commodity' ? orderCommodities(syms) : syms.sort()
  }, [instruments, group])
  const activeSymbol = symbol && symbols.includes(symbol) ? symbol : symbols[0] ?? ''
  const activeInst = instruments.find((i) => i.symbol === activeSymbol)

  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MethodResult | null>(null)
  const [save, setSave] = useState<{ state: 'idle' | 'saving' | 'saved' | 'error'; msg: string }>(
    { state: 'idle', msg: '' },
  )

  // chart interaction shared by the price and volume panes: the visible
  // time window (wheel / drag / buttons) and the hovered bar (crosshair)
  const view = useChartView(candles.length)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  // load history whenever the instrument or time range changes
  useEffect(() => {
    if (!activeSymbol) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setResult(null)
    setHoverIdx(null)
    setSave({ state: 'idle', msg: '' })
    fetchHistory(activeSymbol, GROUP_META[group].apiGroup, rangeDef.range, rangeDef.interval)
      .then((r) => !cancelled && setCandles(r.candles))
      .catch((e) => !cancelled && setError(String(e?.message ?? e)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [activeSymbol, group, rangeDef.range, rangeDef.interval])

  // keep the URL in sync so Home deep-links and refresh work
  useEffect(() => {
    const p: Record<string, string> = { group, method: methodKey, range: rangeKey }
    if (activeSymbol) p.symbol = activeSymbol
    setParams(p, { replace: true })
  }, [group, methodKey, rangeKey, activeSymbol, setParams])

  const method = methodByKey(methodKey)
  const canRun = !!method && candles.length >= MIN_BARS
  const runAnalysis = () => method && canRun && setResult(method.run(candles))

  const savePrediction = async () => {
    if (!result || !activeSymbol || candles.length === 0) return
    setSave({ state: 'saving', msg: '' })
    try {
      await createPrediction({
        symbol: activeSymbol,
        group: GROUP_META[group].apiGroup,
        method: methodKey,
        verdict: result.verdict,
        confidence: result.confidence,
        price_at: candles[candles.length - 1].close,
        horizon_secs: horizon,
      })
      setSave({ state: 'saved', msg: 'Saved to journal — track it on Learning.' })
    } catch (e: unknown) {
      setSave({ state: 'error', msg: e instanceof Error ? e.message : String(e) })
    }
  }

  // related news: match ticker / base / display name / common aliases
  const relatedNews = useMemo(() => {
    const base = activeSymbol.replace(/USDT$|USD$|=X$|\.JK$/i, '')
    const terms = [activeSymbol, base, activeInst?.name, ...(NEWS_ALIASES[base] ?? [])]
      .filter((t): t is string => !!t && t.length >= 2)
      .map((t) => t.toLowerCase())
    return market.news
      .filter((n) => terms.some((t) => n.title.toLowerCase().includes(t)))
      .slice(0, 8)
  }, [market.news, activeSymbol, activeInst?.name])

  const lastClose = candles.length ? candles[candles.length - 1].close : undefined

  // buying vs selling pressure over the bars currently in view: volume on
  // up-bars vs down-bars (proxy for order flow)
  const visible = candles.slice(view.start, view.end)
  const buyVol = visible.reduce((s, c) => s + (c.close >= c.open ? c.volume ?? 0 : 0), 0)
  const sellVol = visible.reduce((s, c) => s + (c.close < c.open ? c.volume ?? 0 : 0), 0)
  const totalVol = buyVol + sellVol

  return (
    <>
      <h1 className="page-title">Statistics</h1>
      <p className="page-sub">
        Pick a group and instrument, choose a method, and run it against real price
        history. Save a call to score it later on Learning.
      </p>

      <div className="stat-controls card">
        <label>
          <span>Group</span>
          <select value={group} onChange={(e) => setGroup(e.target.value as GroupKey)}>
            {(Object.keys(GROUP_META) as GroupKey[]).map((g) => (
              <option key={g} value={g}>
                {GROUP_META[g].label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Instrument</span>
          <select
            value={activeSymbol}
            onChange={(e) => setSymbol(e.target.value)}
            disabled={symbols.length === 0}
          >
            {symbols.length === 0 && <option>— waiting for feed —</option>}
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Method</span>
          <select value={methodKey} onChange={(e) => setMethodKey(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Horizon</span>
          <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
            {HORIZONS.map((h) => (
              <option key={h.secs} value={h.secs}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
        <button className="run-btn" onClick={runAnalysis} disabled={!canRun}>
          Run ▸
        </button>
      </div>

      <div className="stat-grid">
        <div className="card">
          <h3>
            {activeSymbol || '—'}
            {activeInst?.name ? (
              <span className="tag">{activeInst.name}</span>
            ) : (
              <span className="tag">{GROUP_META[group].label}</span>
            )}
          </h3>

          <div className="chart-toolbar">
            <div className="seg" role="group" aria-label="time range">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className={r.key === rangeKey ? 'active' : ''}
                  onClick={() => setRangeKey(r.key)}
                  title={`${r.label} · ${r.bars} bars`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <span className="zoom-hint">wheel: zoom · drag: pan · double-click: reset</span>
            <div className="seg" role="group" aria-label="zoom">
              <button type="button" onClick={view.zoomOut} disabled={!view.zoomed} title="zoom out">
                −
              </button>
              <button
                type="button"
                onClick={view.zoomIn}
                disabled={candles.length <= 8}
                title="zoom in"
              >
                +
              </button>
              <button type="button" onClick={view.reset} disabled={!view.zoomed} title="show all">
                ⟲
              </button>
            </div>
          </div>

          {loading ? (
            <div className="skeleton" style={{ height: 280 }} />
          ) : error ? (
            <div className="empty">History unavailable: {error}</div>
          ) : (
            <>
              <div className="stat-price">
                {lastClose !== undefined ? fmtPrice(lastClose) : '—'}
                <span className="stat-price-sub">
                  {' '}
                  · {candles.length} bars · {rangeDef.bars}
                  {view.zoomed ? ` · viewing ${view.end - view.start}` : ''}
                </span>
              </div>
              <PriceChart
                candles={candles}
                overlays={result?.overlays ?? []}
                view={view}
                hoverIdx={hoverIdx}
                onHover={setHoverIdx}
              />
              {result && (
                <div className="stat-legend">
                  {(result.overlays ?? []).map((o) => (
                    <span key={o.label} style={{ color: o.color }}>
                      ● {o.label}
                    </span>
                  ))}
                </div>
              )}
              {totalVol > 0 ? (
                <div className="vol-section">
                  <div className="vol-head">
                    <span>Volume · buying vs selling pressure{view.zoomed ? ' (in view)' : ''}</span>
                    <span>
                      <span className="delta-up">▲ {fmtCompact(buyVol)}</span>{' '}
                      <span className="delta-down">▼ {fmtCompact(sellVol)}</span>
                    </span>
                  </div>
                  <div className="vol-split" title={`${Math.round((buyVol / totalVol) * 100)}% up-bar volume`}>
                    <div className="vol-split-buy" style={{ width: `${(buyVol / totalVol) * 100}%` }} />
                  </div>
                  <VolumeBars candles={candles} view={view} hoverIdx={hoverIdx} onHover={setHoverIdx} />
                  <div className="vol-note">
                    Up-bar volume (green) vs down-bar volume (red) — a proxy for order
                    flow; free data has no true buy/sell tape.
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="card">
          <h3>
            Verdict<span className="tag">{method?.label ?? methodKey}</span>
          </h3>
          {!result ? (
            <div className="empty">
              {loading
                ? 'Loading history…'
                : candles.length < MIN_BARS
                  ? `Need at least ${MIN_BARS} bars to analyse (${candles.length} loaded) — pick a longer range.`
                  : 'Press Run to analyse.'}
            </div>
          ) : (
            <>
              <div className={`verdict verdict-${result.verdict}`}>
                {result.verdict === 'bull' ? '▲ Bullish' : result.verdict === 'bear' ? '▼ Bearish' : '• Neutral'}
              </div>
              <div className="verdict-conf">
                confidence
                <div className="conf-bar">
                  <div
                    className={`conf-fill verdict-${result.verdict}`}
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  />
                </div>
                <span>{Math.round(result.confidence * 100)}%</span>
              </div>
              <p className="verdict-detail">{result.detail}</p>
              <button
                className="run-btn"
                onClick={savePrediction}
                disabled={save.state === 'saving' || save.state === 'saved'}
              >
                {save.state === 'saved' ? '✓ Saved' : save.state === 'saving' ? 'Saving…' : `Save prediction (${HORIZONS.find((h) => h.secs === horizon)?.label})`}
              </button>
              {save.msg && (
                <div className={save.state === 'error' ? 'empty' : 'pair-note'} style={{ marginTop: 8 }}>
                  {save.msg}
                </div>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h3>
            Related news<span className="tag">NEWS_SOURCE</span>
          </h3>
          {relatedNews.length === 0 ? (
            <div className="empty">No headlines mention {activeSymbol || 'this instrument'} yet.</div>
          ) : (
            <div className="news-list">
              {relatedNews.map((n) => (
                <article key={n.id} className="news-item">
                  {n.link ? (
                    <a href={n.link} target="_blank" rel="noreferrer noopener">
                      {n.title}
                    </a>
                  ) : (
                    <span>{n.title}</span>
                  )}
                  <div className="news-meta">
                    <span className="news-source">{n.source}</span>
                    <span>{timeAgo(n.published)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
