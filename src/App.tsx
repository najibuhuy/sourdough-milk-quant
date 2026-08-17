import { NavLink, Route, Routes } from 'react-router-dom'
import { MarketProvider, useMarket } from './state/store'
import { Home } from './pages/Home'
import { Statistics } from './pages/Statistics'
import { Learning } from './pages/Learning'

function ConnStatus() {
  const { connected } = useMarket()
  return (
    <div className="conn-pill">
      <span className={`conn-dot ${connected ? 'live' : ''}`} />
      {connected ? 'live feed connected' : 'reconnecting…'}
    </div>
  )
}

const MENUS = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/statistics', label: 'Statistics', icon: '∿' },
  { to: '/learning', label: 'Learning', icon: '✎' },
]

export default function App() {
  return (
    <MarketProvider>
      <div className="app">
        <nav className="sidebar">
          <div className="brand">
            quant<span>·</span>board
          </div>
          {MENUS.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="icon">{m.icon}</span>
              {m.label}
            </NavLink>
          ))}
          <div className="sidebar-footer">
            <ConnStatus />
          </div>
        </nav>
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/learning" element={<Learning />} />
          </Routes>
        </main>
      </div>
    </MarketProvider>
  )
}
