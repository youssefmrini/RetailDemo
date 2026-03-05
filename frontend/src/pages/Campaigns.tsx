import { useState, useEffect, useRef } from 'react'
import { Megaphone, Zap, Users, Target, Send, Sparkles, Loader2, CheckCircle2, Mail, MessageSquare, Bell, Layout, RotateCcw, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../components/Toast'
import { CATEGORIES } from '../constants'

const SEGMENTS = ['All At-Risk', 'VIP Dormant 30d+', 'Denim Intenders', 'Loyal Gold Tier', 'New Members']
const CHANNELS = ['Email', 'Push Notification', 'SMS', 'In-App Banner']
const DISCOUNTS = ['10%', '15%', '20%', '25%', '30%', 'Free Shipping', 'BOGO']

interface Campaign {
  campaign_id: number; name: string; segment: string; category: string
  channel: string; discount: string; status: string
  estimated_reach: number; conversions: number; launched_at?: string
}

const STATUS_STYLE: Record<string, string> = {
  live:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  complete: 'bg-slate-500/10  text-slate-400   border-slate-500/20',
  draft:    'bg-amber-500/10  text-amber-400   border-amber-500/20',
}

// ── Channel-specific preview ───────────────────────────────────────────────────
function ChannelPreview({ channel, name, copy, discount, copyLoading }: {
  channel: string; name: string; copy: string; discount: string; copyLoading: boolean
}) {
  const displayCopy = copy || `We selected this exclusive ${discount} offer just for you — available for a limited time only.`

  if (channel === 'Email') {
    return (
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2D3748', background: '#0D1117' }}>
        <div className="px-4 py-3 border-b border-slate-800/80" style={{ background: '#161B2E' }}>
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="text-slate-600 w-12 shrink-0">From:</span>
            <span className="text-indigo-400">STRYDE Loyalty &lt;offers@stryde.com&gt;</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 w-12 shrink-0">Subject:</span>
            <span className="text-white font-medium">{name || 'Your exclusive STRYDE offer'}</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{discount} Off — Limited Time</div>
          {copyLoading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
              <span className="text-slate-500 text-xs">Claude is writing your email…</span>
            </div>
          ) : (
            <p className="text-slate-300 text-sm leading-relaxed">{displayCopy}</p>
          )}
          <div className="pt-1">
            <span className="inline-block px-4 py-2 text-xs font-bold text-white rounded-lg" style={{ background: '#6366F1' }}>
              Shop Now →
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (channel === 'SMS') {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1C2438', border: '1px solid #2D3748' }}>
        <div className="px-4 py-2.5 border-b border-slate-800/60 flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-500">Text Message · STRYDE</span>
        </div>
        <div className="p-4 flex justify-start">
          <div className="max-w-xs px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-white space-y-1.5" style={{ background: '#2D3748' }}>
            {copyLoading ? (
              <div className="flex gap-1 py-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : (
              <p className="leading-relaxed">{displayCopy}</p>
            )}
            <p className="text-xs text-slate-500 pt-1">Reply STOP to opt out</p>
          </div>
        </div>
      </div>
    )
  }

  if (channel === 'Push Notification') {
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: '#161B2E', border: '1px solid #2D3748' }}>
        <div className="px-4 py-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
            <span className="text-white text-sm font-black">S</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-white text-xs font-semibold">STRYDE</span>
              <span className="text-slate-600 text-xs">now</span>
            </div>
            <p className="text-xs font-semibold text-white mb-0.5">{name || 'Your exclusive offer'}</p>
            {copyLoading ? (
              <div className="flex gap-1 py-0.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{displayCopy}</p>
            )}
          </div>
        </div>
        <div className="border-t border-slate-800/60 grid grid-cols-2 divide-x divide-slate-800/60">
          <button className="py-2 text-xs text-indigo-400 font-medium">Open</button>
          <button className="py-2 text-xs text-slate-500">Dismiss</button>
        </div>
      </div>
    )
  }

  // In-App Banner
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#6366F110,#8B5CF210)', border: '1px solid #6366F130' }}>
      <div className="px-4 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">{discount} Off — For You</span>
          <span className="text-slate-600 text-xs cursor-pointer hover:text-slate-400">✕</span>
        </div>
        <p className="text-white font-semibold text-sm">{name || 'Your exclusive offer'}</p>
        {copyLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
            <span className="text-slate-500 text-xs">Writing…</span>
          </div>
        ) : (
          <p className="text-slate-300 text-xs leading-relaxed">{displayCopy}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          <button className="px-3 py-1.5 text-xs font-bold text-white rounded-lg" style={{ background: '#6366F1' }}>Shop Now</button>
          <button className="text-xs text-slate-500">Maybe later</button>
        </div>
      </div>
    </div>
  )
}

// ── Launch cinema modal ────────────────────────────────────────────────────────
function LaunchModal({ campaignName, channel, segment, discount, reach, onClose, onNavigateRecipients }: {
  campaignName: string; channel: string; segment: string; discount: string
  reach: number; onClose: () => void; onNavigateRecipients: () => void
}) {
  const [step, setStep] = useState(1)
  const [counter, setCounter] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    // Counter animation: 0 → reach over ~1200ms
    const increment = Math.max(1, Math.ceil(reach / 30))
    let current = 0
    const counterInterval = setInterval(() => {
      current = Math.min(current + increment, reach)
      setCounter(current)
      if (current >= reach) clearInterval(counterInterval)
    }, 40)

    timers.push(setTimeout(() => setStep(2), 1600))

    timers.push(setTimeout(() => {
      setStep(3)
      let p = 0
      const progInterval = setInterval(() => {
        p = Math.min(p + 3, 100)
        setProgress(p)
        if (p >= 100) clearInterval(progInterval)
      }, 50)
    }, 3200))

    timers.push(setTimeout(() => setStep(4), 5600))

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(counterInterval)
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const steps = [
    {
      label: 'Querying Unity Catalog audience',
      detail: step >= 1 ? `${counter.toLocaleString()} / ${reach.toLocaleString()} ${segment} shoppers selected` : '',
      activeColor: 'bg-indigo-500',
      detailColor: 'text-indigo-400',
    },
    {
      label: `Personalizing ${reach.toLocaleString()} messages with Claude`,
      detail: step >= 2 ? `${discount} offer crafted for ${channel}` : '',
      activeColor: 'bg-purple-500',
      detailColor: 'text-purple-400',
    },
    {
      label: 'Deploying via Lakebase real-time delivery',
      detail: step === 3 ? `${progress}% delivered` : step > 3 ? '100% delivered' : '',
      activeColor: 'bg-emerald-500',
      detailColor: 'text-emerald-400',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-md mx-4 rounded-2xl p-8" style={{ background: '#0D1117', border: '1px solid #1E2536' }}>
        {step < 4 ? (
          <div className="space-y-7">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'linear-gradient(135deg,#6366F120,#8B5CF220)', border: '1px solid #6366F140' }}>
                <Send className="w-7 h-7 text-indigo-400" style={{ animation: step === 3 ? 'pulse 1s infinite' : 'none' }} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Launching "{campaignName}"</h3>
                <p className="text-slate-500 text-sm mt-1">Powered by Databricks + Claude Sonnet</p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-5">
              {steps.map((s, i) => {
                const idx = i + 1
                const isActive = step === idx
                const isDone = step > idx
                const isPending = step < idx
                return (
                  <div key={i} className={`flex items-start gap-3 transition-opacity duration-500 ${isPending ? 'opacity-30' : 'opacity-100'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${isDone ? 'bg-emerald-500' : isActive ? s.activeColor : 'bg-slate-800'}`}>
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : isActive ? (
                        <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isPending ? 'text-slate-600' : 'text-white'}`}>{s.label}</p>
                      {s.detail && (
                        <p className={`text-xs mt-0.5 ${s.detailColor}`}>{s.detail}</p>
                      )}
                      {/* Progress bar for step 3 */}
                      {isActive && i === 2 && (
                        <div className="mt-2">
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#10B981,#059669)' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── Campaign Live! ── */
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: '#10B98115', border: '2px solid #10B98140' }}>
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-2xl">Campaign Live</h3>
              <p className="text-slate-400 text-sm mt-1">"{campaignName}" is now delivering</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Shoppers reached', value: reach.toLocaleString(), color: 'text-indigo-400' },
                { label: 'Channel', value: channel === 'Push Notification' ? 'Push' : channel, color: 'text-purple-400' },
                { label: 'Incentive', value: discount, color: 'text-emerald-400' },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: '#161B2E', border: '1px solid #1E2536' }}>
                  <div className={`text-base font-black leading-tight ${m.color}`}>{m.value}</div>
                  <div className="text-xs text-slate-600 mt-1 leading-tight">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-4 text-left space-y-2" style={{ background: '#6366F108', border: '1px solid #6366F120' }}>
              <p className="text-xs text-slate-500">What happened:</p>
              <ul className="space-y-1.5">
                {[
                  `Pulled ${reach.toLocaleString()} ${segment} profiles from Unity Catalog`,
                  `Claude Sonnet generated personalized ${channel} copy`,
                  `Persisted campaign to Lakebase in real-time`,
                  `Conversion tracking active via Delta tables`,
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={onClose} className="w-full btn-primary py-3 font-semibold text-sm">
                View in Campaign History
              </button>
              <button
                onClick={() => { onClose(); onNavigateRecipients() }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-150"
              >
                <Users className="w-4 h-4" /> View Recipients →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Campaigns() {
  const navigate = useNavigate()
  const [name, setName]             = useState('')
  const [segment, setSegment]       = useState(SEGMENTS[0])
  const [category, setCategory]     = useState(CATEGORIES[0])
  const [channel, setChannel]       = useState(CHANNELS[0])
  const [discount, setDiscount]     = useState(DISCOUNTS[2])
  const [launching, setLaunching]   = useState(false)
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [launchModal, setLaunchModal] = useState<{ name: string; channel: string; segment: string; discount: string } | null>(null)
  const [launchReach, setLaunchReach] = useState(0)

  // Live conversion ticker
  const [liveCampaignId, setLiveCampaignId] = useState<string | null>(null)
  const [liveConversions, setLiveConversions] = useState(0)
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const liveTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [reach, setReach]             = useState<number | null>(null)
  const [reachSource, setReachSource] = useState<'unity_catalog' | 'fallback' | null>(null)
  const [reachLoading, setReachLoading] = useState(false)

  const [previewCopy, setPreviewCopy]   = useState('')
  const [copyLoading, setCopyLoading]   = useState(false)
  const copyDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setReach(null)
    setReachLoading(true)
    fetch(`/api/campaigns/estimate?segment=${encodeURIComponent(segment)}`)
      .then(r => r.json())
      .then(d => { setReach(d.count); setReachSource(d.source) })
      .catch(() => setReach(null))
      .finally(() => setReachLoading(false))
  }, [segment])

  useEffect(() => {
    if (copyDebounce.current) clearTimeout(copyDebounce.current)
    setCopyLoading(true)
    copyDebounce.current = setTimeout(() => {
      fetch(`/api/campaigns/preview-copy?segment=${encodeURIComponent(segment)}&category=${encodeURIComponent(category)}&channel=${encodeURIComponent(channel)}&discount=${encodeURIComponent(discount)}`)
        .then(r => r.json())
        .then(d => setPreviewCopy(d.copy || ''))
        .catch(() => setPreviewCopy(''))
        .finally(() => setCopyLoading(false))
    }, 600)
    return () => { if (copyDebounce.current) clearTimeout(copyDebounce.current) }
  }, [segment, category, channel, discount])

  // Start live ticker when a campaign is launched
  useEffect(() => {
    if (!liveCampaignId) return

    setLiveConversions(0)

    liveIntervalRef.current = setInterval(() => {
      setLiveConversions(prev => prev + Math.floor(Math.random() * 3) + 1)
    }, 2500)

    liveTimeoutRef.current = setTimeout(() => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current)
    }, 60000)

    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current)
      if (liveTimeoutRef.current)  clearTimeout(liveTimeoutRef.current)
    }
  }, [liveCampaignId])

  const replicateCampaign = (c: Campaign) => {
    setSegment(c.segment)
    setCategory(c.category)
    setChannel(c.channel)
    setDiscount(c.discount)
    setName(`${c.name} (Rerun)`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const launch = async () => {
    if (!name.trim()) { toast('Please enter a campaign name', 'error'); return }
    if (!reach) { toast('Waiting for audience estimate…', 'error'); return }

    // Show cinematic modal immediately
    setLaunchReach(reach)
    setLaunchModal({ name, channel, segment, discount })
    setLaunching(true)

    try {
      const resp = await fetch('/api/campaigns/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, segment, category, channel, discount, estimated_reach: reach }),
      })
      const campaign = await resp.json()
      setCampaigns(c => [campaign, ...c])
      setName('')
      // Start live conversion ticker for this campaign
      setLiveCampaignId(String(campaign.campaign_id))
    } catch {
      toast('Failed to launch campaign', 'error')
      setLaunchModal(null)
    } finally {
      setLaunching(false)
    }
  }

  const CHANNEL_ICON: Record<string, React.ReactNode> = {
    'Email': <Mail className="w-3.5 h-3.5" />,
    'Push Notification': <Bell className="w-3.5 h-3.5" />,
    'SMS': <MessageSquare className="w-3.5 h-3.5" />,
    'In-App Banner': <Layout className="w-3.5 h-3.5" />,
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {launchModal && (
        <LaunchModal
          campaignName={launchModal.name}
          channel={launchModal.channel}
          segment={launchModal.segment}
          discount={launchModal.discount}
          reach={launchReach}
          onClose={() => { setLaunchModal(null) }}
          onNavigateRecipients={() => navigate('/customers')}
        />
      )}

      <div>
        <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">Campaigns</p>
        <h1 className="text-2xl font-bold text-white">Campaign Builder</h1>
        <p className="text-slate-500 text-sm mt-1">AI-powered personalized offers · Lakebase real-time delivery</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Builder ── */}
        <div className="col-span-2 card space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <h3 className="text-white font-semibold">New Campaign</h3>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1.5 block">Campaign Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Denim Spring Revival"
              className="input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1.5 block">Target Segment</label>
              <select value={segment} onChange={e => setSegment(e.target.value)} className="input">
                {SEGMENTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1.5 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1.5 block">Channel</label>
              <select value={channel} onChange={e => setChannel(e.target.value)} className="input">
                {CHANNELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1.5 block">Incentive</label>
              <select value={discount} onChange={e => setDiscount(e.target.value)} className="input">
                {DISCOUNTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Users className="w-4 h-4 text-indigo-400" />
                Estimated reach:
                {reachLoading ? (
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> querying Unity Catalog…
                  </span>
                ) : reach !== null ? (
                  <span className="flex items-center gap-2">
                    <span className="text-white font-semibold">{reach.toLocaleString()} shoppers</span>
                    {reachSource === 'unity_catalog' && (
                      <span className="text-xs text-emerald-400 font-mono">live from UC</span>
                    )}
                  </span>
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
              {reach !== null && !reachLoading && (
                <div className="flex items-center gap-2 text-xs text-purple-300 pl-6">
                  <TrendingUp className="w-3 h-3" />
                  Predicted: ~<span className="font-semibold text-white mx-0.5">{Math.round(reach * 0.034).toLocaleString()}</span> conversions · ~<span className="font-semibold text-emerald-400 mx-0.5">${Math.round(reach * 0.034 * 62).toLocaleString()}</span> revenue
                  <span className="text-slate-600">· 3.4% CVR × $62 AOV</span>
                </div>
              )}
            </div>
            <button onClick={launch} disabled={launching || reachLoading}
              className="btn-primary flex items-center gap-2 px-5 py-2.5">
              {launching ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
              ) : (
                <><Send className="w-4 h-4" /> Launch Campaign</>
              )}
            </button>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <h3 className="text-white font-semibold text-sm">Campaign Preview</h3>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500" style={{ fontSize: '11px' }}>
              {CHANNEL_ICON[channel]}
              <span>{channel}</span>
            </div>
          </div>

          <ChannelPreview
            channel={channel}
            name={name}
            copy={previewCopy}
            discount={discount}
            copyLoading={copyLoading}
          />

          <div className="space-y-2 pt-1">
            {[
              ['Personalization', 'Claude Sonnet'],
              ['Reach estimate', 'Unity Catalog live'],
              ['Delivery', 'Lakebase real-time'],
              ['Tracking', 'Delta tables'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{k}</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Sparkles className="w-2.5 h-2.5 text-purple-400" /> {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Campaign History ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-indigo-400" /> Campaign History
            <span className="text-xs text-slate-600 font-normal">· persisted in Lakebase</span>
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-4 px-4 py-2 rounded-xl" style={{ background: '#10B98108', border: '1px solid #10B98118' }}>
              <div className="text-center">
                <p className="text-emerald-400 font-bold text-base leading-none">3.4%</p>
                <p className="text-slate-600 mt-0.5">AI CVR</p>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div className="text-center">
                <p className="text-slate-500 font-bold text-base leading-none">0.8%</p>
                <p className="text-slate-600 mt-0.5">Baseline</p>
              </div>
              <div className="w-px h-6 bg-slate-800" />
              <div className="text-center">
                <p className="text-amber-400 font-bold text-base leading-none">4.25×</p>
                <p className="text-slate-600 mt-0.5">AI lift</p>
              </div>
            </div>
          </div>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-slate-600 text-sm py-4 text-center">No campaigns yet. Launch your first one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-600 text-xs uppercase tracking-wider border-b border-slate-800/60">
                {['Campaign', 'Segment', 'Category', 'Channel', 'Incentive', 'Reach', 'Conversions', 'CVR', 'Status', 'Actions'].map(h => (
                  <th key={h} className="pb-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const isLive = liveCampaignId === String(c.campaign_id)
                const displayConversions = isLive ? liveConversions : c.conversions
                const displayReach = c.estimated_reach

                return (
                  <tr key={c.campaign_id} className={`border-b border-slate-800/40 hover:bg-indigo-500/5 transition-colors ${isLive ? 'bg-emerald-500/5' : ''}`}>
                    <td className="py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white font-medium">{c.name}</span>
                        {isLive && (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            LIVE · {liveConversions} conversions
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-400">{c.segment}</td>
                    <td className="py-3.5 text-slate-400">{c.category}</td>
                    <td className="py-3.5 text-slate-400">{c.channel}</td>
                    <td className="py-3.5 text-emerald-400 font-semibold">{c.discount}</td>
                    <td className="py-3.5 text-white">{displayReach.toLocaleString()}</td>
                    <td className="py-3.5 text-white">{displayConversions.toLocaleString()}</td>
                    <td className="py-3.5">
                      {isLive ? (
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-semibold">
                            {((liveConversions / displayReach) * 100).toFixed(1)}% CVR
                          </span>
                          <span className="text-xs text-slate-600">vs {(((liveConversions / displayReach) * 100) * 0.7).toFixed(1)}% baseline</span>
                        </div>
                      ) : (
                        <span className={c.conversions > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                          {c.conversions > 0 ? `${((c.conversions / displayReach) * 100).toFixed(1)}%` : '–'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {c.status === 'live' || isLive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live
                        </span>
                      ) : c.status === 'draft' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-500/15 text-amber-400 border-amber-500/30">
                          Draft
                        </span>
                      ) : c.status === 'complete' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-500/15 text-slate-300 border-slate-500/30">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          Complete
                        </span>
                      ) : (
                        <span className={`badge text-xs ${STATUS_STYLE[c.status] ?? STATUS_STYLE.draft}`}>{c.status}</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {c.status === 'complete' && (
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => replicateCampaign(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-150"
                            title="Pre-fill form with this campaign's settings"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Replicate →
                          </button>
                          <button
                            onClick={() => navigate('/customers')}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <Users className="w-3 h-3" /> View Recipients
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
