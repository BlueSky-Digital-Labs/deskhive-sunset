import { Armchair, CalendarClock, Monitor } from 'lucide-react'
import { Button } from '@components/atoms/Button'
import type { MyBooking } from '@/lib/apiClient'
import {
  cancelBooking,
  isCancellableBooking,
  selectCancellingById,
} from '@/features/myBookings/myBookingsSlice'
import { isCheckInEligible } from '@/features/bookings/utils'
import { useCheckIn } from '@/features/bookings/hooks/useCheckIn'
import { BookingStatusBadge } from '@/features/bookings/components/BookingStatusBadge'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '@store/index'
import { useState } from 'react'

function formatBookingSchedule(booking: MyBooking): string {
  if (booking.resource_type === 'room' && booking.start_at && booking.end_at) {
    const start = new Date(booking.start_at)
    const end = new Date(booking.end_at)
    return `${start.toLocaleString()} – ${end.toLocaleTimeString()}`
  }

  return new Date(booking.date).toLocaleDateString()
}

function BookingIcon({ resourceType }: { resourceType: string }) {
  if (resourceType === 'desk') {
    return <Armchair size={18} aria-hidden="true" />
  }

  if (resourceType === 'room') {
    return <Monitor size={18} aria-hidden="true" />
  }

  return <CalendarClock size={18} aria-hidden="true" />
}

interface BookingListProps {
  bookings: MyBooking[]
}

export function BookingList({ bookings }: BookingListProps) {
  const dispatch = useDispatch<AppDispatch>()
  const cancellingById = useSelector(selectCancellingById)
  const { checkIn, checkingInById } = useCheckIn()
  const [cancelErrorsById, setCancelErrorsById] = useState<Record<string, string>>({})

  async function handleCancel(bookingId: string) {
    if (cancellingById[bookingId] === 'pending') {
      return
    }

    setCancelErrorsById((current) => {
      const next = { ...current }
      delete next[bookingId]
      return next
    })

    const result = await dispatch(cancelBooking({ bookingId }))

    if (cancelBooking.rejected.match(result)) {
      setCancelErrorsById((current) => ({
        ...current,
        [bookingId]: result.payload?.message ?? 'Failed to cancel booking.',
      }))
    }
  }

  return (
    <div className="my-bookings-list" role="list">
      {bookings.map((booking) => {
        const cancelState = cancellingById[booking.id] ?? 'idle'
        const checkInState = checkingInById[booking.id] ?? 'idle'
        const cancelError = cancelErrorsById[booking.id]
        const showCancel = isCancellableBooking(booking)
        const showCheckIn = isCheckInEligible(booking)

        return (
          <article key={booking.id} className="my-bookings-item" role="listitem">
            <div className="my-bookings-item__main">
              <span className="my-bookings-item__icon">
                <BookingIcon resourceType={booking.resource_type} />
              </span>
              <div>
                <h2 className="my-bookings-item__title">
                  {booking.resource_label ??
                    `${booking.resource_type} #${booking.resource_id}`}
                </h2>
                <p className="my-bookings-item__meta">
                  {formatBookingSchedule(booking)}
                </p>
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
              {showCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCancel(booking.id)}
                  disabled={cancelState === 'pending'}
                  isLoading={cancelState === 'pending'}
                >
                  {cancelState === 'failed' ? 'Retry cancel' : 'Cancel'}
                </Button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
