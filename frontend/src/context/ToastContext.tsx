import { createContext, useCallback, useContext, useState } from 'react'

interface Toast {
  id: number
  message: string
  type: 'error' | 'success'
}

interface ToastContextValue {
  toastError: (message: string) => void
  toastSuccess: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((message: string, type: 'error' | 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const toastError = useCallback((message: string) => add(message, 'error'), [add])
  const toastSuccess = useCallback((message: string) => add(message, 'success'), [add])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toastError, toastSuccess }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{t.type === 'error' ? '✕' : '✓'}</span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-dismiss" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
