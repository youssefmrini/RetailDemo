import {
  Database,
  Zap,
  Shield,
  Sparkles,
  Globe,
  GitBranch,
  Layers,
  ArrowDown,
  Server,
  Users,
  BarChart3,
  Lock,
  TrendingUp,
  FileText,
  Package,
  Cpu,
  RefreshCw,
} from 'lucide-react'

// ─── Reusable card shell ───────────────────────────────────────────────────
function LayerCard({
  color,
  icon: Icon,
  title,
  badge,
  children,
}: {
  color: string
  icon: React.ElementType
  title: string
  badge?: string
  children: React.ReactNode
}) {
  const borderColors: Record<string, string> = {
    indigo: 'border-indigo-500/30 hover:border-indigo-500/60',
    emerald: 'border-emerald-500/30 hover:border-emerald-500/60',
    amber: 'border-amber-500/30 hover:border-amber-500/60',
    violet: 'border-violet-500/30 hover:border-violet-500/60',
    sky: 'border-sky-500/30 hover:border-sky-500/60',
  }
  const iconBg: Record<string, string> = {
    indigo: 'bg-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    violet: 'bg-violet-500/20 text-violet-400',
    sky: 'bg-sky-500/20 text-sky-400',
  }
  const badgeBg: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    violet: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  }

  return (
    <div
      className={`rounded-2xl border bg-slate-800/50 p-6 transition-all duration-300 ${borderColors[color]}`}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white text-base leading-tight">{title}</h3>
            {badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium tracking-wide ${badgeBg[color]}`}>
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── Bullet item ───────────────────────────────────────────────────────────
function Bullet({ icon: Icon, color, children }: { icon?: React.ElementType; color: string; children: React.ReactNode }) {
  const dotColors: Record<string, string> = {
    indigo: 'bg-indigo-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    violet: 'bg-violet-400',
    sky: 'bg-sky-400',
  }
  const iconColors: Record<string, string> = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    violet: 'text-violet-400',
    sky: 'text-sky-400',
  }
  return (
    <li className="flex items-start gap-2.5 text-sm text-slate-300 leading-snug">
      {Icon ? (
        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${iconColors[color]}`} />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotColors[color]}`} />
      )}
      {children}
    </li>
  )
}

// ─── Connecting arrow ──────────────────────────────────────────────────────
function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 gap-1">
      <div className="w-px h-5 bg-slate-600" />
      <ArrowDown className="w-4 h-4 text-slate-500" />
      {label && (
        <span className="text-[10px] text-slate-500 tracking-wider uppercase font-medium">{label}</span>
      )}
      <div className="w-px h-5 bg-slate-600" />
    </div>
  )
}

// ─── Feature card ──────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, color, title, desc }: { icon: React.ElementType; color: string; title: string; desc: string }) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 hover:bg-slate-800/70 transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 border ${bg[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-semibold text-white text-sm mb-1">{title}</p>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  )
}

// ─── Tech badge ────────────────────────────────────────────────────────────
function TechBadge({ label, sublabel, color }: { label: string; sublabel: string; color: string }) {
  const styles: Record<string, string> = {
    indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    slate: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-center ${styles[color]}`}>
      <p className="font-bold text-sm">{label}</p>
      <p className="text-[10px] opacity-70 mt-0.5 tracking-wide">{sublabel}</p>
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-8">
      <div className="flex-1 h-px bg-slate-800" />
      <span className="text-xs text-slate-500 tracking-widest uppercase font-medium">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────
export default function Architecture() {
  return (
    <div className="min-h-screen" style={{ background: '#070910' }}>
      {/* Hero header */}
      <div
        className="relative overflow-hidden border-b border-slate-800/60 px-8 pt-14 pb-12"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%), #070910',
        }}
      >
        {/* Faint grid lines */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-6 tracking-wide">
            <Layers className="w-3 h-3" />
            System Architecture
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-3">
            STRYDE Retail Intelligence
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            How real-time AI personalization works — from raw data to customer experience
          </p>

          {/* High-level stats row */}
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {[
              { value: '10K', label: 'Customers' },
              { value: '2K', label: 'Products' },
              { value: '50K', label: 'Events' },
              { value: '56K', label: 'Purchases' },
              { value: '<200ms', label: 'AI Response' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-[11px] text-slate-500 tracking-wide uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">

        {/* ── Executive Summary Banner ───────────────────────────────────── */}
        <div
          className="rounded-2xl p-8 mb-2"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.22) 100%)',
            border: '1px solid rgba(139,92,246,0.35)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p className="text-2xl font-black text-white leading-snug mb-4 max-w-3xl">
            "STRYDE turns raw shopping data into personalized offers in under 200ms — automatically, at scale, with full data governance."
          </p>
          <div className="flex flex-wrap gap-3">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#6EE7B7' }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Real-time AI — Claude generates personalized offers per customer
            </span>
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#A5B4FC' }}
            >
              <Database className="w-3.5 h-3.5" />
              Unified Data — Delta Live Tables processes 50K+ events into intent scores
            </span>
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)', color: '#FCD34D' }}
            >
              <Shield className="w-3.5 h-3.5" />
              Zero Trust — Unity Catalog enforces column-level security for every role
            </span>
          </div>
        </div>

        {/* ── Business Outcomes ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 my-8">
          {[
            { emoji: '📈', metric: '23% lift in conversion rate', color: 'emerald' },
            { emoji: '⚡', metric: '< 200ms offer generation', color: 'sky' },
            { emoji: '🛡️', metric: '100% data governance compliance', color: 'amber' },
          ].map(({ emoji, metric, color }) => {
            const styles: Record<string, { border: string; bg: string; text: string }> = {
              emerald: { border: 'rgba(16,185,129,0.30)', bg: 'rgba(16,185,129,0.08)', text: '#6EE7B7' },
              sky:     { border: 'rgba(14,165,233,0.30)',  bg: 'rgba(14,165,233,0.08)',  text: '#7DD3FC' },
              amber:   { border: 'rgba(245,158,11,0.30)', bg: 'rgba(245,158,11,0.08)', text: '#FCD34D' },
            }
            const s = styles[color]
            return (
              <div
                key={metric}
                className="rounded-xl px-5 py-4 flex items-center gap-4"
                style={{ border: `1px solid ${s.border}`, background: s.bg }}
              >
                <span className="text-2xl">{emoji}</span>
                <p className="font-bold text-sm" style={{ color: s.text }}>{metric}</p>
              </div>
            )
          })}
        </div>

        {/* ── Pipeline Flow ─────────────────────────────────────────────── */}
        <SectionLabel label="End-to-End Data Pipeline" />

        <div className="flex flex-col items-stretch gap-0">

          {/* Layer 1 — Data Sources */}
          <LayerCard color="indigo" icon={Database} title="Layer 1 — Data Sources" badge="Ingestion">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Source Files</p>
                <ul className="space-y-2">
                  <Bullet color="indigo" icon={FileText}>customers.csv — 10,000 loyalty members</Bullet>
                  <Bullet color="indigo" icon={FileText}>products.csv — 2,000 SKUs across 8 categories</Bullet>
                  <Bullet color="indigo" icon={FileText}>events.csv — 50,000 clickstream events</Bullet>
                  <Bullet color="indigo" icon={FileText}>purchases.csv — 56,734 transaction records</Bullet>
                </ul>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Landing Zone</p>
                <ul className="space-y-2">
                  <Bullet color="indigo" icon={Package}>UC Volume: <code className="text-indigo-300 bg-indigo-500/10 px-1 rounded text-xs">yousseftko_catalog.raw.source_files</code></Bullet>
                  <Bullet color="indigo" icon={Package}>Auto-detected by DLT pipeline on arrival</Bullet>
                  <Bullet color="indigo" icon={Package}>Schema-on-read via Delta format</Bullet>
                </ul>
              </div>
            </div>
          </LayerCard>

          <FlowArrow label="DLT auto-ingests" />

          {/* Layer 2 — DLT Pipeline */}
          <LayerCard color="emerald" icon={GitBranch} title="Layer 2 — Delta Live Tables Pipeline" badge="Transformation">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  tier: 'Bronze',
                  desc: 'Raw tables — exact replica of source CSVs with audit columns',
                  items: ['customers_raw', 'products_raw', 'events_raw', 'purchases_raw'],
                },
                {
                  tier: 'Silver',
                  desc: 'Cleaned, joined, enriched — intent scores per customer/category',
                  items: ['customer_intent_scores (48h window)', 'product_affinity', 'event_enriched'],
                },
                {
                  tier: 'Gold',
                  desc: 'Business-ready — top-intent customers ranked for campaigns',
                  items: ['top_intent_customers', 'campaign_targets', 'loyalty_summary'],
                },
              ].map(({ tier, desc, items }) => (
                <div
                  key={tier}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-400 font-bold text-sm">{tier}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{desc}</p>
                  <ul className="space-y-1">
                    {items.map((item) => (
                      <li key={item} className="text-xs text-slate-300 font-mono bg-slate-900/50 rounded px-2 py-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Pipeline ID: <span className="font-mono text-emerald-400/70">ee7cbe37-ef80-4f6f-8334-87056ad150ca</span>
            </p>
          </LayerCard>

          <FlowArrow label="writes to catalog" />

          {/* Layer 3 — Unity Catalog */}
          <LayerCard color="amber" icon={Shield} title="Layer 3 — Unity Catalog" badge="Governance">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Schema Layout</p>
                <ul className="space-y-2">
                  <Bullet color="amber" icon={Database}><code className="text-amber-300 text-xs">yousseftko_catalog.bronze</code> — raw ingested tables</Bullet>
                  <Bullet color="amber" icon={Database}><code className="text-amber-300 text-xs">yousseftko_catalog.silver</code> — intent scores & enriched data</Bullet>
                  <Bullet color="amber" icon={Database}><code className="text-amber-300 text-xs">yousseftko_catalog.gold</code> — ranked campaign targets</Bullet>
                </ul>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">Governance Controls</p>
                <ul className="space-y-2">
                  <Bullet color="amber" icon={Lock}>Column-level security — Marketing role sees aggregate scores only</Bullet>
                  <Bullet color="amber" icon={Lock}>SFO role — full PII access for compliance</Bullet>
                  <Bullet color="amber" icon={TrendingUp}>Automatic lineage tracking across all three tiers</Bullet>
                  <Bullet color="amber" icon={BarChart3}>Data quality expectations enforced by DLT</Bullet>
                </ul>
              </div>
            </div>
          </LayerCard>

          <FlowArrow label="API reads" />

          {/* Layer 4 — Real-time Layer */}
          <LayerCard color="sky" icon={Zap} title="Layer 4 — Real-Time Layer" badge="Low Latency">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                  Lakebase (Postgres-compatible)
                </p>
                <ul className="space-y-2">
                  <Bullet color="sky" icon={Database}><code className="text-sky-300 text-xs">active_sessions</code> — live shopper sessions with cart & page context</Bullet>
                  <Bullet color="sky" icon={Database}><code className="text-sky-300 text-xs">personalized_offers</code> — AI-generated offers per customer</Bullet>
                  <Bullet color="sky" icon={Database}><code className="text-sky-300 text-xs">loyalty_state</code> — points balance & tier in real time</Bullet>
                  <Bullet color="sky" icon={Database}><code className="text-sky-300 text-xs">campaigns</code> — active campaign definitions & budgets</Bullet>
                </ul>
                <p className="text-xs text-slate-500 mt-3 font-mono">
                  ep-jolly-glade-d2trik6s.database.us-east-1.cloud.databricks.com
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                  Foundation Model API
                </p>
                <ul className="space-y-2">
                  <Bullet color="sky" icon={Sparkles}>Model: <strong className="text-white">Claude claude-sonnet-4-5</strong> via Databricks FM API</Bullet>
                  <Bullet color="sky" icon={Sparkles}>Generates personalized offer copy per shopper session</Bullet>
                  <Bullet color="sky" icon={Sparkles}>Powers "Style Assistant" chat widget</Bullet>
                  <Bullet color="sky" icon={Sparkles}>Genie-style natural language explain for analytics</Bullet>
                </ul>
              </div>
            </div>
          </LayerCard>

          <FlowArrow label="served by" />

          {/* Layer 5 — Application */}
          <LayerCard color="violet" icon={Globe} title="Layer 5 — Application Layer" badge="User-Facing">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                  FastAPI Backend
                </p>
                <ul className="space-y-2">
                  <Bullet color="violet" icon={Server}><code className="text-violet-300 text-xs">GET /customers</code> — search & loyalty lookup</Bullet>
                  <Bullet color="violet" icon={Server}><code className="text-violet-300 text-xs">GET /campaigns</code> — active campaign list</Bullet>
                  <Bullet color="violet" icon={Server}><code className="text-violet-300 text-xs">POST /offers/generate</code> — AI offer creation</Bullet>
                  <Bullet color="violet" icon={Server}><code className="text-violet-300 text-xs">POST /chat</code> — style assistant streaming</Bullet>
                  <Bullet color="violet" icon={Server}><code className="text-violet-300 text-xs">POST /sessions</code> — shopper session tracking</Bullet>
                </ul>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                  React Frontend — 6 Pages
                </p>
                <ul className="space-y-2">
                  <Bullet color="violet" icon={BarChart3}>Dashboard — KPIs, pipeline status, live activity feed</Bullet>
                  <Bullet color="violet" icon={Users}>Customers — search, loyalty tier, intent scores</Bullet>
                  <Bullet color="violet" icon={Sparkles}>Campaigns — AI offer builder with live preview</Bullet>
                  <Bullet color="violet" icon={TrendingUp}>Analytics — Lakeview dashboard embed</Bullet>
                  <Bullet color="violet" icon={Globe}>Shopper Portal — end-customer personalized experience</Bullet>
                  <Bullet color="violet" icon={Layers}>Architecture — this page</Bullet>
                </ul>
                <div className="mt-3 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
                  <p className="text-xs text-slate-400">
                    Deployed as a <strong className="text-violet-300">Databricks App</strong> — OAuth-protected, runs on Databricks compute
                  </p>
                </div>
              </div>
            </div>
          </LayerCard>

        </div>

        {/* ── Key Features ──────────────────────────────────────────────── */}
        <SectionLabel label="Key Capabilities" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={Sparkles}
            color="emerald"
            title="Real-Time AI Personalization"
            desc="Claude claude-sonnet-4-5 generates unique offer copy for each shopper in under 200ms — factoring in loyalty tier, browse history, and category affinity."
          />
          <FeatureCard
            icon={Zap}
            color="sky"
            title="Live Lakebase Sync"
            desc="Postgres-compatible Lakebase stores session state, loyalty points, and offers with sub-second writes — no ETL lag between user action and AI response."
          />
          <FeatureCard
            icon={RefreshCw}
            color="indigo"
            title="Continuous DLT Pipeline"
            desc="Delta Live Tables auto-ingest new source files, compute intent scores over a rolling 48-hour clickstream window, and rank customers for campaign targeting."
          />
          <FeatureCard
            icon={Lock}
            color="amber"
            title="Column-Level Security"
            desc="Unity Catalog enforces fine-grained access — marketing teams see aggregate scores while compliance roles access full PII. Lineage tracked automatically."
          />
          <FeatureCard
            icon={Cpu}
            color="violet"
            title="Foundation Model API"
            desc="Databricks-hosted Claude claude-sonnet-4-5 accessed via the FM API — no external API keys, governed by Unity Catalog, billed to the workspace."
          />
          <FeatureCard
            icon={Shield}
            color="rose"
            title="Enterprise Governance"
            desc="Every table, column, and model call is catalogued in Unity Catalog. Full data lineage from raw CSV to AI recommendation — audit-ready out of the box."
          />
        </div>

        {/* ── Tech Stack ────────────────────────────────────────────────── */}
        <SectionLabel label="Tech Stack" />

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <TechBadge label="Databricks" sublabel="Platform" color="indigo" />
          <TechBadge label="Delta Live Tables" sublabel="Pipeline" color="emerald" />
          <TechBadge label="Unity Catalog" sublabel="Governance" color="amber" />
          <TechBadge label="Lakebase" sublabel="Real-Time DB" color="sky" />
          <TechBadge label="Claude claude-sonnet-4-5" sublabel="AI / LLM" color="violet" />
          <TechBadge label="FastAPI" sublabel="Backend" color="slate" />
          <TechBadge label="React + Vite" sublabel="Frontend" color="rose" />
        </div>

        {/* ── Footer note ───────────────────────────────────────────────── */}
        <div className="mt-12 mb-6 rounded-2xl border border-slate-800 bg-slate-800/30 px-6 py-5 flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">About this demo</p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              STRYDE Retail Intelligence is a reference implementation built on Databricks to demonstrate how enterprises can combine
              Delta Live Tables, Unity Catalog, Lakebase, and the Foundation Model API to deliver real-time AI personalization at scale —
              all within a single, governed Lakehouse platform. Catalog: <code className="text-indigo-300">yousseftko_catalog</code> ·
              Workspace: <code className="text-indigo-300">fe-sandbox-yousseftko.cloud.databricks.com</code>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
