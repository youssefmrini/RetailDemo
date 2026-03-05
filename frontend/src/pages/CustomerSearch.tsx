import { useState, useEffect, useMemo } from 'react'
import { Search, ChevronRight, Filter, Users, TrendingUp, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SkeletonRow } from '../components/Skeleton'
import { SEG_BADGE, TIER_BADGE } from '../constants'

interface Customer {
  customer_id: string; first_name: string; last_name: string; email: string
  segment: string; loyalty_tier: string; loyalty_points: number; ltv: number
  churn_score: number; days_since_purchase: number
}

type SortKey = 'ltv' | 'churn_score' | 'days_since_purchase' | null
type SortDir = 'asc' | 'desc'

const QUICK_FILTERS = [
  { label:'All',      q:'',         icon:<Users className="w-3 h-3"/> },
  { label:'VIP',      q:'VIP',      icon:<TrendingUp className="w-3 h-3"/> },
  { label:'At-Risk',  q:'At-Risk',  icon:<AlertTriangle className="w-3 h-3"/> },
  { label:'Loyal',    q:'Loyal',    icon:<Users className="w-3 h-3"/> },
  { label:'Dormant',  q:'Dormant',  icon:<Users className="w-3 h-3"/> },
]

const SORT_COLS: { key: SortKey; label: string }[] = [
  { key: 'ltv',                label: 'LTV' },
  { key: 'churn_score',        label: 'Churn' },
  { key: 'days_since_purchase',label: 'Days Silent' },
]

// ─── Demo Spotlight ──────────────────────────────────────────────────────────
interface SpotlightCustomer {
  customer_id: string; name: string; segment: string; tier: string
  ltv: number; churn_score: number; headline: string; why: string
  accentColor: string
}

const DEMO_SPOTLIGHT: SpotlightCustomer[] = [
  {
    customer_id: 'CUST_000042', name: 'Alex Chen', segment: 'At-Risk', tier: 'Silver',
    ltv: 389, churn_score: 0.72,
    headline: 'High churn risk · Perfect for AI offer demo',
    why: '72% churn risk, 38 days silent. Best to show real-time offer generation preventing churn.',
    accentColor: '#EF4444',
  },
  {
    customer_id: 'CUST_000001', name: 'Jordan Patel', segment: 'VIP', tier: 'Platinum',
    ltv: 12850, churn_score: 0.04,
    headline: '$12,850 LTV · Highest-value customer',
    why: 'Top 0.1% by lifetime value. Demonstrates personalization for VIP retention and upsell.',
    accentColor: '#F59E0B',
  },
  {
    customer_id: 'CUST_000200', name: 'Taylor Kim', segment: 'Loyal', tier: 'Gold',
    ltv: 1890, churn_score: 0.18,
    headline: 'Loyal Activewear shopper · Great governance demo',
    why: 'Consistent buyer across 3 categories. Great for Unity Catalog column masking demo.',
    accentColor: '#10B981',
  },
]

export default function CustomerSearch() {
  const [query, setQuery]               = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [customers, setCustomers]       = useState<Customer[]>([])
  const [loading, setLoading]           = useState(false)
  const [sortKey, setSortKey]           = useState<SortKey>(null)
  const [sortDir, setSortDir]           = useState<SortDir>('desc')
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    const q = activeFilter || query
    const controller = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/customers/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(d => setCustomers(d.customers || []))
        .catch(e => { if (e.name !== 'AbortError') console.error(e) })
        .finally(() => setLoading(false))
    }, 250)
    return () => { clearTimeout(t); controller.abort() }
  }, [query, activeFilter])

  const sorted = useMemo(() => {
    if (!sortKey) return customers
    return [...customers].sort((a, b) => {
      const av = a[sortKey] as number, bv = b[sortKey] as number
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [customers, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 text-slate-700" />
    return sortDir === 'desc' ? <ArrowDown className="w-3 h-3 text-indigo-400" /> : <ArrowUp className="w-3 h-3 text-indigo-400" />
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">Customers</p>
        <h1 className="text-2xl font-bold text-white">Customer Intelligence</h1>
        <p className="text-slate-500 text-sm mt-1">10,000 shoppers · live from Unity Catalog Delta tables</p>
      </div>

      {/* ── Demo Spotlight ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-400 text-sm">★</span>
          <span className="text-xs font-semibold text-white uppercase tracking-widest">Demo Spotlight</span>
          <span className="text-xs text-slate-600">— Recommended customers to explore</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {DEMO_SPOTLIGHT.map(c => (
            <div key={c.customer_id}
              onClick={() => navigate(`/customers/${c.customer_id}`)}
              className="cursor-pointer rounded-2xl p-4 border-l-4 hover:bg-white/5 transition-colors group"
              style={{ background: `${c.accentColor}08`, border: `1px solid ${c.accentColor}20`, borderLeftColor: c.accentColor }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-semibold text-sm">{c.name}</p>
                  <p className="text-slate-500 text-xs font-mono">{c.customer_id}</p>
                </div>
                <span className="text-xs font-semibold group-hover:translate-x-0.5 transition-transform" style={{ color: c.accentColor }}>→</span>
              </div>
              <p className="text-xs font-semibold mb-1" style={{ color: c.accentColor }}>{c.headline}</p>
              <p className="text-slate-500 text-xs leading-relaxed">{c.why}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${c.accentColor}15`, color: c.accentColor, border: `1px solid ${c.accentColor}30` }}>
                  ${c.ltv.toLocaleString()} LTV
                </span>
                <span className="text-xs text-slate-600">{(c.churn_score * 100).toFixed(0)}% churn risk</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        <input value={query} onChange={e => { setQuery(e.target.value); setActiveFilter('') }}
          placeholder='Search by name, ID… or use quick filters below'
          className="input pl-11" />
      </div>

      {/* Quick filters + Sort controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-600" />
          <div className="flex gap-2 flex-wrap">
            {QUICK_FILTERS.map(f => (
              <button key={f.label}
                onClick={() => { setActiveFilter(f.q); setQuery('') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === f.q ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300'
                }`}
                style={{ background: activeFilter === f.q ? '#6366F115' : '#0D1117', border: `1px solid ${activeFilter === f.q ? '#6366F150' : '#1E2536'}` }}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-600 mr-1">Sort:</span>
          {SORT_COLS.map(({ key, label }) => (
            <button key={key as string} onClick={() => toggleSort(key)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${sortKey === key ? 'text-indigo-300' : 'text-slate-600 hover:text-slate-300'}`}
              style={{ background: sortKey === key ? '#6366F115' : '#0D1117', border: `1px solid ${sortKey === key ? '#6366F140' : '#1E2536'}` }}>
              {label} <SortIcon k={key} />
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            {loading ? 'Querying Delta tables…' : `${sorted.length} results`}
          </span>
          {sortKey && (
            <span className="text-xs text-indigo-400">
              Sorted by {SORT_COLS.find(c => c.key === sortKey)?.label} {sortDir === 'desc' ? '↓' : '↑'}
            </span>
          )}
        </div>

        {loading ? (
          Array.from({length:6}).map((_,i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-slate-600">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {sorted.map(c => (
              <div key={c.customer_id}
                onClick={() => navigate(`/customers/${c.customer_id}`)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-indigo-500/5 transition-colors cursor-pointer group">
                <div className="w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center flex-shrink-0"
                  style={{ background:'linear-gradient(135deg,#6366F130,#8B5CF230)', color:'#A5B4FC' }}>
                  {c.first_name[0]}{c.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm group-hover:text-indigo-300 transition-colors">
                    {c.first_name} {c.last_name}
                  </p>
                  <p className="text-slate-600 text-xs truncate">{c.customer_id} · {c.email}</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-600">LTV</p>
                    <p className={`font-semibold text-sm ${sortKey === 'ltv' ? 'text-indigo-300' : 'text-white'}`}>
                      ${c.ltv.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-slate-600">Churn</p>
                    <p className={`font-semibold text-sm ${sortKey === 'churn_score' ? 'text-indigo-300' : c.churn_score>0.6?'text-red-400':c.churn_score>0.3?'text-amber-400':'text-emerald-400'}`}>
                      {(c.churn_score*100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="text-right hidden lg:block">
                    <p className="text-xs text-slate-600">Silent</p>
                    <p className={`font-semibold text-sm ${sortKey === 'days_since_purchase' ? 'text-indigo-300' : c.days_since_purchase>30?'text-amber-400':'text-slate-400'}`}>
                      {c.days_since_purchase}d
                    </p>
                  </div>
                  <span className={TIER_BADGE[c.loyalty_tier]??'badge-bronze'}>{c.loyalty_tier}</span>
                  <span className={SEG_BADGE[c.segment]??'badge bg-slate-800 text-slate-400'}>{c.segment}</span>
                  <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
