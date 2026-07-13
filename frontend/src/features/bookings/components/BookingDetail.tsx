import { Button } from '@components/atoms/Button'
import type { MyBooking } from '@/lib/apiClient'
import { isCancellableBooking } from '@/features/myBookings/myBookingsSlice'
import { isCheckInEligible } from '@/features/bookings/utils'
import { useCheckIn } from '@/features/bookings/hooks/useCheckIn'
import { BookingStatusBadge } from '@/features/bookings/components/BookingStatusBadge'

interface BookingDetailProps {
  booking: MyBooking
  onCancel?: (bookingId: string) => void
  cancelState?: 'idle' | 'pending' | 'succeeded' | 'failed'
  cancelError?: string
}

function formatBookingSchedule(booking: MyBooking): string {
  if (booking.resource_type === 'room' && booking.start_at && booking.end_at) {
    const start = new Date(booking.start_at)
    const end = new Date(booking.end_at)
    return `${start.toLocaleString()} – ${end.toLocaleTimeString()}`
  }

  return new Date(booking.date).toLocaleDateString()
}

export function BookingDetail({
  booking,
  onCancel,
  cancelState = 'idle',
  cancelError,
}: BookingDetailProps) {
  const { checkIn, checkingInById } = useCheckIn()
  const checkInState = checkingInById[booking.id] ?? 'idle'
  const showCancel = isCancellableBooking(booking)
  const showCheckIn = isCheckInEligible(booking)

  return (
    <section className="my-bookings-item" aria-label="Booking detail">
      <div className="my-bookings-item__main">
        <div>
          <h2 className="my-bookings-item__title">
            {booking.resource_label ??
              `${booking.resource_type} #${booking.resource_id}`}
          </h2>
          <p className="my-bookings-item__meta">{formatBookingSchedule(booking)}</p>
          {cancelError && (
            <p className="my-bookings-item__meta" role="alert">
              {cancelError}
            </p>
          )}
        </div>
      </div>

      <div className="my-bookings-item__actions">
        <BookingStatusBadge status={booking.status} />
        {showCheckIn && (
          <Button
            size="sm"
            onClick={() => void checkIn(booking.id)}
            disabled={checkInState === 'pending'}
            isLoading={checkInState === 'pending'}
          >
            Check in
          </Button>
        )}
        {showCancel && onCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(booking.id)}
            disabled={cancelState === 'pending'}
            isLoading={cancelState === 'pending'}
          >
            {cancelState === 'failed' ? 'Retry cancel' : 'Cancel'}
          </Button>
        )}
      </div>
    </section>
  )
}
