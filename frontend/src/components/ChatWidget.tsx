import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Send } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  cached?: boolean
}

interface Props {
  customerId?: string
  customerData?: Record<string, unknown>
}

const WELCOME = "I'm your personal STRYDE stylist. Tell me what you're looking for — I know your taste and can offer exclusive deals."

// Regex to find promo codes like CHAT1234, DENIM25, SAVE20, VIP15
const PROMO_RE = /\b(CHAT\d{4})\b/g
// Broader promo detection for event dispatch (e.g. DENIM25, SAVE20, VIP15)
const PROMO_DISPATCH_RE = /\b([A-Z]{2,10}\d{1,2})\b/g

// Extract customer ID from a URL pathname like /customers/CUST_000042
function extractCustomerFromPath(pathname: string): string | null {
  const match = pathname.match(/\/customers\/(CUST_[A-Z0-9]+)/i)
  return match ? match[1] : null
}

function renderWithPromo(text: string) {
  const parts = text.split(PROMO_RE)
  return parts.map((part, i) => {
    if (PROMO_RE.test(part)) {
      PROMO_RE.lastIndex = 0
      return (
        <span
          key={i}
          className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff' }}
        >
          {part}
        </span>
      )
    }
    PROMO_RE.lastIndex = 0
    return <span key={i}>{part}</span>
  })
}

export default function ChatWidget({ customerId, customerData }: Props) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(false)

  // Detect customer from URL first, then prop, then localStorage, then fallback
  const urlCustomerId = extractCustomerFromPath(location.pathname)
  const effectiveCustomerId =
    urlCustomerId ||
    customerId ||
    (typeof window !== 'undefined' ? localStorage.getItem('stryde_customer_id') : null) ||
    'CUST_000042'

  // Reset conversation when the detected customer changes (URL navigation)
  useEffect(() => {
    if (!initialized) return
    const customerName = customerData?.name as string | undefined
    const greeting = customerName
      ? `I see you're viewing ${customerName}. How can I help with this customer's profile?`
      : `I see you're viewing ${effectiveCustomerId}. How can I help with this customer's profile?`
    setMessages([{ role: 'assistant', content: greeting }])
  }, [location.pathname])

  // Reset messages when the active customer changes (e.g. ShopperPortal customer selector)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setMessages([{ role: 'assistant', content: `Hi! I'm your STRYDE stylist. I can see you're browsing as a new customer. What can I help you find today?` }])
    setInitialized(true)
  }, [effectiveCustomerId])

  // Show welcome message on first open
  useEffect(() => {
    if (open && !initialized) {
      setMessages([{ role: 'assistant', content: WELCOME }])
      setInitialized(true)
    }
  }, [open, initialized])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)

    // Build a timeout-aware fetch (8 second limit)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: effectiveCustomerId,
          messages: next,
          customer_data: customerData || {},
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      // Dispatch promo event if the response contains a promo code
      PROMO_DISPATCH_RE.lastIndex = 0
      const promoMatch = PROMO_DISPATCH_RE.exec(data.reply)
      if (promoMatch) {
        const code = promoMatch[1]
        const digits = code.match(/\d+$/)
        const pct = digits ? parseInt(digits[0], 10) : 15
        window.dispatchEvent(new CustomEvent('stryde:promo', { detail: { code, pct } }))
      }
    } catch {
      clearTimeout(timeoutId)
      // Derive a fallback tip from the customer's top category
      const topCat =
        (customerData?.favorite_categories as string | undefined)?.split('|')[0] ||
        (customerData?.top_category as string | undefined) ||
        'your favourite categories'
      const fallbackText = `I'm having trouble connecting right now. Using a cached response: Check out our latest ${topCat} arrivals — members often unlock exclusive discounts on top picks in this category.`
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: fallbackText, cached: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
          aria-label="Open chat assistant"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 380,
            height: 500,
            background: '#0D0F1A',
            border: '1px solid #1E2536',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
          >
            <div>
              <p className="text-white font-semibold text-sm tracking-wide">STRYDE Assistant</p>
              <p className="text-indigo-200 text-[10px] tracking-wider">Claude claude-sonnet-4-5</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className="max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff' }
                      : { background: '#1A1F30', color: '#CBD5E1' }
                  }
                >
                  {msg.role === 'assistant' ? renderWithPromo(msg.content) : msg.content}
                </div>
                {msg.cached && (
                  <span
                    className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                    style={{ background: '#78350F', color: '#FCD34D' }}
                  >
                    Using cached data
                  </span>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-xl flex items-center gap-1"
                  style={{ background: '#1A1F30' }}
                >
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-500"
                      style={{
                        animation: 'bounce 1s infinite',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
            style={{ borderTop: '1px solid #1E2536' }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about products, styles, deals..."
              className="flex-1 bg-transparent text-slate-300 text-sm placeholder-slate-600 outline-none"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  )
}
