export type ToastType = 'success' | 'error'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

type ToastListener = (toasts: ToastMessage[]) => void

const AUTO_DISMISS_MS = 4000

let toasts: ToastMessage[] = []
const listeners = new Set<ToastListener>()
const dismissTimers = new Map<string, number>()

function emit(): void {
  const snapshot = [...toasts]
  listeners.forEach((listener) => listener(snapshot))
}

export function subscribeToToasts(listener: ToastListener): () => void {
  listeners.add(listener)
  listener([...toasts])

  return () => {
    listeners.delete(listener)
  }
}

export function dismissToast(id: string): void {
  const timer = dismissTimers.get(id)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    dismissTimers.delete(id)
  }

  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

export function showToast(toast: { type: ToastType; message: string }): void {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  toasts = [...toasts, { id, type: toast.type, message: toast.message }]
  emit()

  const timer = window.setTimeout(() => {
    dismissToast(id)
  }, AUTO_DISMISS_MS)

  dismissTimers.set(id, timer)
}

export function clearToasts(): void {
  dismissTimers.forEach((timer) => window.clearTimeout(timer))
  dismissTimers.clear()
  toasts = []
  emit()
}
