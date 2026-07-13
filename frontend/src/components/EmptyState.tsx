import '@/styles/empty.css'

interface EmptyStateProps {
  title?: string
  message: string
}

export function EmptyState({ title = 'Nothing here yet', message }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__message">{message}</p>
    </div>
  )
}

export default EmptyState
