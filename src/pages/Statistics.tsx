export function Statistics() {
  return (
    <>
      <h1 className="page-title">Statistics</h1>
      <p className="page-sub">Order book, indicators and prediction methods.</p>
      <div className="placeholder">
        <div className="milestone">Milestone 2 — in progress</div>
        <h2>The quant lab lands here</h2>
        <p>
          This page will hold the live order book (Binance depth stream), candlestick
          charts, and an indicator engine: SMA/EMA crossovers, RSI, MACD, Bollinger
          bands and momentum signals — each producing a bull/bear verdict per symbol
          with a configurable horizon.
        </p>
        <p>
          Every verdict generated here is recorded, so the Learning page can score
          it against what the market actually did.
        </p>
      </div>
    </>
  )
}
