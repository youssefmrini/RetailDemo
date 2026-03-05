import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, ShoppingBag, Megaphone, BarChart3, Layers } from 'lucide-react'
import { ToastContainer } from './components/Toast'
import ChatWidget from './components/ChatWidget'
import DemoGuide from './components/DemoGuide'
import Dashboard from './pages/Dashboard'
import CustomerSearch from './pages/CustomerSearch'
import CustomerProfile from './pages/CustomerProfile'
import ShopperPortal from './pages/ShopperPortal'
import Campaigns from './pages/Campaigns'
import Analytics from './pages/Analytics'
import Architecture from './pages/Architecture'

export { WORKSPACE, DASHBOARD_ID } from './constants'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/customers', icon: Users,    label: 'Customers'   },
  { to: '/campaigns', icon: Megaphone,label: 'Campaigns'   },
  { to: '/analytics', icon: BarChart3, label: 'Analytics'  },
  { to: '/portal',    icon: ShoppingBag, label: 'Shopper Portal' },
  { to: '/architecture', icon: Layers, label: 'Architecture' },
]

export default function App() {
  const location = useLocation()
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 flex flex-col fixed inset-y-0 left-0 z-30"
        style={{ background: '#0A0C14', borderRight: '1px solid #1E2536' }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
              S
            </div>
            <div>
              <p className="font-bold text-white tracking-widest text-sm">STRYDE</p>
              <p className="text-[10px] text-slate-600 -mt-0.5 tracking-wider">LOYALTY INTELLIGENCE</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }>
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer badges */}
        <div className="px-4 py-4 border-t border-slate-800/60 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Pipeline Running
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            Lakebase Active
          </div>
          <p className="text-[10px] text-slate-700 mt-2">yousseftko_catalog</p>
        </div>
      </aside>

      <main className="flex-1 ml-60 overflow-auto min-h-screen">
        <Routes>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/customers"    element={<CustomerSearch />} />
          <Route path="/customers/:id" element={<CustomerProfile />} />
          <Route path="/campaigns"    element={<Campaigns />} />
          <Route path="/analytics"    element={<Analytics />} />
          <Route path="/portal"       element={<ShopperPortal />} />
          <Route path="/architecture" element={<Architecture />} />
        </Routes>
      </main>

      <ToastContainer />
      {location.pathname === '/portal' && <ChatWidget />}
      <DemoGuide />
    </div>
  )
}
