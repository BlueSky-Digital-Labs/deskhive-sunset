import { formatStatusLabel } from '@/features/bookings/utils'

interface BookingStatusBadgeProps {
  status: string
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  return (
    <span className={`my-bookings-status my-bookings-status--${status}`}>
      {formatStatusLabel(status)}
    </span>
  )
}
