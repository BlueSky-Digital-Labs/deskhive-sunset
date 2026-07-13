import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import './toast.css'

export type ToastType = 'success' | 'error'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (toast: { type: ToastType; message: string }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((current) => [...current, { id, type, message }])

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4000)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}
