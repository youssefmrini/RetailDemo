import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, Users, AlertTriangle, Zap, Target, ShoppingBag, Activity, ArrowUpRight, ArrowDownRight, HelpCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SkeletonMetric, SkeletonRow } from '../components/Skeleton'
import { SEG_BADGE, CATEGORIES } from '../constants'

interface Summary {
  total_customers: number; vip_customers: number; at_risk_customers: number
  avg_ltv: number; offers_sent_today: number; conversion_rate: number
  active_sessions: number; top_category: string
}
interface IntentCustomer {
  customer_id: string; segment: string; loyalty_tier: string; ltv: number
  churn_score: number; days_since_purchase: number; category: string
  intent_score: number; campaign_priority: string
}

const PRI_COLOR: Record<string, string> = { HIGH: 'text-red-400', MEDIUM: 'text-amber-400', LOW: 'text-slate-500' }

// ─── Live activity feed ──────────────────────────────────────────────────────
const FEED_EVENTS = [
  { icon: '👀', text: 'CUST_002847 browsed Denim — intent score 0.89', color: 'text-indigo-300' },
  { icon: '🎯', text: 'Offer DENIM25 pushed to CUST_000042 via Lakebase', color: 'text-emerald-300' },
  { icon: '💳', text: 'CUST_000200 converted — $89.99 purchase', color: 'text-amber-300' },
  { icon: '⚡', text: 'DLT pipeline refreshed 847 intent scores', color: 'text-purple-300' },
  { icon: '🛒', text: 'CUST_007391 added Outerwear to cart (high-LTV)', color: 'text-sky-300' },
  { icon: '📊', text: 'Churn model scored 340 at-risk customers', color: 'text-red-300' },
  { icon: '👀', text: 'CUST_004523 browsed Activewear 3x in 10 minutes', color: 'text-indigo-300' },
  { icon: '🎯', text: 'Campaign "Spring Denim" reached 187 conversions', color: 'text-emerald-300' },
  { icon: '⚡', text: 'CUST_001156 loyalty tier upgraded: Silver → Gold', color: 'text-amber-300' },
  { icon: '💳', text: 'CUST_000001 purchased Formal Blazer — $249.99', color: 'text-emerald-300' },
]

// ─── Today's Opportunities strip ───────────────────────────────────────────
interface Opportunity {
  color: 'red' | 'amber' | 'emerald'
  dot: string
  headline: string
  stat: string
  action: string
  to: string
}

const OPPORTUNITIES: Opportunity[] = [
  {
    color: 'red',
    dot: '🔴',
    headline: '47 At-Risk VIP customers haven\'t purchased in 30+ days',
    stat: 'Avg LTV $3,240 · High recovery potential',
    action: 'Launch Win-Back',
    to: '/campaigns',
  },
  {
    color: 'amber',
    dot: '🟡',
    headline: 'Spring Denim Drop campaign expires in 2 days',
    stat: '187 conversions so far · 34% CTR',
    action: 'Review Campaign',
    to: '/campaigns',
  },
  {
    color: 'emerald',
    dot: '🟢',
    headline: 'Denim intent spiked +34% in the last 4 hours',
    stat: '2,340 customers showing high interest',
    action: 'View Customers',
    to: '/customers',
  },
]

const BORDER_COLOR: Record<string, string> = {
  red: 'border-l-red-500',
  amber: 'border-l-amber-400',
  emerald: 'border-l-emerald-400',
}

const ACTION_COLOR: Record<string, string> = {
  red: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20',
  amber: 'bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 border border-amber-400/20',
  emerald: 'bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 border border-emerald-400/20',
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const navigate = useNavigate()
  return (
    <div className={`flex-1 border border-slate-800/60 bg-slate-900/60 rounded-2xl p-5 border-l-4 ${BORDER_COLOR[opp.color]} flex flex-col gap-3`}>
      <div className="flex-1">
        <p className="text-white font-semibold text-sm leading-snug">{opp.headline}</p>
        <p className="text-slate-400 text-xs mt-1.5">{opp.stat}</p>
      </div>
      <button
        onClick={() => navigate(opp.to)}
        className={`self-start text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${ACTION_COLOR[opp.color]}`}
      >
        {opp.action}
      </button>
    </div>
  )
}

// ─── KPI "Why?" explanations ────────────────────────────────────────────────
const KPI_EXPLANATIONS: Record<string, string> = {
  sessions:
    '34 customers are actively browsing — 12 have Denim intent scores above 0.8, making this a prime window for real-time offers.',
  at_risk:
    '2,140 customers haven\'t purchased in 30+ days. Their average churn score is 0.72, but 312 are VIP tier — high recovery potential.',
  offers:
    '128 personalized offers were pushed to Lakebase today, 23% more than yesterday. Denim and Activewear dominate intent signals.',
  intent:
    'Average intent score of 0.71 is up from 0.64 yesterday. Clickstream shows a spike in Denim and Footwear browsing since 2pm.',
}

export default function Dashboard() {
  const [summary, setSummary]     = useState<Summary | null>(null)
  const [topIntent, setTopIntent] = useState<IntentCustomer[]>([])
  const [loading, setLoading]     = useState(true)
  const [intentLoading, setIntentLoading] = useState(false)
  const [category, setCategory]   = useState('Denim')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [feedIndex, setFeedIndex] = useState(0)
  // Track which KPI popover is open (null = none)
  const [openKpi, setOpenKpi] = useState<string | null>(null)
  const navigate = useNavigate()

  // Initial load of summary
  useEffect(() => {
    fetch('/api/analytics/summary')
      .then(r => r.json())
      .then(s => setSummary(s))
      .finally(() => setLoading(false))
  }, [])

  // Auto-refresh summary every 30s
  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/analytics/summary').then(r => r.json()).then(s => {
        setSummary(s)
        setLastUpdated(new Date())
      })
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  // Re-fetch intent table when category changes
  const fetchIntent = useCallback((cat: string) => {
    setIntentLoading(true)
    fetch(`/api/analytics/top-intent?category=${encodeURIComponent(cat)}&limit=8`)
      .then(r => r.json())
      .then(t => setTopIntent(t.customers || []))
      .finally(() => setIntentLoading(false))
  }, [])

  useEffect(() => { fetchIntent(category) }, [category, fetchIntent])

  // Cycle activity feed every 3s
  useEffect(() => {
    const id = setInterval(() => setFeedIndex(i => (i + 1) % FEED_EVENTS.length), 3000)
    return () => clearInterval(id)
  }, [])

  function timeAgo(d: Date) {
    const s = Math.round((Date.now() - d.getTime()) / 1000)
    return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`
  }

  const toggleKpi = (key: string) => setOpenKpi(prev => prev === key ? null : key)

  const URGENT = [
    { customer_id: 'CUST_000042', name: 'Alex Chen',    segment: 'At-Risk', churn: 0.72, ltv: 389,   days: 38, reason: 'Churn imminent — 38 days silent' },
    { customer_id: 'CUST_004821', name: 'Morgan Davis',  segment: 'VIP',     churn: 0.61, ltv: 5420,  days: 45, reason: 'High-LTV VIP going dark — no engagement in 45d' },
    { customer_id: 'CUST_001733', name: 'Riley Santos',  segment: 'Loyal',   churn: 0.55, ltv: 2140,  days: 31, reason: 'Loyalty tier at risk — needs re-engagement offer' },
  ]

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* ── Urgent Actions ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#EF444408', border: '1px solid #EF444425' }}>
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b" style={{ borderColor: '#EF444420', background: '#EF444412' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-bold text-red-400 uppercase tracking-widest">3 customers require immediate action</span>
          <span className="text-xs text-slate-600 ml-1">· AI detected churn signals in the last 4h</span>
        </div>
        <div className="flex divide-x divide-red-500/10">
          {URGENT.map(u => (
            <button key={u.customer_id} onClick={() => navigate(`/customers/${u.customer_id}`)}
              className="flex-1 text-left px-4 py-3 hover:bg-red-500/5 transition-colors group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white font-semibold text-sm group-hover:text-red-300 transition-colors">{u.name}</span>
                <span className="text-red-400 font-black text-sm">{(u.churn * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-slate-500 mb-1.5">{u.reason}</p>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span>${u.ltv.toLocaleString()} LTV</span>
                <span>{u.days}d silent</span>
                <span className="ml-auto text-red-500 font-semibold group-hover:text-red-300 transition-colors">Act now →</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-white">Loyalty Intelligence</h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time shopper analytics · <span className="text-indigo-400">10,000 customers</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Updated {timeAgo(lastUpdated)}
          </span>
          <button onClick={() => navigate('/campaigns')} className="btn-primary flex items-center gap-2">
            <Zap className="w-4 h-4" /> Launch Campaign
          </button>
        </div>
      </div>

      {/* ── Today's Opportunities ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-white uppercase tracking-widest">Today's Opportunities</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            3 actions
          </span>
        </div>
        <div className="flex gap-4">
          {OPPORTUNITIES.map(opp => (
            <OpportunityCard key={opp.action} opp={opp} />
          ))}
        </div>
      </div>

      {/* ── Live Signal Feed ── */}
      <div className="rounded-2xl border border-slate-800/60 overflow-hidden" style={{ background: '#0D1117' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white uppercase tracking-widest">Live Signal Feed</span>
          <span className="text-xs text-slate-600 ml-1">· Lakebase real-time events</span>
        </div>
        <div className="divide-y divide-slate-800/40">
          {Array.from({ length: 4 }).map((_, i) => {
            const ev = FEED_EVENTS[(feedIndex + i) % FEED_EVENTS.length]
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs transition-all duration-500">
                <span className="text-base leading-none">{ev.icon}</span>
                <span className={`flex-1 ${ev.color}`}>{ev.text}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({length:8}).map((_,i)=><SkeletonMetric key={i}/>)}
        </div>
      ) : (
        <>
          {/* Row 1: the 4 primary KPI cards with Why? buttons */}
          <div className="grid grid-cols-4 gap-4">
            {/* Active Sessions */}
            <div className="relative">
              <MetricCard icon={<Activity className="w-5 h-5"/>} color="emerald"
                value={summary?.active_sessions.toLocaleString()??'–'} sub="Right now" pulse
                whyKey="sessions" openKpi={openKpi} onToggleWhy={toggleKpi} />
              <KpiPopover id="sessions" openKpi={openKpi} />
            </div>

            {/* At-Risk Customers */}
            <div className="relative">
              <MetricCard icon={<AlertTriangle className="w-5 h-5"/>} color="red"
                value={summary?.at_risk_customers.toLocaleString()??'–'} sub="Churn score >0.5" trend="-8%" up={false}
                whyKey="at_risk" openKpi={openKpi} onToggleWhy={toggleKpi}
                onValueClick={() => navigate('/customers')} />
              <KpiPopover id="at_risk" openKpi={openKpi} />
            </div>

            {/* Offers Generated Today */}
            <div className="relative">
              <MetricCard icon={<ShoppingBag className="w-5 h-5"/>} color="sky"
                value={summary?.offers_sent_today.toLocaleString()??'–'} sub="AI-generated" trend="+45%" up
                whyKey="offers" openKpi={openKpi} onToggleWhy={toggleKpi} />
              <KpiPopover id="offers" openKpi={openKpi} />
            </div>

            {/* Avg Intent Score */}
            <div className="relative">
              <MetricCard icon={<TrendingUp className="w-5 h-5"/>} color="pink"
                value={summary?.top_category??'–'} sub="Last 48h intent"
                whyKey="intent" openKpi={openKpi} onToggleWhy={toggleKpi} />
              <KpiPopover id="intent" openKpi={openKpi} />
            </div>
          </div>

          {/* Row 2: remaining KPI cards (no Why? buttons) */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard icon={<Users className="w-5 h-5"/>} color="indigo"
              value={summary?.total_customers.toLocaleString()??'–'} sub="10k cohort" trend="+12%" up />
            <MetricCard icon={<TrendingUp className="w-5 h-5"/>} color="amber"
              value={summary?.vip_customers.toLocaleString()??'–'} sub="Top 10% LTV" trend="+3%" up
              onValueClick={() => navigate('/customers')} />
            <MetricCard icon={<Target className="w-5 h-5"/>} color="purple"
              value={`$${summary?.avg_ltv.toLocaleString()??'–'}`} sub="Per customer" trend="+18%" up />
            <MetricCard icon={<Zap className="w-5 h-5"/>} color="emerald"
              value={`${((summary?.conversion_rate??0)*100).toFixed(1)}%`} sub="+30% vs baseline" trend="+30%" up />
          </div>

          {/* ── Business Impact Banner ── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { emoji: '💰', label: 'Est. Revenue Recovered', value: '$147,230', sub: 'offers × avg LTV × CVR', color: '#10B981' },
              { emoji: '🎯', label: 'Churn Events Prevented', value: '312 VIPs', sub: 'high-value customers retained', color: '#F59E0B' },
              { emoji: '⚡', label: 'Avg Offer-to-Conversion', value: '4.2 hours', sub: 'from signal to purchase', color: '#6366F1' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                style={{ background: `${item.color}08`, border: `1px solid ${item.color}20` }}>
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="text-white font-bold text-lg leading-tight">{item.value}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: item.color }}>{item.label}</p>
                  <p className="text-slate-600 text-xs">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Intent Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold tracking-wide"
                style={{ background: '#6366F115', color: '#818CF8', border: '1px solid #6366F130' }}>
                Genie Query
              </span>
            </div>
            <h3 className="text-white font-semibold text-base">
              High-LTV <span className="text-indigo-300">{category}</span> Intenders — Dormant 30d+
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              "Show me top shoppers who haven't bought in 30 days but browsed {category} recently"
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="input py-2 text-sm w-40">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => navigate('/campaigns')} className="btn-ghost flex items-center gap-2 text-xs">
              Create Campaign <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading || intentLoading ? (
          <>{Array.from({length:5}).map((_,i)=><SkeletonRow key={i}/>)}</>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-600 text-xs uppercase tracking-wider border-b border-slate-800/60">
                <th className="pb-3 font-medium text-left">Customer</th>
                <th className="pb-3 font-medium text-left">Segment</th>
                <th className="pb-3 font-medium text-right">LTV</th>
                <th className="pb-3 font-medium text-right">Days Silent</th>
                <th className="pb-3 font-medium text-left">Intent</th>
                <th className="pb-3 font-medium text-center">Priority</th>
              </tr>
            </thead>
            <tbody>
              {topIntent.map((c, i) => (
                <tr key={c.customer_id}
                  onClick={() => navigate(`/customers/${c.customer_id}`)}
                  className="border-b border-slate-800/40 hover:bg-indigo-500/5 transition-colors cursor-pointer group">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center"
                        style={{ background: `hsl(${(i*47)%360},60%,25%)`, color: `hsl(${(i*47)%360},80%,70%)` }}>
                        {c.customer_id.slice(-2)}
                      </div>
                      <span className="text-slate-300 font-mono text-xs group-hover:text-indigo-300 transition-colors">
                        {c.customer_id}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <span className={SEG_BADGE[c.segment]??'badge bg-slate-800 text-slate-400'}>{c.segment}</span>
                  </td>
                  <td className="py-3.5 text-right text-white font-semibold">${c.ltv.toLocaleString()}</td>
                  <td className="py-3.5 text-right">
                    <span className={c.days_since_purchase > 45 ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                      {c.days_since_purchase}d
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2 w-32">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width:`${Math.min(c.intent_score*2,100)}%`, background:'linear-gradient(90deg,#6366F1,#8B5CF6)' }} />
                      </div>
                      <span className="text-slate-500 text-xs w-6">{Math.round(c.intent_score)}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-center">
                    <span className={`text-xs font-bold ${PRI_COLOR[c.campaign_priority]??''}`}>
                      {c.campaign_priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── KPI Popover ────────────────────────────────────────────────────────────
function KpiPopover({ id, openKpi }: { id: string; openKpi: string | null }) {
  if (openKpi !== id) return null
  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-20 border border-slate-700/60 bg-slate-800/95 rounded-xl p-4 shadow-xl backdrop-blur-sm">
      <p className="text-slate-300 text-xs leading-relaxed">{KPI_EXPLANATIONS[id]}</p>
    </div>
  )
}

// ─── MetricCard ─────────────────────────────────────────────────────────────
function MetricCard({ icon, color, value, sub, trend, up, pulse, whyKey, openKpi, onToggleWhy, onValueClick }: {
  icon: React.ReactNode; color: string; value: string
  sub: string; trend?: string; up?: boolean; pulse?: boolean
  whyKey?: string; openKpi?: string | null; onToggleWhy?: (key: string) => void
  onValueClick?: () => void
}) {
  const colors: Record<string,string> = {
    indigo:'#6366F1', amber:'#F59E0B', red:'#EF4444', emerald:'#10B981',
    purple:'#8B5CF6', sky:'#0EA5E9', pink:'#EC4899'
  }
  const c = colors[color] ?? '#6366F1'
  const isWhyOpen = whyKey != null && openKpi === whyKey

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background:`${c}15`, color:c }}>{icon}</div>
        <div className="flex items-center gap-2">
          {trend && (
            <div className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-400' : 'text-red-400'}`}>
              {up ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
              {trend}
            </div>
          )}
          {whyKey && onToggleWhy && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleWhy(whyKey) }}
              title="Why?"
              className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                isWhyOpen
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800'
              }`}
            >
              {isWhyOpen
                ? <X className="w-3 h-3" />
                : <HelpCircle className="w-3.5 h-3.5" />
              }
            </button>
          )}
        </div>
      </div>
      {onValueClick ? (
        <button
          onClick={onValueClick}
          className="text-2xl font-bold text-white tracking-tight hover:text-indigo-300 transition-colors cursor-pointer text-left"
        >
          {value}
        </button>
      ) : (
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      )}
      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
        {pulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
        {sub}
      </p>
    </div>
  )
}
