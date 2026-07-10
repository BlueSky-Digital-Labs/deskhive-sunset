import { clsx } from 'clsx'
import './AvailabilityBadge.css'

interface AvailabilityBadgeProps {
  available: boolean
  className?: string
}

export function AvailabilityBadge({ available, className }: AvailabilityBadgeProps) {
  return (
    <span
      className={clsx(
        'availability-badge',
        available ? 'availability-badge--available' : 'availability-badge--occupied',
        className,
      )}
    >
      {available ? 'Available' : 'Occupied'}
    </span>
  )
}

export default AvailabilityBadge
