import { type ReactNode, useCallback } from 'react'
import { ToastContainer } from '@/components/ToastContainer'
import { showToast as emitToast, type ToastType } from '@/lib/ui/toastBus'

export type { ToastType }

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

export function showToast(toast: { type: ToastType; message: string }): void {
  emitToast(toast)
}

export function useToast() {
  const showToastCallback = useCallback(
    (toast: { type: ToastType; message: string }) => {
      emitToast(toast)
    },
    [],
  )

  return { showToast: showToastCallback }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  )
}
