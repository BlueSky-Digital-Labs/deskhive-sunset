import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Inbox from '@mui/icons-material/Inbox'
import '@/styles/empty.css'

interface EmptyStateProps {
  title?: string
  message: string
}

export function EmptyState({ title = 'Nothing here yet', message }: EmptyStateProps) {
  return (
    <Paper className="empty-state" elevation={1} role="status">
      <span className="empty-state__icon" aria-hidden="true">
        <Inbox fontSize="large" />
      </span>
      <Typography variant="h6" component="h2" className="empty-state__title">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" className="empty-state__message">
        {message}
      </Typography>
    </Paper>
  )
}

export default EmptyState
