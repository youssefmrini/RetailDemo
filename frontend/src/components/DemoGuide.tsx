import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, X, Zap, Database, ArrowRight } from 'lucide-react'

interface PageGuide {
  title: string
  talking_points: string[]
  key_stat: string
  tech: string[]
  next_step: { label: string; to: string }
}

const GUIDES: Record<string, PageGuide> = {
  '/': {
    title: 'Dashboard',
    talking_points: [
      '"This is our real-time loyalty command center — pulling live data from 10,000 shoppers via DLT pipelines into Unity Catalog."',
      '"The Live Signal Feed shows events happening right now — browse sessions, intent scores, offer pushes — all flowing through Lakebase."',
      '"Notice the Business Impact numbers: $147K recovered, 312 VIPs retained. This is what happens when AI acts on signals before churn hits."',
      '"The Opportunity cards are AI-generated prioritizations. We\'re not waiting for the weekly report — we\'re acting in minutes."',
    ],
    key_stat: '$147,230 estimated revenue recovered this week from AI-driven offers',
    tech: ['DLT streaming pipelines', 'Unity Catalog Delta tables', 'Lakebase real-time state'],
    next_step: { label: 'Explore a customer →', to: '/customers' },
  },
  '/customers': {
    title: 'Customer Intelligence',
    talking_points: [
      '"10,000 customer profiles — all live from Unity Catalog Delta tables. Zero data movement."',
      '"The Demo Spotlight shows three customers I\'d recommend for this demo: Alex Chen is perfect for the churn prevention story."',
      '"Every row you see is computed in real-time — churn score from our ML model, LTV from aggregated purchases, days silent from event logs."',
      '"Click Alex Chen. I want to show you what happens when AI intercepts a customer about to leave."',
    ],
    key_stat: '72% churn risk on Alex Chen — AI can cut that to under 60% in seconds',
    tech: ['Unity Catalog bronze/silver tables', 'Churn scoring model', 'Real-time Delta queries'],
    next_step: { label: 'Open Alex Chen →', to: '/customers/CUST_000042' },
  },
  '/campaigns': {
    title: 'Campaign Builder',
    talking_points: [
      '"Every field here triggers a live Unity Catalog query — the reach estimate you see is real data, not a mock."',
      '"The predicted revenue below the reach estimate uses our measured 3.4% CVR and $62 average order value."',
      '"Notice the Claude Sonnet copy generation — it personalizes the message based on the segment\'s behavior patterns."',
      '"The campaign history shows live CVR vs baseline. Our AI campaigns are running 4x above baseline today."',
    ],
    key_stat: 'AI campaigns converting at 3.4% vs 0.8% baseline — 4.25x lift',
    tech: ['Unity Catalog live queries', 'Claude Sonnet 4.5 copy gen', 'Lakebase campaign state'],
    next_step: { label: 'See the analytics →', to: '/analytics' },
  },
  '/analytics': {
    title: 'Analytics & Genie AI',
    talking_points: [
      '"The charts are computed directly from yousseftko_catalog.bronze — same tables your data engineers maintain."',
      '"Switch to Genie AI and ask a natural language question. Claude translates it to SQL and queries Unity Catalog live."',
      '"Try: \'Which 10 customers have the highest churn risk and what\'s their LTV?\' — watch the SQL it generates."',
      '"After any Genie result, you can create a campaign targeting that exact segment with one click."',
    ],
    key_stat: 'Genie translates NL → SQL → Delta results in under 3 seconds',
    tech: ['Lakeview AI/BI dashboard', 'Claude NL-to-SQL', 'Unity Catalog bronze tables'],
    next_step: { label: 'See it live in Shopper Portal →', to: '/portal' },
  },
  '/portal': {
    title: 'Shopper Portal',
    talking_points: [
      '"This is the customer\'s view — what they\'d see on the STRYDE mobile app or website."',
      '"Switch to Alex Chen. If a marketing manager generated an offer for him, it appears here as an Active Offer — pulled from Lakebase in real time."',
      '"Click \'Generate Offer\' on Alex Chen\'s profile in the other tab — then come back here and the offer appears instantly. That\'s Lakebase."',
      '"The loyalty bar, points, and LTV all update live as purchases happen. The state persists across sessions via Postgres on Lakebase."',
    ],
    key_stat: 'Offer-to-display latency: <200ms from Claude generation to Lakebase to portal',
    tech: ['Lakebase Postgres real-time state', 'Claude Sonnet offer generation', 'Custom event bus'],
    next_step: { label: 'Back to Dashboard →', to: '/' },
  },
  '/customers/:id': {
    title: 'Customer Profile',
    talking_points: [
      '"This profile is assembled in real-time from three sources: Unity Catalog for history, Lakebase for session state, and Claude for offer intelligence."',
      '"Select a category and hit Generate Offer. Claude reads the customer\'s churn score, LTV, and favorite categories — and writes a personalized offer in under a second."',
      '"Watch the churn score drop after generating the offer. That\'s our model simulating the impact of a well-timed intervention."',
      '"Scroll to the Unity Catalog Governance panel. Switch between Marketing and SFO views — the column masking enforced by Unity Catalog policies, not application code."',
    ],
    key_stat: 'Offer generated in <800ms · Churn score reduced 8-15% per intervention',
    tech: ['Claude Sonnet 4.5 (offer generation)', 'Unity Catalog column masking', 'Lakebase offer persistence'],
    next_step: { label: 'Launch a campaign →', to: '/campaigns' },
  },
}

function getGuide(pathname: string): PageGuide {
  if (pathname.startsWith('/customers/') && pathname !== '/customers') {
    return GUIDES['/customers/:id']
  }
  return GUIDES[pathname] ?? GUIDES['/']
}

export default function DemoGuide() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const guide = getGuide(location.pathname)

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white', boxShadow: '0 4px 24px #6366F140' }}>
        <BookOpen className="w-4 h-4" />
        Demo Script
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-96 h-full flex flex-col overflow-hidden"
            style={{ background: '#0A0C14', borderLeft: '1px solid #1E2536' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366F112,#8B5CF212)' }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white text-sm">Demo Playbook</span>
                <span className="text-xs px-2 py-0.5 rounded-full text-indigo-300 font-semibold"
                  style={{ background: '#6366F115', border: '1px solid #6366F130' }}>
                  {guide.title}
                </span>
              </div>
              <button onClick={() => setOpen(false)}
                className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Talking points */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Say This</p>
                <div className="space-y-3">
                  {guide.talking_points.map((point, i) => (
                    <div key={i} className="flex gap-3 rounded-xl p-3"
                      style={{ background: '#6366F108', border: '1px solid #6366F118' }}>
                      <span className="text-xs font-bold text-indigo-500 w-4 shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-slate-300 text-xs leading-relaxed italic">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key stat */}
              <div className="rounded-xl px-4 py-3"
                style={{ background: '#10B98110', border: '1px solid #10B98128' }}>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Key stat to anchor on
                </p>
                <p className="text-white text-sm font-semibold leading-snug">{guide.key_stat}</p>
              </div>

              {/* Tech stack */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Database className="w-3 h-3" /> Databricks tech behind this
                </p>
                <div className="flex flex-wrap gap-2">
                  {guide.tech.map(t => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-lg text-indigo-300"
                      style={{ background: '#6366F115', border: '1px solid #6366F130' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Next step CTA */}
            <div className="px-5 py-4 border-t border-slate-800/60 shrink-0">
              <button
                onClick={() => { navigate(guide.next_step.to); setOpen(false) }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: 'white' }}>
                <ArrowRight className="w-4 h-4" />
                {guide.next_step.label}
              </button>
              <p className="text-center text-xs text-slate-700 mt-2">Press Esc or click outside to close</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
