import { useMarket } from '../state/store'
import { CryptoSpotlight } from '../components/CryptoSpotlight'
import { CommoditySpotlight } from '../components/CommoditySpotlight'
import { NewsFeed } from '../components/NewsFeed'
import { StockTable } from '../components/StockTable'
import { PairPicker } from '../components/PairPicker'
import { EconomicCalendar } from '../components/EconomicCalendar'

export function Home() {
  const { stocks, news } = useMarket()
  const all = Object.values(stocks)

  // index first (^JKSE), then alphabetical
  const bySym = (a: { symbol: string }, b: { symbol: string }) => {
    const ia = a.symbol.startsWith('^') ? 0 : 1
    const ib = b.symbol.startsWith('^') ? 0 : 1
    return ia - ib || a.symbol.localeCompare(b.symbol)
  }
  const idxStocks = all.filter((s) => ['IDX', 'INDEX'].includes(s.market ?? '')).sort(bySym)
  const usStocks = all.filter((s) => (s.market ?? 'US') === 'US').sort(bySym)

  return (
    <>
      <h1 className="page-title">Home</h1>
      <p className="page-sub">
        Live markets overview — crypto streams in real time; commodities, stocks,
        forex, macro events and news update as sources publish.
      </p>

      <div className="home-grid6">
        {/* row 1 — spotlights */}
        <CommoditySpotlight />
        <PairPicker />
        <CryptoSpotlight />
        {/* row 2 — watchlists + macro */}
        <StockTable
          title="IHSG · IDX"
          group="idx"
          stocks={idxStocks}
          hint="Waiting for IHSG quotes… (keyless via Yahoo)"
        />
        <StockTable
          title="S&P 500 · US"
          group="us"
          stocks={usStocks}
          hint="Waiting for US quotes… (set FINNHUB_API_KEY for real-time)"
        />
        <EconomicCalendar />
      </div>

      <div className="home-news">
        <NewsFeed items={news} />
      </div>
    </>
  )
}
