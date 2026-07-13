import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { AvailabilityBadge } from '@components/AvailabilityBadge'
import { SkeletonList } from '@components/SkeletonList'
import { Input } from '@components/atoms/Input'
import { Button } from '@components/atoms/Button'
import type { AppDispatch } from '@/app/store'
import { useToast } from '@/lib/toast'
import {
  cancelBooking,
  clearDeskBookingFeedback,
  createDeskBooking,
  fetchMyDeskBookings,
  selectDeskCancellingById,
  selectDeskCreatingStatus,
  selectDeskLastBookingError,
  selectMyDeskBookings,
} from '@/features/desks/deskBookingsSlice'
import {
  fetchDeskAvailability,
  selectDesksErrorForDate,
  selectDesksForDate,
  selectDesksLoadingForDate,
} from '@/features/desks/deskAvailabilitySlice'
import '@/features/spaces/spaces.css'
import '@/features/rooms/rooms.css'

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10)
}

export function DesksRoute() {
  const dispatch = useDispatch<AppDispatch>()
  const { showToast } = useToast()
  const [date, setDate] = useState(todayDateValue)

  const desks = useSelector(selectDesksForDate(date))
  const desksLoading = useSelector(selectDesksLoadingForDate(date))
  const desksError = useSelector(selectDesksErrorForDate(date))
  const creatingStatus = useSelector(selectDeskCreatingStatus)
  const lastError = useSelector(selectDeskLastBookingError)
  const cancellingById = useSelector(selectDeskCancellingById)
  const myBookings = useSelector(selectMyDeskBookings)

  useEffect(() => {
    if (!date) {
      return
    }

    void dispatch(fetchDeskAvailability(date))
  }, [date, dispatch])

  useEffect(() => {
    void dispatch(fetchMyDeskBookings())
  }, [dispatch])

  useEffect(() => {
    if (!lastError || lastError.code === 409) {
      return
    }

    if (creatingStatus === 'failed') {
      showToast({ type: 'error', message: lastError.message })
    }
  }, [creatingStatus, lastError, showToast])

  const isBookingPending = creatingStatus === 'pending'

  async function handleBookDesk(deskId: number) {
    if (isBookingPending || !date) {
      return
    }

    const result = await dispatch(
      createDeskBooking({
        deskId: String(deskId),
        date,
      }),
    )

    if (createDeskBooking.fulfilled.match(result)) {
      showToast({ type: 'success', message: 'Desk booked successfully.' })
      dispatch(clearDeskBookingFeedback())
      void dispatch(fetchDeskAvailability(date))
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (cancellingById[bookingId] === 'pending') {
      return
    }

    const result = await dispatch(cancelBooking({ bookingId }))

    if (cancelBooking.fulfilled.match(result)) {
      showToast({ type: 'success', message: 'Booking cancelled.' })
      dispatch(clearDeskBookingFeedback())
      void dispatch(fetchDeskAvailability(date))
    } else if (cancelBooking.rejected.match(result)) {
      showToast({ type: 'error', message: 'Failed to cancel booking.' })
    }
  }

  return (
    <DashboardLayout>
      <div className="spaces-page">
        <header className="spaces-page__header">
          <h1>Book a Desk</h1>
          <p>Select a date and reserve an available desk.</p>
        </header>

        <div className="spaces-controls">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        {desksError && (
          <div className="spaces-error" role="alert">
            {desksError}
          </div>
        )}

        {lastError?.code === 409 && (
          <div className="spaces-error" role="alert">
            {lastError.message}
          </div>
        )}

        {desksLoading && <SkeletonList count={6} />}

        {!desksLoading && !desksError && desks.length === 0 && (
          <div className="spaces-empty" role="status">
            No desks available for the selected date.
          </div>
        )}

        {!desksLoading && desks.length > 0 && (
          <div className="spaces-grid">
            {desks.map((desk) => (
              <article key={desk.id} className="spaces-card">
                <div>
                  <h2 className="spaces-card__title">{desk.name}</h2>
                  <p className="spaces-card__meta">Floor ID: {desk.floor}</p>
                </div>
                <div className="spaces-card__actions">
                  <AvailabilityBadge available={desk.available} />
                  <Button
                    size="sm"
                    onClick={() => void handleBookDesk(desk.id)}
                    disabled={!desk.available || isBookingPending}
                    isLoading={isBookingPending}
                  >
                    Book
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        {myBookings.length > 0 && (
          <section className="spaces-bookings" aria-label="Your desk bookings">
            <h2>Your bookings</h2>
            <div className="spaces-list">
              {myBookings.map((booking) => (
                <article key={booking.id} className="spaces-card">
                  <div>
                    <h3 className="spaces-card__title">
                      Desk #{booking.desk_id ?? booking.resource_id}
                    </h3>
                    <p className="spaces-card__meta">{booking.booking_date ?? booking.date}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCancelBooking(booking.id)}
                    disabled={cancellingById[booking.id] === 'pending'}
                    isLoading={cancellingById[booking.id] === 'pending'}
                  >
                    Cancel
                  </Button>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DesksRoute
