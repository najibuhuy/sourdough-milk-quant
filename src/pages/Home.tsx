import { useMarket } from '../state/store'
import { TickerCard } from '../components/TickerCard'
import { NewsFeed } from '../components/NewsFeed'
import { StockTable } from '../components/StockTable'
import { PairPicker } from '../components/PairPicker'

export function Home() {
  const { crypto, stocks, news } = useMarket()
  const cryptoList = Object.values(crypto).sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  )
  const stockList = Object.values(stocks).sort((a, b) =>
    a.symbol.localeCompare(b.symbol),
  )

  return (
    <>
      <h1 className="page-title">Home</h1>
      <p className="page-sub">
        Live markets overview — crypto streams in real time; stocks, forex and
        news update as sources publish.
      </p>

      <div className="ticker-row">
        {cryptoList.length === 0
          ? [...Array(3)].map((_, i) => (
              <div key={i} className="card ticker-card">
                <div className="skeleton" style={{ width: '40%' }} />
                <div className="skeleton" style={{ width: '70%', height: 24 }} />
                <div className="skeleton" style={{ width: '100%', height: 36 }} />
              </div>
            ))
          : cryptoList.map((c) => <TickerCard key={c.symbol} inst={c} />)}
      </div>

      <div className="home-grid">
        <div className="home-col">
          <NewsFeed items={news} />
        </div>
        <div className="home-col">
          <PairPicker />
          <StockTable stocks={stockList} />
        </div>
      </div>
    </>
  )
}
