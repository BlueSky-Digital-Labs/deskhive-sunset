import { ReactNode } from 'react'
import { Button } from '@components/atoms/Button'
import './ConfirmDialog.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="confirm-dialog__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface AdminStatusBadgeProps {
  active: boolean
}

export function AdminStatusBadge({ active }: AdminStatusBadgeProps) {
  return (
    <span
      className={`admin-status-badge ${
        active ? 'admin-status-badge--active' : 'admin-status-badge--inactive'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

interface AdminErrorStateProps {
  message: string
  action?: ReactNode
}

export function AdminErrorState({ message, action }: AdminErrorStateProps) {
  return (
    <div className="admin-error" role="alert">
      <p>{message}</p>
      {action}
    </div>
  )
}
