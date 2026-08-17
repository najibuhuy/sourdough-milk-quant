export function Learning() {
  return (
    <>
      <h1 className="page-title">Learning</h1>
      <p className="page-sub">Prediction history and what the market did next.</p>
      <div className="placeholder">
        <div className="milestone">Milestone 3 — planned</div>
        <h2>Learn from every call we make</h2>
        <p>
          Each prediction made in Statistics (say, “XAUUSD bullish for Q1 via EMA
          crossover”) is journaled here with its method, horizon and confidence.
          When the horizon closes, the realized price path is scored against the
          call — so you can see which methods work, on which instruments, in which
          regimes.
        </p>
        <p>
          Over time this journal becomes a labeled dataset: the raw material for
          training real models in the model-lab milestone.
        </p>
      </div>
    </>
  )
}
