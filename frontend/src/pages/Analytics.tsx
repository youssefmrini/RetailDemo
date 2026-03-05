import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, BarChart3, Brain, Send, Loader2, Database, Sparkles, ChevronRight, Copy, Check, Megaphone } from 'lucide-react'
import { WORKSPACE, DASHBOARD_ID } from '../constants'

// ─── Types ────────────────────────────────────────────────────────────────────
interface SegmentData  { segment: string; count: number; color: string }
interface CategoryData { category: string; intent_score: number; customer_count: number }
interface LtvBucket    { range: string; count: number }
interface GenieResult  { question: string; sql: string; columns: string[]; rows: string[][]; row_count: number; summary: string; error?: string }
interface CampaignData { id: number; name: string; type: string; status: string; sent_count: number; conversion_count: number; conversion_rate: number }

// ─── Sample Genie questions ────────────────────────────────────────────────────
const SAMPLE_QUESTIONS = [
  "Which 10 customers have the highest churn risk and what's their LTV?",
  "Show conversion rates by campaign channel for the last 30 days",
  "What's the average basket size for VIP vs At-Risk customers?",
  "Which categories have the most abandoned cart events in the last 7 days?",
  "Rank loyalty tiers by average days since last purchase",
]

// ─── Mini horizontal bar — clickable ──────────────────────────────────────────
function HBar({ label, value, max, color, sub, onClick }: {
  label: string; value: number; max: number; color: string; sub?: string; onClick?: () => void
}) {
  const pct = Math.round((value / max) * 100)
  return (
    <div
      className={`flex items-center gap-3 py-1.5 rounded-lg px-1 -mx-1 transition-colors ${onClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
      onClick={onClick}
    >
      <span className="text-slate-400 text-xs w-24 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: '#1E2536' }}>
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-white text-xs font-semibold w-16 shrink-0">{sub ?? value.toLocaleString()}</span>
    </div>
  )
}

// ─── Segment donut — legend items are clickable ────────────────────────────────
function SegmentDonut({ data, onSegmentClick }: { data: SegmentData[]; onSegmentClick?: (segment: string) => void }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  let offset = 0
  const r = 60, cx = 80, cy = 80, stroke = 22
  const circumference = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {data.map(d => {
          const pct = d.count / total
          const dash = pct * circumference
          const gap = circumference - dash
          const el = (
            <circle key={d.segment} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circumference}
              style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.7s' }}
            />
          )
          offset += pct
          return el
        })}
        <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="18" fontWeight="700">{(total / 1000).toFixed(0)}k</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748B" fontSize="10">customers</text>
      </svg>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.segment}
            className={`flex items-center gap-2 rounded-lg px-2 py-0.5 -mx-2 transition-colors ${onSegmentClick ? 'cursor-pointer hover:bg-white/5' : ''}`}
            onClick={() => onSegmentClick?.(d.segment)}
            title={onSegmentClick ? `Ask Genie about ${d.segment} customers` : undefined}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-slate-400 text-xs w-16">{d.segment}</span>
            <span className="text-white text-xs font-semibold">{d.count.toLocaleString()}</span>
            <span className="text-slate-600 text-xs">({Math.round(d.count / total * 100)}%)</span>
          </div>
        ))}
        {onSegmentClick && (
          <p className="text-xs text-indigo-600 pl-4 mt-1">Click a segment → Genie</p>
        )}
      </div>
    </div>
  )
}

// ─── Copy SQL button ───────────────────────────────────────────────────────────
function CopySqlButton({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-400 transition-colors ml-3"
      title="Copy SQL to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy SQL'}
    </button>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Analytics() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [segments, setSegments]     = useState<SegmentData[]>([])
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [ltv, setLtv]               = useState<LtvBucket[]>([])
  const [campaigns, setCampaigns]   = useState<CampaignData[]>([])

  // Live pulse state
  const [secondsAgo, setSecondsAgo] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Genie state
  const [question, setQuestion] = useState('')
  const [loading, setLoading]   = useState(false)
  const [results, setResults]   = useState<GenieResult[]>([])
  const chatRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(() => {
    setSecondsAgo(0)
    Promise.all([
      fetch('/api/analytics/segments').then(r => r.json()),
      fetch('/api/analytics/categories').then(r => r.json()),
      fetch('/api/analytics/ltv-buckets').then(r => r.json()),
      fetch('/api/campaigns').then(r => r.json()),
    ]).then(([s, c, l, camp]) => {
      setSegments(s.segments || [])
      setCategories(c.categories || [])
      setLtv(l.buckets || [])
      const campList: CampaignData[] = (camp.campaigns || camp || [])
      const complete = campList
        .filter((cp: CampaignData) => cp.status === 'completed' || cp.conversion_count > 0)
        .slice(0, 5)
      setCampaigns(complete.length > 0 ? complete : campList.slice(0, 5))
    })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 1-second tick, refetch every 30s
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsAgo(prev => {
        if (prev >= 29) {
          fetchData()
          return 0
        }
        return prev + 1
      })
    }, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [fetchData])

  const maxCat = Math.max(...categories.map(c => c.customer_count), 1)
  const maxLtv = Math.max(...ltv.map(b => b.count), 1)
  const maxCvr = Math.max(...campaigns.map(c => c.conversion_rate ?? 0), 1)

  const askGenie = async (q?: string) => {
    const query = (q ?? question).trim()
    if (!query || loading) return
    setLoading(true)
    setQuestion('')
    setTab(1)
    try {
      const res = await fetch('/api/genie/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      })
      const data: GenieResult = await res.json()
      setResults(prev => [...prev, data])
      setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 100)
    } catch {
      setResults(prev => [...prev, { question: query, sql: '', columns: [], rows: [], row_count: 0, summary: 'Connection error — please try again.', error: 'fetch failed' }])
    } finally {
      setLoading(false)
    }
  }

  const segmentToGenie = (segment: string) =>
    askGenie(`Show me ${segment} customers with highest churn risk, sorted by lifetime value`)
  const categoryToGenie = (category: string) =>
    askGenie(`Which ${category} customers have the highest intent score and haven't purchased in 30+ days?`)

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">Analytics</p>
          <h1 className="text-2xl font-bold text-white">BI & AI Intelligence</h1>
          <p className="text-slate-500 text-sm mt-1">Live shopper analytics · Genie natural language queries</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live pulse indicator */}
          {tab === 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 px-3 py-1.5 rounded-lg" style={{ background: '#0D1117', border: '1px solid #1E2536' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span className="text-emerald-400 font-medium">Live</span>
              <span className="text-slate-600">·</span>
              <span>Next refresh: {30 - secondsAgo}s</span>
            </div>
          )}
          <a href={`${WORKSPACE}/sql/dashboardsv3/${DASHBOARD_ID}`} target="_blank" rel="noreferrer"
            className="btn-ghost flex items-center gap-2 text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> Lakeview Dashboard
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#0D1117', border: '1px solid #1E2536' }}>
        {[{ icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Dashboard' }, { icon: <Brain className="w-3.5 h-3.5" />, label: 'Genie AI' }].map((t, i) => (
          <button key={t.label} onClick={() => setTab(i)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
            style={{ background: tab === i ? '#6366F1' : 'transparent', color: tab === i ? 'white' : '#64748B' }}>
            {t.icon}{t.label}
            {i === 1 && results.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            )}
          </button>
        ))}
      </div>

      {/* Lakeview banner — tab 0 only */}
      {tab === 0 && (
        <a
          href={`${WORKSPACE}/sql/dashboardsv3/${DASHBOARD_ID}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-5 py-4 rounded-xl cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #4338CA, #6366F1, #7C3AED)', border: '1px solid #6366F140' }}
        >
          <div>
            <p className="text-white font-semibold text-sm">Full AI/BI Dashboard available in Databricks</p>
            <p className="text-indigo-200 text-xs mt-0.5">Interactive Lakeview dashboard with drill-downs, filters, and AI insights</p>
          </div>
          <ExternalLink className="w-5 h-5 text-white shrink-0 ml-4" />
        </a>
      )}

      {/* ── Dashboard Panel ── */}
      {tab === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Segment Donut */}
            <div className="card col-span-1 flex flex-col">
              <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />Customer Segments
              </h3>
              <p className="text-xs text-slate-600 mb-4">Click a segment to query in Genie</p>
              {segments.length > 0 ? <SegmentDonut data={segments} onSegmentClick={segmentToGenie} /> : <div className="h-32 animate-pulse rounded-xl bg-slate-800/50" />}
              <div className="mt-4 flex justify-end">
                <button onClick={() => navigate('/campaigns')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
                  style={{background:'#6366F115', border:'1px solid #6366F130'}}>
                  <Megaphone className="w-3 h-3" /> Create Campaign from this segment
                </button>
              </div>
            </div>

            {/* Category Intent */}
            <div className="card col-span-2 flex flex-col">
              <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Category Intent Scores
                <span className="text-slate-600 font-normal text-xs ml-1">— live affinity signals</span>
              </h3>
              <p className="text-xs text-slate-600 mb-4">Click a category to query in Genie</p>
              <div className="space-y-0.5 flex-1">
                {categories.map((c, idx) => (
                  <HBar key={c.category} label={c.category} value={c.customer_count} max={maxCat}
                    color={`hsl(${230 + idx * 15},70%,60%)`}
                    sub={`${c.intent_score}/100`}
                    onClick={() => categoryToGenie(c.category)} />
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={() => navigate('/campaigns')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
                  style={{background:'#6366F115', border:'1px solid #6366F130'}}>
                  <Megaphone className="w-3 h-3" /> Create Campaign from this segment
                </button>
              </div>
            </div>
          </div>

          {/* LTV Distribution */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Lifetime Value Distribution
              <span className="text-slate-600 font-normal text-xs ml-1">— 10,000 shoppers</span>
            </h3>
            <div className="flex items-end gap-2 h-32">
              {ltv.map(b => {
                const pct = (b.count / maxLtv) * 100
                return (
                  <div key={b.range} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-slate-500 text-xs">{b.count >= 1000 ? `${(b.count / 1000).toFixed(1)}k` : b.count}</span>
                    <div className="w-full rounded-t-sm transition-all duration-700"
                      style={{ height: `${Math.max(pct, 4)}%`, background: 'linear-gradient(180deg,#6366F1,#8B5CF6)' }} />
                    <span className="text-slate-600 text-xs text-center leading-tight">{b.range}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => navigate('/campaigns')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
                style={{background:'#6366F115', border:'1px solid #6366F130'}}>
                <Megaphone className="w-3 h-3" /> Create Campaign from this segment
              </button>
            </div>
          </div>

          {/* Recent Campaign Performance */}
          <div className="card">
            <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />Recent Campaign Performance
              <span className="text-slate-600 font-normal text-xs ml-1">— conversion rates, last 5 campaigns</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">Full-funnel visibility from send to conversion</p>
            {campaigns.length > 0 ? (
              <div className="space-y-2">
                {campaigns.map((c, idx) => {
                  const cvr = c.conversion_rate ?? (c.sent_count > 0 ? c.conversion_count / c.sent_count : 0)
                  const pct = Math.round((cvr / Math.max(maxCvr, 0.01)) * 100)
                  const barColor = `hsl(${340 + idx * 20},70%,60%)`
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-1">
                      <span className="text-slate-400 text-xs w-36 shrink-0 truncate text-right" title={c.name}>{c.name}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ background: '#1E2536' }}>
                        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span className="text-white text-xs font-semibold w-12 shrink-0 text-right">
                        {(cvr * 100).toFixed(1)}%
                      </span>
                      <span className="text-slate-600 text-xs w-20 shrink-0 text-right">
                        {c.conversion_count.toLocaleString()} conv.
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-5 rounded animate-pulse bg-slate-800/50" />
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => navigate('/campaigns')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-indigo-300 hover:text-indigo-200 transition-colors"
                style={{background:'#6366F115', border:'1px solid #6366F130'}}>
                <Megaphone className="w-3 h-3" /> Create Campaign from this segment
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Charts computed from <code className="text-indigo-400">yousseftko_catalog.bronze</code> · updated each session
            <a href={`${WORKSPACE}/sql/dashboardsv3/${DASHBOARD_ID}`} target="_blank" rel="noreferrer"
              className="ml-auto flex items-center gap-1 hover:text-indigo-400 transition-colors">
              Full Lakeview dashboard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* ── Genie AI Panel ── */}
      {tab === 1 && (
        <div className="card p-0 overflow-hidden flex flex-col" style={{ height: '78vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60 shrink-0">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-white font-medium text-sm">Genie — Natural Language Analytics</span>
              <span className="text-xs px-2 py-0.5 rounded-full text-purple-400" style={{ background: '#8B5CF615', border: '1px solid #8B5CF630' }}>
                Claude + Unity Catalog
              </span>
            </div>
            <div className="flex items-center gap-3">
              {results.length > 0 && (
                <button onClick={() => setResults([])} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                  Clear
                </button>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Database className="w-3 h-3" />
                yousseftko_catalog · bronze
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-5">
            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#6366F120,#8B5CF220)', border: '1px solid #6366F140' }}>
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">Ask anything about your shoppers</h3>
                  <p className="text-slate-500 text-sm">Claude translates your question into SQL and queries Unity Catalog live.</p>
                </div>
                <div className="grid gap-2 w-full max-w-lg">
                  {SAMPLE_QUESTIONS.map(q => (
                    <button key={q} onClick={() => askGenie(q)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-slate-400 text-left hover:text-white transition-all group"
                      style={{ background: '#6366F108', border: '1px solid #6366F120' }}>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.map((r, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-end">
                  <div className="px-4 py-2.5 rounded-2xl rounded-br-sm text-sm text-white max-w-lg"
                    style={{ background: '#6366F1' }}>
                    {r.question}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: '#8B5CF615', border: '1px solid #8B5CF630' }}>
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{r.summary}</p>
                  </div>

                  {r.sql && (
                    <details className="ml-10">
                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400 transition-colors select-none flex items-center">
                        View generated SQL ({r.row_count} rows)
                        <CopySqlButton sql={r.sql} />
                      </summary>
                      <pre className="mt-2 p-3 rounded-lg text-xs text-indigo-300 overflow-x-auto"
                        style={{ background: '#0D1117', border: '1px solid #1E2536' }}>
                        {r.sql}
                      </pre>
                    </details>
                  )}

                  {r.columns.length > 0 && r.rows.length > 0 && !r.error && (
                    <div className="ml-10 rounded-xl overflow-hidden" style={{ border: '1px solid #1E2536' }}>
                      <div className="overflow-x-auto max-h-64">
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: '#0D1117' }}>
                              {r.columns.map(c => (
                                <th key={c} className="px-3 py-2 text-left text-slate-500 font-medium uppercase tracking-wider whitespace-nowrap">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {r.rows.map((row, ri) => (
                              <tr key={ri} className="border-t border-slate-800/50 hover:bg-indigo-500/5 transition-colors">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-3 py-2 text-slate-300 whitespace-nowrap">{cell ?? '—'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {r.error && !r.columns.length && (
                    <div className="ml-10 px-4 py-3 rounded-xl text-xs text-red-400" style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
                      {r.error}
                    </div>
                  )}

                  {!r.error && r.rows.length > 0 && (
                    <div className="ml-10">
                      <button onClick={() => navigate('/campaigns')}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-indigo-300 hover:text-white hover:bg-indigo-500/10 transition-all"
                        style={{ border: '1px solid #6366F130' }}>
                        <Megaphone className="w-3 h-3" /> Create Campaign from this insight →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: '#8B5CF615', border: '1px solid #8B5CF630' }}>
                  <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                </div>
                <span className="text-slate-500 text-sm">Translating to SQL and querying Unity Catalog…</span>
              </div>
            )}
          </div>

          {/* Suggested chips — always visible when conversation is active */}
          {results.length > 0 && (
            <div className="shrink-0 px-5 pt-3 pb-1 flex gap-2 flex-wrap" style={{ background: '#0D1117', borderTop: '1px solid #1E253640' }}>
              {SAMPLE_QUESTIONS.slice(0, 3).map(q => (
                <button key={q} onClick={() => askGenie(q)} disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:text-indigo-300 transition-colors disabled:opacity-40"
                  style={{ background: '#6366F108', border: '1px solid #6366F120' }}>
                  {q.length > 45 ? q.slice(0, 45) + '…' : q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 px-5 py-4 border-t border-slate-800/60" style={{ background: '#0D1117' }}>
            <form onSubmit={e => { e.preventDefault(); askGenie() }} className="flex items-center gap-3">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask a question about your shoppers…"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                disabled={loading}
              />
              <button type="submit" disabled={!question.trim() || loading}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: '#6366F1' }}>
                {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
