import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage { id: number; message: string; type: ToastType }

let _addToast: ((msg: string, type: ToastType) => void) | null = null

export function toast(message: string, type: ToastType = 'info') {
  _addToast?.(message, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    let id = 0
    _addToast = (message, type) => {
      const tid = ++id
      setToasts(t => [...t, { id: tid, message, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== tid)), 3500)
    }
    return () => { _addToast = null }
  }, [])

  const ICONS = { success: <CheckCircle className="w-4 h-4 text-emerald-400" />, error: <AlertCircle className="w-4 h-4 text-red-400" />, info: <Info className="w-4 h-4 text-indigo-400" /> }
  const BORDER = { success: 'border-emerald-500/30', error: 'border-red-500/30', info: 'border-indigo-500/30' }

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${BORDER[t.type]} animate-fade-in flex items-center gap-3 min-w-72`}>
          {ICONS[t.type]}
          <span className="flex-1 text-slate-200">{t.message}</span>
          <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
            <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
          </button>
        </div>
      ))}
    </div>
  )
}
