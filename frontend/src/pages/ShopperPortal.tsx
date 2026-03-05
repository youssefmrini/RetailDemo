import { useState, useEffect, useRef } from 'react'
import { Sparkles, Star, ShoppingBag, Tag, Zap, Eye, Heart, Activity, ShoppingCart, X, CheckCircle2, Package, TrendingUp } from 'lucide-react'
import { toast } from '../components/Toast'
import { CATEGORIES } from '../constants'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ScoreRow { category: string; score: number; event_type: string }
interface Product  { product_sku: string; name: string; brand: string; price: number; discount_pct: number; rating: number; review_count: number; stock_qty: number; category: string; tags?: string[] }
interface CartItem { product: Product; quantity: number; discounted: boolean }

interface LoyaltyMetrics {
  active_sessions: number
  offers_served_today: number
  loyalty_points_awarded: number
  conversion_rate: number
  customers_engaged: number
  top_category: string
  source: string
  updated_at: string
}

interface Offer {
  offer_code: string; product: { name: string; price: number; discount_pct: number }
  offer_message: string; explanation: string; relevance: number; discount_pct: number
}

// ─── Category product images (curated Unsplash) ────────────────────────────────
const CATEGORY_IMAGES: Record<string, string[]> = {
  Denim: [
    'photo-1542272604-787c3835535d', 'photo-1555689502-c4b22b2ca7f1',
    'photo-1473966968600-fa801b869a1a', 'photo-1541840031508-fd55a99827f3',
    'photo-1509942774463-acf339cf87d5', 'photo-1547955922-85912e223015',
    'photo-1527719327859-c6ce80353573', 'photo-1596755389378-c31d21fd1273',
  ],
  Activewear: [
    'photo-1571902943202-507ec2618e8f', 'photo-1552674605-db5bf2b31a87',
    'photo-1538805615857-a0d6e36e4822', 'photo-1549476464-37392f717541',
    'photo-1518611012118-696072aa579a', 'photo-1535743686-f5e42a28b4fb',
    'photo-1544216717-3bbf52512659', 'photo-1517960413843-f7f0c2c5d2c2',
  ],
  Outerwear: [
    'photo-1539533018447-4c229f30e29f', 'photo-1544005313-53aeff7e4c2a',
    'photo-1547624643-1b97f1b1dc17', 'photo-1551488831-00ddcf6303df',
    'photo-1562137369-1a1a0bc66744', 'photo-1548126032-079a0fb0099d',
    'photo-1512436991641-6745cae1b651', 'photo-1484737045851-282499168b8e',
  ],
  Footwear: [
    'photo-1542291026-7eec264c27ff', 'photo-1595950653106-6c7d2a8d9d3b',
    'photo-1603787081173-2a9c1ede6c13', 'photo-1606107557195-0a29a6c5cd34',
    'photo-1491553895911-0055eca6402d', 'photo-1600185365926-3a2ce3cdb9eb',
    'photo-1543163521-1bf539c55dd2', 'photo-1595950653106-6c9ebd614d3a',
  ],
  Accessories: [
    'photo-1553062407-98eeb64c6a85', 'photo-1523170335258-f04ac40ec4d3',
    'photo-1524592094714-0f0654e20314', 'photo-1551488831-00ddcf6303df',
    'photo-1584308666744-24d5c474f2ae', 'photo-1590548784585-643d2b9f2925',
    'photo-1509941943105-3c003d97011c', 'photo-1575386394854-4f8a5a6e44b2',
  ],
  Basics: [
    'photo-1562157873-818bc0726f68', 'photo-1581655353564-df726a1a4c89',
    'photo-1521572163474-6864f9cf17ab', 'photo-1503341504253-dff4815485f1',
    'photo-1529374255-4d80de6e04da', 'photo-1434389030547-9093d0edab03',
    'photo-1488161628813-04466f872be2', 'photo-1515886657613-9f3515b0c78f',
  ],
  Formal: [
    'photo-1507679799987-c73779587ccf', 'photo-1519566335897-e93c6bced62a',
    'photo-1594938298603-60d08f00e3f5', 'photo-1617137984306-4c4f23c5e64c',
    'photo-1550246981-1c7c45b49f96', 'photo-1507003211169-0a1dd7228f2d',
    'photo-1541346183200-e8818fe29d68', 'photo-1490114538084-67e47d0d2e51',
  ],
  Loungewear: [
    'photo-1586363104862-3a5e2ab60d99', 'photo-1578985545071-20a7cc282ec3',
    'photo-1617005082133-548c4dd27f35', 'photo-1561044036-04de8c18be45',
    'photo-1586015555751-31d50fe4cb74', 'photo-1575301541254-1a7e647c4a25',
    'photo-1603252109360-909baaf261f7', 'photo-1580927752452-f8f36bab7da4',
  ],
}

function productImage(category: string, idx: number) {
  const imgs = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.Basics
  const id = imgs[idx % imgs.length]
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=70`
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
      ))}
      <span className="text-slate-500 text-xs ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

// ─── Demo customers ────────────────────────────────────────────────────────────
const DEMO_CUSTOMERS = [
  { customer_id:'CUST_000042', name:'Alex Chen',    segment:'At-Risk',  tier:'Silver',   points:2340,  ltv:389,   churn:0.72, cats:'Denim|Activewear|Basics' },
  { customer_id:'CUST_000001', name:'Jordan Patel', segment:'VIP',      tier:'Platinum', points:42000, ltv:12850, churn:0.04, cats:'Outerwear|Formal|Footwear' },
  { customer_id:'CUST_000200', name:'Taylor Kim',   segment:'Loyal',    tier:'Gold',     points:8700,  ltv:1890,  churn:0.18, cats:'Activewear|Accessories' },
]

const TIER_NEXT: Record<string,{next:string,target:number}> = {
  Platinum:{next:'Platinum',target:50000}, Gold:{next:'Platinum',target:50000},
  Silver:{next:'Gold',target:15000}, Bronze:{next:'Silver',target:5000}
}

export default function ShopperPortal() {
  const [custIdx, setCustIdx]       = useState(0)
  const [browsing, setBrowsing]     = useState('Denim')
  const [offer, setOffer]           = useState<Offer|null>(null)
  const [generating, setGenerating] = useState(false)
  const [pageViews, setPageViews]   = useState(0)
  const [points, setPoints]         = useState(DEMO_CUSTOMERS[0].points)
  const [ltv, setLtv]               = useState(DEMO_CUSTOMERS[0].ltv)
  const [ltvFlash, setLtvFlash]     = useState(false)
  const [showExplain, setShowExplain] = useState(false)
  const [wishlist, setWishlist]     = useState<string[]>([])
  const [liveScores, setLiveScores] = useState<ScoreRow[]>([])
  const [scoreLatency, setScoreLatency] = useState<number>(0.8)
  const [metrics, setMetrics]       = useState<Record<string,number>>({})
  const [productLatency, setProductLatency] = useState<number>(0)
  const [loyaltyMetrics, setLoyaltyMetrics] = useState<LoyaltyMetrics | null>(null)
  const [loyaltyUpdatedSec, setLoyaltyUpdatedSec] = useState<number>(0)
  const [highlightedKpi, setHighlightedKpi] = useState<string | null>(null)

  // New: products + cart
  const [products, setProducts]     = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [cart, setCart]             = useState<CartItem[]>([])
  const [, setShowCart]     = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [purchased, setPurchased]   = useState(false)
  const [cartFlash, setCartFlash]   = useState(false)
  const [purchaseStep, setPurchaseStep] = useState<0|1|2>(0)
  const [appliedPromo, setAppliedPromo] = useState<{code: string, pct: number} | null>(null)
  const [lakebaseOffers, setLakebaseOffers] = useState<Offer[]>([])

  const autoRef = useRef<ReturnType<typeof setTimeout>|null>(null)
  const customer = DEMO_CUSTOMERS[custIdx]

  // Reset on customer change and sync to localStorage so ChatWidget picks it up
  useEffect(() => {
    setPoints(DEMO_CUSTOMERS[custIdx].points)
    setLtv(DEMO_CUSTOMERS[custIdx].ltv)
    setOffer(null)
    setPageViews(0)
    setLiveScores([])
    setCart([])
    setPurchased(false)
    setLakebaseOffers([])
    localStorage.setItem('stryde_customer_id', DEMO_CUSTOMERS[custIdx].customer_id)
    // Fetch persisted offers from Lakebase
    fetch(`/api/customers/${DEMO_CUSTOMERS[custIdx].customer_id}/offers`)
      .then(r => r.json())
      .then(d => setLakebaseOffers(d.offers || []))
      .catch(() => {})
  }, [custIdx])

  // Listen for promo codes dispatched by ChatWidget
  useEffect(() => {
    const handler = (e: Event) => {
      const { code, pct } = (e as CustomEvent<{code: string, pct: number}>).detail
      setAppliedPromo({ code, pct })
    }
    window.addEventListener('stryde:promo', handler)
    return () => window.removeEventListener('stryde:promo', handler)
  }, [])

  // Fetch products when category changes
  useEffect(() => {
    setProductsLoading(true)
    fetch(`/api/products?category=${encodeURIComponent(browsing)}&limit=4`)
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => {})
      .finally(() => setProductsLoading(false))
  }, [browsing])

  // Poll live recommendation scores every 8s
  useEffect(() => {
    const poll = () => {
      fetch(`/api/scores/${customer.customer_id}`)
        .then(r => r.json())
        .then(d => { setLiveScores(d.scores || []); setScoreLatency(d.latency_ms ?? 0.8) })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 8000)
    return () => clearInterval(id)
  }, [customer.customer_id])

  // Poll operational metrics + product latency every 5s
  useEffect(() => {
    const pollMetrics = () => {
      fetch('/api/scores/metrics/throughput').then(r=>r.json()).then(d=>setMetrics(d)).catch(()=>{})
      const t0 = performance.now()
      fetch(`/api/products?category=${encodeURIComponent(browsing)}&limit=3`)
        .then(r=>r.json())
        .then(() => setProductLatency(parseFloat((performance.now()-t0).toFixed(2))))
        .catch(()=>{})
    }
    pollMetrics()
    const id = setInterval(pollMetrics, 5000)
    return () => clearInterval(id)
  }, [browsing])

  // Poll loyalty intelligence metrics every 15s
  useEffect(() => {
    let secTimer: ReturnType<typeof setInterval> | null = null

    const fetchLoyalty = () => {
      fetch('/api/scores/metrics/loyalty')
        .then(r => r.json())
        .then((d: LoyaltyMetrics) => {
          setLoyaltyMetrics(prev => {
            // Detect any numeric change to trigger highlight
            const changed = !prev ||
              prev.active_sessions !== d.active_sessions ||
              prev.offers_served_today !== d.offers_served_today ||
              prev.loyalty_points_awarded !== d.loyalty_points_awarded ||
              prev.conversion_rate !== d.conversion_rate
            if (changed) {
              setHighlightedKpi('all')
              setTimeout(() => setHighlightedKpi(null), 800)
            }
            return d
          })
          setLoyaltyUpdatedSec(0)
        })
        .catch(() => {})
    }

    fetchLoyalty()
    const pollId = setInterval(fetchLoyalty, 15000)
    secTimer = setInterval(() => setLoyaltyUpdatedSec(s => s + 1), 1000)

    return () => {
      clearInterval(pollId)
      if (secTimer) clearInterval(secTimer)
    }
  }, [])

  // Session writes + score boost + auto-offer on category/customer change
  useEffect(() => {
    setOffer(null)
    setShowExplain(false)

    fetch('/api/offers/session', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ customer_id: customer.customer_id, category: browsing, device:'web' })
    }).then(()=>setPageViews(v=>v+1)).catch(()=>setPageViews(v=>v+1))

    fetch(`/api/scores/${customer.customer_id}/boost`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ category: browsing, event_type: 'product_view', segment: customer.segment })
    }).then(r=>r.json()).then(d=>{
      setLiveScores(prev => {
        const updated = prev.map(s =>
          s.category === browsing ? { ...s, score: d.boosted_score ?? s.score, event_type: 'product_view' } : s
        )
        if (!prev.find(s => s.category === browsing))
          updated.unshift({ category: browsing, score: d.boosted_score ?? 75, event_type: 'product_view' })
        return updated.sort((a,b) => b.score - a.score)
      })
      setScoreLatency(d.write_latency_ms ?? 0.8)
    }).catch(()=>{})

    if (autoRef.current) clearTimeout(autoRef.current)
    autoRef.current = setTimeout(()=>generateOffer(browsing), 2200)
    return ()=>{if(autoRef.current)clearTimeout(autoRef.current)}
  }, [browsing, custIdx])

  const generateOffer = async (cat: string) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/offers/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          customer_id: customer.customer_id, category: cat,
          customer_data: { segment:customer.segment, days_since_purchase:38, churn_score:customer.churn, ltv:customer.ltv, favorite_categories:customer.cats }
        })
      })
      setOffer(await res.json())
    } catch { toast('Could not load offer','error') }
    finally { setGenerating(false) }
  }

  // Cart helpers
  const addToCart = (product: Product) => {
    const discounted = offer !== null && offer.discount_pct > 0 && product.category === browsing
    setCart(prev => {
      const existing = prev.find(i => i.product.product_sku === product.product_sku)
      if (existing) return prev.map(i => i.product.product_sku === product.product_sku ? {...i, quantity: i.quantity + 1} : i)
      return [...prev, { product, quantity: 1, discounted }]
    })
    setShowCart(true)
    setCartFlash(true)
    setTimeout(() => setCartFlash(false), 500)
    toast(`${product.name} added to cart!`, 'success')
  }

  const removeFromCart = (sku: string) =>
    setCart(prev => prev.filter(i => i.product.product_sku !== sku))

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.discounted ? item.product.price * (1 - item.product.discount_pct / 100) : item.product.price
    return sum + price * item.quantity
  }, 0)

  const cartSavings = cart.reduce((sum, item) => {
    if (!item.discounted) return sum
    return sum + (item.product.price * item.product.discount_pct / 100) * item.quantity
  }, 0)

  const completePurchase = async () => {
    if (cart.length === 0) return
    setPurchasing(true)
    setPurchaseStep(1)
    await new Promise(r => setTimeout(r, 600))
    setPurchaseStep(2)
    await new Promise(r => setTimeout(r, 600))
    const earned = 350 * cart.reduce((s,i) => s + i.quantity, 0)
    const newPoints = points + earned
    const newLtv = ltv + cartTotal
    setPoints(newPoints)
    setLtv(newLtv)
    setLtvFlash(true)
    setTimeout(() => setLtvFlash(false), 2500)
    setPurchased(true)
    setPurchaseStep(0)
    setCart([])
    setOffer(null)
    setShowCart(false)
    toast(`Purchase complete! +${earned} pts · $${cartTotal.toFixed(2)} added to your LTV`, 'success')
    setPurchasing(false)
    setTimeout(() => setPurchased(false), 3000)
    // Persist to Lakebase
    fetch(`/api/customers/${customer.customer_id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: cartTotal, points_earned: earned, new_ltv: newLtv, new_points: newPoints }),
    }).catch(() => {})
  }

  const { next: nextTier, target: nextTarget } = TIER_NEXT[customer.tier] ?? { next:'Gold', target:15000 }
  const progress = Math.min((points/nextTarget)*100, 100)
  const cartCount = cart.reduce((s,i) => s + i.quantity, 0)

  const discountPct = offer?.discount_pct ?? 0

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div>
        <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">Shopper Portal</p>
        <h1 className="text-2xl font-bold text-white">Live Demo Experience</h1>
        <p className="text-slate-500 text-sm mt-1">Real products · AI offers · Lakebase real-time state</p>
      </div>

      {/* Customer selector */}
      <div className="flex gap-3">
        {DEMO_CUSTOMERS.map((c, i) => (
          <button key={c.customer_id} onClick={() => setCustIdx(i)}
            className={`flex-1 card-hover text-left transition-all py-4 ${custIdx===i?'border-indigo-500/50':''}`}
            style={custIdx===i ? {background:'#6366F110',boxShadow:'0 0 0 1px #6366F150'} : {}}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{background:'linear-gradient(135deg,#6366F130,#8B5CF230)',color:'#A5B4FC'}}>
                {c.name.split(' ').map(n=>n[0]).join('')}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-slate-600">{c.segment} · {c.tier}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Loyalty bar */}
      <div className="card" style={{background:'linear-gradient(135deg,#6366F108,#8B5CF208)',border:'1px solid #6366F125'}}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Welcome back,</p>
            <h3 className="text-xl font-bold text-white">{customer.name}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="badge" style={
                customer.segment==='VIP' ? {background:'#F59E0B15',color:'#FBBF24',border:'1px solid #F59E0B30'} :
                customer.segment==='At-Risk' ? {background:'#EF444415',color:'#F87171',border:'1px solid #EF444430'} :
                {background:'#6366F115',color:'#818CF8',border:'1px solid #6366F130'}
              }>{customer.segment}</span>
              <span className="text-xs text-slate-500">{customer.tier} Member</span>
            </div>
            <div className={`flex items-center gap-1.5 mt-2 transition-all duration-500 ${ltvFlash ? 'text-emerald-300' : 'text-slate-500'}`}>
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs font-semibold">
                Total LTV: <span className={`transition-all duration-500 ${ltvFlash ? 'text-emerald-300 font-black' : 'text-slate-400'}`}>
                  ${ltv.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </span>
              {ltvFlash && <span className="text-xs text-emerald-400 font-semibold animate-pulse ml-1">↑ Syncing to Lakebase…</span>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-2xl font-bold text-white">{points.toLocaleString()}</span>
                <span className="text-slate-500 text-sm">pts</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{Math.max(0,nextTarget-points).toLocaleString()} pts to {nextTier}</p>
              <div className="w-44 h-1.5 bg-slate-800 rounded-full mt-2 ml-auto">
                <div className="h-1.5 rounded-full transition-all duration-700"
                  style={{width:`${progress}%`,background:'linear-gradient(90deg,#6366F1,#F59E0B)'}} />
              </div>
            </div>
            {/* Cart button */}
            <button onClick={() => setShowCart(v => !v)} className="relative p-3 rounded-xl transition-all hover:bg-white/5"
              style={{border:'1px solid #6366F130'}}>
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                  style={{background:'#EF4444'}}>{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Purchase success banner */}
      {purchased && (
        <div className="rounded-2xl p-4 flex items-center gap-3 animate-fade-in"
          style={{background:'#10B98115',border:'1px solid #10B98130'}}>
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-300 font-semibold text-sm">Purchase Complete!</p>
            <p className="text-emerald-600 text-xs">Your loyalty points have been updated. New offer arriving shortly…</p>
          </div>
        </div>
      )}

      {/* Promo code banner from chat */}
      {appliedPromo !== null && (
        <div className="mx-6 mb-3 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold"
          style={{background:'#10B98115', border:'1px solid #10B98140', color:'#10B981'}}>
          <CheckCircle2 className="w-4 h-4" />
          Promo <span className="font-mono mx-1">{appliedPromo.code}</span> applied — {appliedPromo.pct}% off your cart!
          <button onClick={() => setAppliedPromo(null)} className="ml-auto text-slate-500 hover:text-slate-300 text-xs">✕</button>
        </div>
      )}

      {/* Lakebase persisted offers banner */}
      {lakebaseOffers.length > 0 && (
        <div className="rounded-2xl p-4 animate-fade-in" style={{ background: '#6366F108', border: '1px solid #6366F130' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-white uppercase tracking-widest">Active Offers</span>
            <span className="text-xs text-slate-600">· persisted in Lakebase · {lakebaseOffers.length} offer{lakebaseOffers.length > 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {lakebaseOffers.slice(0, 3).map(o => (
              <div key={o.offer_code} className="flex items-center gap-3 px-4 py-3 rounded-xl flex-1 min-w-64"
                style={{ background: '#6366F112', border: '1px solid #6366F140' }}>
                <Tag className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-300">{o.offer_code}</span>
                    <span className="text-xs font-bold text-emerald-400">{o.discount_pct}% OFF</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">{o.offer_message}</p>
                </div>
                <button
                  onClick={() => {
                    setAppliedPromo({ code: o.offer_code, pct: o.discount_pct })
                    toast(`Offer ${o.offer_code} applied to cart!`, 'success')
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-all hover:opacity-90"
                  style={{ background: '#6366F1', color: 'white' }}>
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 3-column grid */}
      <div className="grid grid-cols-3 gap-5">
        {/* Col 1: Category browser */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            <h3 className="text-white font-semibold text-sm">Browse Categories</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            {pageViews} page views · session live
          </div>
          <div className="space-y-1">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={()=>setBrowsing(cat)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between transition-all ${
                  browsing===cat ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                }`}
                style={browsing===cat ? {background:'#6366F115',border:'1px solid #6366F130'} : {border:'1px solid transparent'}}>
                {cat}
                <div className="flex items-center gap-2">
                  <button onClick={e=>{e.stopPropagation();setWishlist(w=>w.includes(cat)?w.filter(x=>x!==cat):[...w,cat])}}>
                    <Heart className={`w-3.5 h-3.5 transition-colors ${wishlist.includes(cat)?'text-pink-400 fill-pink-400':'text-slate-700 hover:text-pink-400'}`} />
                  </button>
                  {browsing===cat && <Zap className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
              </button>
            ))}
          </div>

          {/* Wishlist panel */}
          {wishlist.length > 0 && (
            <div className="mt-4 pt-4" style={{borderTop:'1px solid #1E2536'}}>
              <div className="flex items-center gap-1.5 mb-2">
                <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Wishlist</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {wishlist.map(cat => (
                  <span key={cat}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all hover:opacity-80"
                    style={{background:'#EC489915',color:'#F9A8D4',border:'1px solid #EC489930'}}>
                    {cat}
                    <button onClick={() => setWishlist(w => w.filter(x => x !== cat))}
                      className="ml-0.5 hover:text-pink-300 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Col 2: Product grid */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h3 className="text-white font-semibold text-sm">{browsing} Collection</h3>
            </div>
            {offer && (
              <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 font-semibold"
                style={{background:'#10B98115',border:'1px solid #10B98125'}}>
                {discountPct}% offer active
              </span>
            )}
          </div>
          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-56 rounded-xl bg-slate-800/50 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p, idx) => {
                const discountedPrice = offer ? p.price * (1 - discountPct/100) : p.price * (1 - p.discount_pct/100)
                const originalPrice = p.price
                const hasDiscount = offer ? discountPct > 0 : p.discount_pct > 0
                const inCart = cart.some(i => i.product.product_sku === p.product_sku)
                const isLimited = p.stock_qty < 200
                const isBestseller = Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase() === 'bestseller')
                return (
                  <div key={p.product_sku} className="rounded-xl overflow-hidden transition-all hover:ring-1 hover:ring-indigo-500/40"
                    style={{background:'#0D1117',border:'1px solid #1E2536'}}>
                    <div className="relative">
                      <img
                        src={productImage(browsing, idx)}
                        alt={p.name}
                        className="w-full h-36 object-cover"
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                      />
                      {hasDiscount && (
                        <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                          style={{background: offer ? '#6366F1' : '#EF4444'}}>
                          {offer ? `-${discountPct}%` : `-${p.discount_pct}%`}
                        </span>
                      )}
                      {/* Stock / bestseller badges */}
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        {isLimited && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md text-white"
                            style={{background:'#EF444490',backdropFilter:'blur(4px)'}}>
                            Limited
                          </span>
                        )}
                        {isBestseller && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                            style={{background:'#F59E0B90',color:'#fff',backdropFilter:'blur(4px)'}}>
                            Bestseller
                          </span>
                        )}
                      </div>
                      {inCart && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{background:'#10B981'}}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-1.5">
                      <p className="text-slate-500 text-xs">{p.brand}</p>
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{p.name}</p>
                      <StarRating rating={p.rating} />
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-white font-bold text-sm">${discountedPrice.toFixed(2)}</span>
                        {hasDiscount && (
                          <span className="text-slate-600 line-through text-xs">${originalPrice.toFixed(2)}</span>
                        )}
                      </div>
                      <button onClick={() => addToCart(p)}
                        className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={inCart
                          ? {background:'#10B98115',color:'#34D399',border:'1px solid #10B98130'}
                          : {background:'#6366F115',color:'#A5B4FC',border:'1px solid #6366F130'}
                        }>
                        {inCart ? 'In Cart ✓' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Col 3: Offer + Cart */}
        <div className="space-y-4">
          {/* Offer zone */}
          <div className="card overflow-hidden" style={{minHeight:'220px',padding:0}}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{borderBottom:'1px solid #1E2536'}}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-semibold text-sm">AI Offer</span>
                {generating
                  ? <span className="text-xs text-indigo-400 animate-pulse">· Crafting…</span>
                  : <span className="text-xs text-slate-600">· Claude + Lakebase</span>}
              </div>
              {offer && (
                <button onClick={()=>generateOffer(browsing)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
                  Refresh
                </button>
              )}
            </div>

            {offer ? (
              <div className="animate-fade-in">
                {/* Discount hero */}
                <div className="px-4 pt-4 pb-3" style={{background:'linear-gradient(135deg,#6366F10D,#8B5CF20D)'}}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md text-indigo-300"
                        style={{background:'#6366F118',border:'1px solid #6366F128'}}>
                        {offer.offer_code}
                      </span>
                      <p className="text-slate-400 text-xs mt-2 font-medium">{offer.product?.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-black leading-none"
                        style={{background:'linear-gradient(135deg,#818CF8,#A78BFA)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                        {discountPct}%
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-semibold tracking-widest">OFF</div>
                    </div>
                  </div>
                  {/* Message */}
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {offer.offer_message}
                  </p>
                  {/* Meta row */}
                  <div className="flex items-center gap-3 mt-3 pt-3" style={{borderTop:'1px solid #6366F118'}}>
                    {offer.relevance > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-14 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-1 rounded-full transition-all duration-700"
                            style={{width:`${Math.min(offer.relevance,100)}%`,background:'linear-gradient(90deg,#6366F1,#10B981)'}} />
                        </div>
                        <span className="text-xs text-slate-500">AI match <span className="text-indigo-300 font-semibold">{Math.round(offer.relevance)}%</span></span>
                      </div>
                    )}
                    <span className="text-xs text-slate-600 ml-auto">All {browsing} items eligible</span>
                  </div>
                </div>
                {/* Why this */}
                <div className="px-4 py-3">
                  <button onClick={()=>setShowExplain(v=>!v)}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors">
                    <Eye className="w-3 h-3" />
                    {showExplain ? 'Hide reasoning' : 'Why was this offer chosen?'}
                  </button>
                  {showExplain && (
                    <div className="mt-2 pl-3 border-l-2 border-indigo-500/20">
                      <p className="text-xs text-slate-500 leading-relaxed">{offer.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3 px-4">
                {generating ? (
                  <>
                    <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{borderColor:'#6366F130',borderTopColor:'#6366F1'}} />
                    <p className="text-slate-500 text-xs text-center">Analyzing your profile<br/>and {browsing} catalog…</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'#6366F110',border:'1px solid #6366F120'}}>
                      <Tag className="w-5 h-5 text-slate-700" />
                    </div>
                    <p className="text-slate-600 text-xs text-center">Select a category to<br/>receive a personalized offer</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Cart panel */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-400" />
                <h3 className="text-white font-semibold text-sm">Cart</h3>
                {cartCount > 0 && (
                  <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                    style={{background:'#6366F1'}}>{cartCount}</span>
                )}
              </div>
              {cartSavings > 0 && (
                <span className="text-xs text-emerald-400 font-semibold">-${cartSavings.toFixed(2)} saved</span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-6 text-center">
                <ShoppingCart className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                <p className="text-slate-600 text-xs">Add products from the catalog</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.product.product_sku} className="flex items-center gap-2.5 py-2 border-b border-slate-800/50">
                    <img src={productImage(item.product.category, 0)} alt={item.product.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium leading-tight truncate">{item.product.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-indigo-300 text-xs font-semibold">
                          ${(item.discounted
                            ? item.product.price * (1 - discountPct/100)
                            : item.product.price * (1 - item.product.discount_pct/100)
                          ).toFixed(2)}
                        </span>
                        {item.discounted && (
                          <span className="text-emerald-500 text-xs">offer applied</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-xs w-4 text-center">{item.quantity}</span>
                      <button onClick={() => removeFromCart(item.product.product_sku)}
                        className="w-5 h-5 rounded flex items-center justify-center hover:text-red-400 transition-colors">
                        <X className="w-3 h-3 text-slate-600" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total</span>
                    <span className="flex items-baseline gap-2">
                      {appliedPromo !== null && (
                        <span className="text-slate-600 line-through text-xs">${cartTotal.toFixed(2)}</span>
                      )}
                      <span className={`font-bold transition-all duration-300 ${cartFlash ? 'text-emerald-400 scale-110' : appliedPromo !== null ? 'text-emerald-400' : 'text-white'}`}>
                        ${appliedPromo !== null ? (cartTotal * (1 - appliedPromo.pct / 100)).toFixed(2) : cartTotal.toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <button onClick={completePurchase} disabled={purchasing}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 text-sm">
                    {purchasing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {purchaseStep === 1 ? 'Processing payment…' : 'Syncing to Lakebase…'}
                      </>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Buy Now (+350 pts)</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live session + scores */}
      <div className="grid grid-cols-2 gap-4">
        {/* Session state */}
        <div className="card py-4">
          <p className="text-xs text-slate-600 uppercase tracking-wider font-medium mb-3">Live Session State — Lakebase</p>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              ['Category', browsing],
              ['Page Views', pageViews.toString()],
              ['Segment', customer.segment],
              ['Write Latency', '<1ms'],
            ].map(([k,v])=>(
              <div key={k}>
                <p className="text-white font-semibold text-sm">{v}</p>
                <p className="text-xs text-slate-600 mt-0.5">{k}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live scores */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold text-sm">Live Recommendation Scores</h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 font-mono">{scoreLatency}ms</span>
            </div>
          </div>
          {liveScores.length > 0 ? (
            <div className="space-y-1.5">
              {liveScores.slice(0, 4).map((s, i) => {
                const scoreColor = s.score > 70
                  ? { bar: 'linear-gradient(90deg,#10B981,#34D399)', label: 'text-emerald-400' }
                  : s.score >= 40
                  ? { bar: 'linear-gradient(90deg,#F59E0B,#FBBF24)', label: 'text-amber-400' }
                  : { bar: 'linear-gradient(90deg,#EF4444,#F87171)', label: 'text-red-400' }
                return (
                  <div key={s.category} className="flex items-center gap-3">
                    <span className={`text-xs w-20 flex-shrink-0 ${i === 0 ? 'text-indigo-300 font-semibold' : 'text-slate-500'}`}>
                      {s.category}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-800">
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{width:`${Math.min(s.score,100)}%`, background: scoreColor.bar}} />
                    </div>
                    <span className={`text-xs font-mono w-8 text-right font-semibold ${scoreColor.label}`}>{s.score.toFixed(0)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-2">
              <div className="w-4 h-4 border-2 rounded-full animate-spin border-slate-700 border-t-indigo-400" />
              <span className="text-slate-600 text-xs">Loading stream data…</span>
            </div>
          )}
        </div>
      </div>

      {/* Scale metrics */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-indigo-400" />
          <h3 className="text-white font-semibold text-sm">Lakebase Operational Store — Scale Metrics</h3>
          <span className="text-xs text-slate-600">· 2,000 products · updates every 5s</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Product Lookup', value: productLatency ? `${productLatency.toFixed(1)}ms` : '—', sub:`GET /products?category=${browsing}`, color:'#10B981' },
            { label:'Concurrent Sessions', value: metrics.simulated_concurrent_sessions?.toLocaleString()??'—', sub:'active shoppers simulated', color:'#6366F1' },
            { label:'Throughput', value: metrics.throughput_rps ? `${(metrics.throughput_rps/1000).toFixed(1)}k/s` : '—', sub:'req/s across Lakebase', color:'#F59E0B' },
            { label:'Cache Hit Rate', value: metrics.cache_hit_rate ? `${(metrics.cache_hit_rate*100).toFixed(0)}%` : '—', sub:'connection pool efficiency', color:'#8B5CF6' },
          ].map(m => (
            <div key={m.label} className="rounded-xl p-4" style={{background:`${m.color}08`,border:`1px solid ${m.color}20`}}>
              <p className="text-xs text-slate-600 mb-1">{m.label}</p>
              <p className="text-2xl font-bold" style={{color:m.color}}>{m.value}</p>
              <p className="text-xs text-slate-700 mt-1 truncate">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Loyalty Intelligence — live KPI cards */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-indigo-400" />
            <h3 className="text-white font-semibold text-sm">Loyalty Intelligence</h3>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-600">· live · refreshes every 15s</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {loyaltyMetrics ? (
              <>
                <span className={loyaltyMetrics.source === 'lakebase' ? 'text-emerald-500' : 'text-amber-500'}>
                  {loyaltyMetrics.source === 'lakebase' ? 'Lakebase' : 'simulated'}
                </span>
                <span>· updated {loyaltyUpdatedSec}s ago</span>
              </>
            ) : (
              <span className="animate-pulse">loading…</span>
            )}
          </div>
        </div>

        {loyaltyMetrics ? (
          <div className="grid grid-cols-2 gap-4">
            {/* Active Sessions */}
            <div
              className="rounded-xl p-4 transition-all duration-500"
              style={{
                background: highlightedKpi === 'all' ? '#6366F120' : '#6366F108',
                border: `1px solid ${highlightedKpi === 'all' ? '#6366F150' : '#6366F120'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Active Sessions</p>
              </div>
              <p className="text-3xl font-bold text-indigo-300 transition-all duration-500">
                {loyaltyMetrics.active_sessions.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-1">shoppers browsing now</p>
            </div>

            {/* Offers Served Today */}
            <div
              className="rounded-xl p-4 transition-all duration-500"
              style={{
                background: highlightedKpi === 'all' ? '#F59E0B20' : '#F59E0B08',
                border: `1px solid ${highlightedKpi === 'all' ? '#F59E0B50' : '#F59E0B20'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Offers Served Today</p>
              </div>
              <p className="text-3xl font-bold text-amber-300 transition-all duration-500">
                {loyaltyMetrics.offers_served_today.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-1">AI-generated offers sent</p>
            </div>

            {/* Loyalty Points Awarded */}
            <div
              className="rounded-xl p-4 transition-all duration-500"
              style={{
                background: highlightedKpi === 'all' ? '#10B98120' : '#10B98108',
                border: `1px solid ${highlightedKpi === 'all' ? '#10B98150' : '#10B98120'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Loyalty Points Awarded</p>
              </div>
              <p className="text-3xl font-bold text-emerald-300 transition-all duration-500">
                {loyaltyMetrics.loyalty_points_awarded >= 1_000_000
                  ? `${(loyaltyMetrics.loyalty_points_awarded / 1_000_000).toFixed(1)}M`
                  : loyaltyMetrics.loyalty_points_awarded >= 1_000
                  ? `${(loyaltyMetrics.loyalty_points_awarded / 1_000).toFixed(0)}K`
                  : loyaltyMetrics.loyalty_points_awarded.toLocaleString()}
              </p>
              <p className="text-xs text-slate-600 mt-1">total points in circulation</p>
            </div>

            {/* Conversion Rate */}
            <div
              className="rounded-xl p-4 transition-all duration-500"
              style={{
                background: highlightedKpi === 'all' ? '#8B5CF620' : '#8B5CF608',
                border: `1px solid ${highlightedKpi === 'all' ? '#8B5CF650' : '#8B5CF620'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Conversion Rate</p>
              </div>
              <p className="text-3xl font-bold text-violet-300 transition-all duration-500">
                {(loyaltyMetrics.conversion_rate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-600 mt-1">sessions resulting in purchase</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl h-24 bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
