import { useEffect, useState } from 'react'
import {
  dismissToast,
  subscribeToToasts,
  type ToastMessage,
} from '@/lib/ui/toastBus'
import '@/styles/toast.css'

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => subscribeToToasts(setToasts), [])

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
          onClick={() => dismissToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
