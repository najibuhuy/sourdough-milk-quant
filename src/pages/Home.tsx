import { useMarket } from '../state/store'
import { CryptoSpotlight } from '../components/CryptoSpotlight'
import { CommoditySpotlight } from '../components/CommoditySpotlight'
import { NewsFeed } from '../components/NewsFeed'
import { StockTable } from '../components/StockTable'
import { PairPicker } from '../components/PairPicker'
import { EconomicCalendar } from '../components/EconomicCalendar'

export function Home() {
  const { stocks, news } = useMarket()
  const stockList = Object.values(stocks).sort((a, b) => {
    const ma = a.market ?? 'US'
    const mb = b.market ?? 'US'
    if (ma !== mb) return ma === 'IDX' ? -1 : mb === 'IDX' ? 1 : 0
    // index first within a market, then alphabetical
    const ia = a.symbol.startsWith('^') ? 0 : 1
    const ib = b.symbol.startsWith('^') ? 0 : 1
    return ia - ib || a.symbol.localeCompare(b.symbol)
  })

  return (
    <>
      <h1 className="page-title">Home</h1>
      <p className="page-sub">
        Live markets overview — crypto streams in real time; stocks, forex and
        news update as sources publish.
      </p>

      <div className="home-grid">
        <div className="home-col">
          <NewsFeed items={news} />
        </div>
        <div className="home-rail">
          <CryptoSpotlight />
          <CommoditySpotlight />
          <PairPicker />
          <EconomicCalendar />
          <StockTable stocks={stockList} />
        </div>
      </div>
    </>
  )
}
