import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Star, AlertTriangle, TrendingUp, Sparkles, Clock, Tag, Shield, Lock, Eye, EyeOff, CheckCircle, ShoppingBag, Database } from 'lucide-react'
import { toast } from '../components/Toast'
import { SkeletonCard } from '../components/Skeleton'
import { SEG_BADGE, TIER_BADGE, CATEGORIES } from '../constants'

interface Customer {
  customer_id: string; first_name: string; last_name: string; email: string
  segment: string; loyalty_tier: string; loyalty_points: number; ltv: number
  churn_score: number; favorite_categories: string; preferred_channel: string
  days_since_purchase: number; last_purchase_date: string; cc_masked: string; age_group: string
}
interface IntentItem { category: string; intent_score: number; intent_score_normalized: number; event_count: number }
interface Offer {
  offer_id: number; offer_code: string; product_name: string; category: string
  relevance_score: number; discount_pct: number; offer_message: string
}
interface Purchase {
  purchase_id: string; product_sku: string; product_name: string; brand: string
  category: string; price: number; quantity: number; purchase_date: string; total_amount: number
}
interface PurchasesResponse {
  customer_id: string; purchases: Purchase[]; source: 'unity_catalog' | 'mock'; latency_ms: number
}

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer]   = useState<Customer | null>(null)
  const [intent, setIntent]       = useState<IntentItem[]>([])
  const [offers, setOffers]       = useState<Offer[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [purchasesSource, setPurchasesSource] = useState<'unity_catalog' | 'mock' | null>(null)
  const [purchasesLoading, setPurchasesLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedCat, setSelectedCat] = useState('Denim')
  const [loading, setLoading]     = useState(true)
  const [role, setRole]             = useState<'marketing' | 'sfo'>('marketing')
  const [prevChurnScore, setPrevChurnScore] = useState<number | null>(null)
  const [simulatedChurnScore, setSimulatedChurnScore] = useState<number | null>(null)
  const [offerLatencyMs, setOfferLatencyMs] = useState<number | null>(null)
  const [latencyVisible, setLatencyVisible] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/customers/${id}`).then(r => r.json()),
      fetch(`/api/customers/${id}/intent`).then(r => r.json()),
      fetch(`/api/customers/${id}/offers`).then(r => r.json()),
    ]).then(([c, i, o]) => {
      setCustomer(c)
      setIntent(i.intent || [])
      setOffers(o.offers || [])
      if (i.intent?.[0]) setSelectedCat(i.intent[0].category)
    }).finally(() => setLoading(false))

    // Fetch purchases separately so it doesn't block the main load
    fetch(`/api/customers/${id}/purchases`)
      .then(r => r.json())
      .then((data: PurchasesResponse) => {
        setPurchases(data.purchases || [])
        setPurchasesSource(data.source || 'mock')
      })
      .catch(() => setPurchases([]))
      .finally(() => setPurchasesLoading(false))
  }, [id])

  const generateOffer = async () => {
    if (!customer) return
    setGenerating(true)
    // Save current churn score before the call
    const currentChurn = simulatedChurnScore ?? customer.churn_score
    setPrevChurnScore(currentChurn)
    const t0 = performance.now()
    try {
      const res = await fetch('/api/offers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          category: selectedCat,
          customer_data: {
            segment: customer.segment, days_since_purchase: customer.days_since_purchase,
            churn_score: customer.churn_score, ltv: customer.ltv,
            favorite_categories: customer.favorite_categories,
          }
        })
      })
      const offer = await res.json()
      const elapsed = Math.round(performance.now() - t0)
      setOfferLatencyMs(elapsed)
      setLatencyVisible(true)
      setTimeout(() => setLatencyVisible(false), 5000)
      // Simulate churn score dropping by 8-15%
      const dropPct = 0.08 + Math.random() * 0.07
      const newChurn = Math.max(0, currentChurn * (1 - dropPct))
      setSimulatedChurnScore(newChurn)
      const updated = await fetch(`/api/customers/${id}/offers`).then(r => r.json())
      setOffers(updated.offers || [])
      toast(`Offer ${offer.offer_code} pushed to Lakebase!`, 'success')
    } catch {
      toast('Failed to generate offer', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const clearOffers = async () => {
    await fetch(`/api/offers/${id}`, { method: 'DELETE' })
    setOffers([])
    toast('Offers cleared', 'info')
  }

  if (loading) return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="skeleton h-6 w-48 rounded" />
      <div className="grid grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><SkeletonCard key={i}/>)}</div>
    </div>
  )
  if (!customer) return <div className="p-8 text-slate-500">Customer not found</div>

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate('/customers')}
          className="flex items-center gap-2 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> All customers
        </button>
        {customer && (
          <>
            <span className="text-slate-700">/</span>
            <span className="text-white font-medium">{customer.first_name} {customer.last_name}</span>
          </>
        )}
      </div>

      {/* Profile Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
              {customer.first_name[0]}{customer.last_name[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{customer.first_name} {customer.last_name}</h2>
              <p className="text-slate-500 text-sm">{customer.email}</p>
              <p className="text-slate-700 text-xs font-mono mt-0.5">{customer.customer_id}</p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className={SEG_BADGE[customer.segment]??'badge-dormant'}>{customer.segment}</span>
                <span className={TIER_BADGE[customer.loyalty_tier]??'badge-bronze'}>{customer.loyalty_tier}</span>
                <span className="badge bg-slate-800/60 text-slate-400 border-slate-700">{customer.age_group}</span>
                <span className="badge bg-slate-800/60 text-slate-400 border-slate-700">Via {customer.preferred_channel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="input w-40 py-2">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <div className="flex flex-col items-end gap-1">
              <button onClick={generateOffer} disabled={generating} className="btn-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {generating ? 'Generating…' : 'Generate Offer'}
              </button>
              {offerLatencyMs !== null && (
                <span
                  className="text-[10px] text-emerald-400 font-mono transition-opacity duration-700"
                  style={{ opacity: latencyVisible ? 1 : 0 }}
                >
                  Generated in {offerLatencyMs}ms · claude-sonnet-4-5
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Journey Timeline ── */}
      <div className="card py-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-4">Customer Journey</p>
        <div className="flex items-start gap-0">
          {[
            {
              icon: '👀', label: 'Browsing',
              sub: `${customer.favorite_categories.split('|')[0]} · ${customer.days_since_purchase}d ago`,
              done: true, color: '#6366F1',
            },
            {
              icon: '⚡', label: 'Intent Signal',
              sub: intent.length > 0 ? `${intent[0]?.category} · score ${(intent[0]?.intent_score_normalized * 100).toFixed(0)}%` : 'DLT computed',
              done: true, color: '#8B5CF6',
            },
            {
              icon: '🎯', label: 'AI Offer',
              sub: offers.length > 0 ? `${offers[0].offer_code} · ${offers[0].discount_pct}% off` : generating ? 'Generating…' : 'Generate above ↑',
              done: offers.length > 0, color: '#F59E0B',
            },
            {
              icon: '💳', label: 'Converted',
              sub: purchases.length > 0 ? `$${purchases[0]?.total_amount?.toFixed(2) ?? '—'} · ${purchases[0]?.category ?? '—'}` : 'Pending offer',
              done: purchases.length > 0, color: '#10B981',
            },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex-1 flex items-start gap-0">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: step.done ? `${step.color}20` : '#1E253620', border: `1px solid ${step.done ? step.color + '40' : '#1E2536'}` }}>
                  {step.icon}
                </div>
                <p className="text-xs font-semibold mt-1.5 whitespace-nowrap" style={{ color: step.done ? step.color : '#475569' }}>{step.label}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 text-center max-w-[90px] leading-tight">{step.sub}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="flex-1 mt-4 mx-1 h-px" style={{ background: step.done ? `linear-gradient(90deg,${step.color}60,${arr[i+1].color}30)` : '#1E2536' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon:<TrendingUp className="w-5 h-5"/>, color:'#10B981', label:'Lifetime Value',    value:`$${customer.ltv.toLocaleString()}`, extra: null },
          { icon:<Star className="w-5 h-5"/>,        color:'#F59E0B', label:'Loyalty Points',   value:customer.loyalty_points.toLocaleString(), extra: null },
          {
            icon:<AlertTriangle className="w-5 h-5"/>,
            color:(simulatedChurnScore ?? customer.churn_score)>0.6?'#EF4444':'#F59E0B',
            label:'Churn Risk',
            value:`${((simulatedChurnScore ?? customer.churn_score)*100).toFixed(0)}%`,
            extra: (prevChurnScore !== null && (simulatedChurnScore ?? customer.churn_score) < prevChurnScore)
              ? `↓ ${((prevChurnScore - (simulatedChurnScore ?? customer.churn_score)) * 100).toFixed(0)}pts after offer`
              : null
          },
          { icon:<Clock className="w-5 h-5"/>,       color:customer.days_since_purchase>30?'#F59E0B':'#6366F1', label:'Days Silent', value:`${customer.days_since_purchase}d`, extra: null },
        ].map(m => (
          <div key={m.label} className="metric-card text-center py-5">
            <div className="flex justify-center mb-3" style={{ color: m.color }}>{m.icon}</div>
            <p className="text-2xl font-bold text-white">{m.value}</p>
            <p className="text-xs text-slate-600 mt-1">{m.label}</p>
            {m.extra && (
              <p className="text-xs text-emerald-400 font-semibold mt-1.5 animate-fade-in">{m.extra}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Intent heatmap */}
        <div className="card">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-indigo-400" /> Category Intent — Last 48h
          </h3>
          {intent.length > 0 ? (
            <div className="space-y-3">
              {intent.map((item, i) => (
                <div key={item.category}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={`font-medium ${i===0?'text-indigo-300':'text-slate-400'}`}>{item.category}</span>
                    <span className="text-slate-600">{item.event_count} events</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800">
                    <div className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width:`${Math.min(item.intent_score_normalized*100,100)}%`,
                        background: i===0 ? 'linear-gradient(90deg,#6366F1,#8B5CF6)' : `hsl(${200+i*25},60%,50%)` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600 text-sm">Pipeline still processing…</div>
          )}
          <div className="mt-5 pt-4 border-t border-slate-800/60">
            <p className="text-xs text-slate-600 mb-2">Favorite categories</p>
            <div className="flex flex-wrap gap-1.5">
              {customer.favorite_categories.split('|').map(cat => (
                <span key={cat} className="text-xs px-2.5 py-1 rounded-lg text-slate-400 bg-slate-800/60 border border-slate-700/60">{cat}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Active offers */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-400" /> Active Offers
              {offers.length > 0 && <span className="text-xs text-indigo-400 font-mono">({offers.length})</span>}
              <span className="text-xs text-slate-600">· Lakebase</span>
            </h3>
            {offers.length > 0 && (
              <button onClick={clearOffers} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Clear all</button>
            )}
          </div>
          {offers.length > 0 ? (
            <div className="space-y-3">
              {offers.map(o => (
                <div key={o.offer_id} className="rounded-xl p-3.5 space-y-1.5"
                  style={{ background:'#6366F108', border:'1px solid #6366F125' }}>
                  <div className="flex justify-between">
                    <span className="font-mono text-xs text-indigo-400">{o.offer_code}</span>
                    <span className="text-emerald-400 font-bold text-sm">{o.discount_pct}% OFF</span>
                  </div>
                  <p className="text-white text-sm font-medium">{o.product_name}</p>
                  <p className="text-slate-500 text-xs italic">"{o.offer_message}"</p>
                  <div className="flex justify-between text-xs text-slate-700 pt-1">
                    <span>{o.category}</span>
                    <span>Relevance {(o.relevance_score*100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Tag className="w-8 h-8 text-slate-700" />
              <p className="text-slate-600 text-sm text-center">No offers yet. Select a category and click <br/><span className="text-indigo-400">Generate Offer</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Purchases */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-indigo-400" /> Recent Purchases
            {purchasesSource && !purchasesLoading && (
              <span className={`flex items-center gap-1 text-xs font-normal ml-1 px-2 py-0.5 rounded-full border ${
                purchasesSource === 'unity_catalog'
                  ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
                  : 'text-slate-500 border-slate-700 bg-slate-800/40'
              }`}>
                <Database className="w-3 h-3" />
                {purchasesSource === 'unity_catalog' ? 'live from Unity Catalog' : 'demo data'}
              </span>
            )}
          </h3>
        </div>

        {purchasesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <ShoppingBag className="w-8 h-8 text-slate-700" />
            <p className="text-slate-600 text-sm">No purchases found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-600 border-b border-slate-800/60">
                  <th className="text-left pb-2 pr-4 font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left pb-2 pr-4 font-medium uppercase tracking-wider">Product</th>
                  <th className="text-left pb-2 pr-4 font-medium uppercase tracking-wider">Category</th>
                  <th className="text-left pb-2 pr-4 font-medium uppercase tracking-wider">Brand</th>
                  <th className="text-right pb-2 pr-4 font-medium uppercase tracking-wider">Qty</th>
                  <th className="text-right pb-2 font-medium uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {purchases.map(p => {
                  const catColors: Record<string, string> = {
                    Denim:      'text-blue-400 bg-blue-400/10 border-blue-400/25',
                    Activewear: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25',
                    Outerwear:  'text-cyan-400 bg-cyan-400/10 border-cyan-400/25',
                    Footwear:   'text-orange-400 bg-orange-400/10 border-orange-400/25',
                    Accessories:'text-pink-400 bg-pink-400/10 border-pink-400/25',
                    Basics:     'text-slate-400 bg-slate-400/10 border-slate-400/25',
                    Formal:     'text-violet-400 bg-violet-400/10 border-violet-400/25',
                    Loungewear: 'text-amber-400 bg-amber-400/10 border-amber-400/25',
                  }
                  const badgeCls = catColors[p.category] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/25'
                  return (
                    <tr key={p.purchase_id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-2.5 pr-4 text-slate-500 font-mono whitespace-nowrap">{p.purchase_date}</td>
                      <td className="py-2.5 pr-4">
                        <p className="text-white font-medium">{p.product_name}</p>
                        <p className="text-slate-700 font-mono text-[10px]">{p.product_sku}</p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badgeCls}`}>
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400">{p.brand}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-400">{p.quantity}</td>
                      <td className="py-2.5 text-right text-white font-semibold">${p.total_amount.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Privacy & Governance Panel */}
      <div className="card space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-semibold text-sm">Unity Catalog Data Governance</h3>
            {role === 'marketing' ? (
              <span className="text-xs px-2 py-0.5 rounded-full text-amber-400 font-semibold"
                style={{ background:'#F59E0B15', border:'1px solid #F59E0B30' }}>
                Marketing Agent Role
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full text-violet-300 font-semibold animate-pulse"
                style={{ background:'#7C3AED20', border:'1px solid #7C3AED50' }}>
                SFO Override — Full Access
              </span>
            )}
          </div>
          <button
            onClick={() => setRole(r => r === 'marketing' ? 'sfo' : 'marketing')}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-300 ${
              role === 'marketing'
                ? 'text-violet-300 hover:text-violet-200'
                : 'text-amber-400 hover:text-amber-300'
            }`}
            style={role === 'marketing'
              ? { background:'#7C3AED15', border:'1px solid #7C3AED40' }
              : { background:'#F59E0B15', border:'1px solid #F59E0B40' }
            }
          >
            {role === 'marketing' ? (
              <><Eye className="w-3.5 h-3.5" /> Switch to SFO View</>
            ) : (
              <><EyeOff className="w-3.5 h-3.5" /> Back to Marketing View</>
            )}
          </button>
        </div>

        {role === 'marketing' ? (
          /* Marketing view: 2-column restricted */
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                <Eye className="w-3 h-3 text-emerald-400" /> Visible to this role
              </p>
              <div className="space-y-1.5">
                {[
                  ['customer_id',    customer.customer_id,                        'PK'],
                  ['first_name',     customer.first_name,                         'string'],
                  ['last_name',      customer.last_name,                          'string'],
                  ['email',          customer.email,                              'string'],
                  ['segment',        customer.segment,                            'string'],
                  ['loyalty_tier',   customer.loyalty_tier,                       'string'],
                  ['loyalty_points', customer.loyalty_points.toLocaleString(),    'int'],
                  ['ltv',            `$${customer.ltv.toLocaleString()}`,         'decimal'],
                  ['churn_score',    `${(customer.churn_score*100).toFixed(0)}%`, 'float'],
                  ['cc_masked',      customer.cc_masked,                          'masked'],
                ].map(([col, val, type]) => (
                  <div key={col} className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs"
                    style={{ background:'#10B98108', border:'1px solid #10B98118' }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span className="font-mono text-emerald-400">{col}</span>
                      <span className="text-slate-700">{type}</span>
                    </div>
                    <span className="text-slate-400 truncate max-w-[120px]">{val}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
                <EyeOff className="w-3 h-3 text-red-400" /> Restricted by column policy
              </p>
              <div className="space-y-1.5">
                {[
                  ['cc_raw_RESTRICTED',      'Raw credit card number',  'Column mask: ALWAYS NULL'],
                  ['ssn_RESTRICTED',         'Social Security Number',  'Column mask: ALWAYS NULL'],
                  ['date_of_birth_FULL',     'Full date of birth',      'Column mask: year only'],
                  ['phone_raw_RESTRICTED',   'Unmasked phone number',   'Column mask: last 4 digits'],
                  ['home_address_FULL',      'Full street address',     'Column mask: zip only'],
                  ['ip_address_RESTRICTED',  'Raw IP address',          'Column mask: anonymized'],
                  ['bank_account_RESTRICTED','Bank account number',     'Column mask: ALWAYS NULL'],
                  ['passport_RESTRICTED',    'Passport / Gov ID',       'Column mask: ALWAYS NULL'],
                ].map(([col, desc, policy]) => (
                  <div key={col} className="rounded-lg px-3 py-1.5 text-xs"
                    style={{ background:'#EF444408', border:'1px solid #EF444420' }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Lock className="w-3 h-3 text-red-500 flex-shrink-0" />
                      <span className="font-mono text-red-400">{col}</span>
                    </div>
                    <p className="text-slate-600 pl-5">{desc}</p>
                    <p className="text-slate-700 pl-5 italic text-[10px]">{policy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* SFO view: all 18 columns unlocked */
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-violet-400" /> All columns — SFO full access
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                ['customer_id',          customer.customer_id,                        'PK',      false],
                ['first_name',           customer.first_name,                         'string',  false],
                ['last_name',            customer.last_name,                          'string',  false],
                ['email',                customer.email,                              'string',  false],
                ['segment',              customer.segment,                            'string',  false],
                ['loyalty_tier',         customer.loyalty_tier,                       'string',  false],
                ['loyalty_points',       customer.loyalty_points.toLocaleString(),    'int',     false],
                ['ltv',                  `$${customer.ltv.toLocaleString()}`,         'decimal', false],
                ['churn_score',          `${(customer.churn_score*100).toFixed(0)}%`, 'float',   false],
                ['cc_masked',            customer.cc_masked,                          'masked',  false],
                ['cc_raw_RESTRICTED',    '4532 •••• •••• 7891',                       'string',  true],
                ['ssn_RESTRICTED',       '•••-••-4892',                               'string',  true],
                ['date_of_birth_FULL',   '1988-03-14',                                'date',    true],
                ['phone_raw_RESTRICTED', '+1 (415) 867-5309',                         'string',  true],
                ['home_address_FULL',    '2847 Market St, SF 94114',                  'string',  true],
                ['ip_address_RESTRICTED','192.168.42.101',                            'string',  true],
                ['bank_account_RESTRICTED','••••••••3374',                            'string',  true],
                ['passport_RESTRICTED',  'US·P·X7392841',                            'string',  true],
              ].map(([col, val, type, restricted]) => (
                <div key={col as string}
                  className="flex items-center justify-between rounded-lg px-3 py-1.5 text-xs"
                  style={restricted
                    ? { background:'#7C3AED12', border:'1px solid #7C3AED35' }
                    : { background:'#10B98108', border:'1px solid #10B98118' }
                  }>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-3 h-3 flex-shrink-0 ${restricted ? 'text-violet-500' : 'text-emerald-500'}`} />
                    <span className={`font-mono ${restricted ? 'text-violet-400' : 'text-emerald-400'}`}>{col as string}</span>
                    <span className="text-slate-700">{type as string}</span>
                  </div>
                  <span className={`truncate max-w-[130px] ${restricted ? 'text-violet-300' : 'text-slate-400'}`}>{val as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-6 pt-3 border-t border-slate-800/60 text-xs text-slate-600">
          {role === 'marketing' ? (
            <>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-400" /> 10 columns visible
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-red-400" /> 8 columns restricted
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-violet-400" /> 18 columns visible (SFO override)
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-slate-600" /> 0 restricted
              </span>
            </>
          )}
          <span className="flex items-center gap-1.5 ml-auto">
            <Shield className="w-3 h-3 text-amber-400" />
            Enforced by Unity Catalog · yousseftko_catalog
          </span>
        </div>
      </div>
    </div>
  )
}
