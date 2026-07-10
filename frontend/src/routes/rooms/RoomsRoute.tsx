import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { AvailabilityBadge } from '@components/AvailabilityBadge'
import { SkeletonList } from '@components/SkeletonList'
import { Input } from '@components/atoms/Input'
import { Button } from '@components/atoms/Button'
import type { AppDispatch } from '@store/index'
import {
  cancelBooking,
  clearBookingFeedback,
  createRoomBooking,
  fetchMyBookings,
  selectCancellingById,
  selectCreatingStatus,
  selectLastBookingError,
  selectLastBookingSuccess,
  selectMyRoomBookings,
} from '@/features/rooms/roomBookingsSlice'
import {
  fetchRooms,
  selectAvailableRooms,
  selectRoomsError,
  selectRoomsLoading,
  selectUsedManualFallback,
} from '@/features/rooms/roomAvailabilitySlice'
import '@/features/spaces/spaces.css'
import '@/features/rooms/rooms.css'

function todayDateValue(): string {
  return new Date().toISOString().slice(0, 10)
}

function combineDateAndTime(date: string, time: string): string | null {
  if (!date || !time) {
    return null
  }

  const parsed = new Date(`${date}T${time}`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

export function RoomsRoute() {
  const dispatch = useDispatch<AppDispatch>()
  const [date, setDate] = useState(todayDateValue)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [validationError, setValidationError] = useState<string | null>(null)

  const rooms = useSelector(selectAvailableRooms)
  const roomsLoading = useSelector(selectRoomsLoading)
  const roomsError = useSelector(selectRoomsError)
  const usedManualFallback = useSelector(selectUsedManualFallback)
  const creatingStatus = useSelector(selectCreatingStatus)
  const lastError = useSelector(selectLastBookingError)
  const lastSuccess = useSelector(selectLastBookingSuccess)
  const cancellingById = useSelector(selectCancellingById)
  const myBookings = useSelector(selectMyRoomBookings)

  const startAtIso = useMemo(
    () => combineDateAndTime(date, startTime),
    [date, startTime],
  )
  const endAtIso = useMemo(
    () => combineDateAndTime(date, endTime),
    [date, endTime],
  )

  const isRangeValid = useMemo(() => {
    if (!startAtIso || !endAtIso) {
      return false
    }

    return new Date(startAtIso) < new Date(endAtIso)
  }, [endAtIso, startAtIso])

  useEffect(() => {
    if (!date) {
      setValidationError('Date is required.')
      return
    }

    if (!startTime || !endTime) {
      setValidationError('Start and end times are required.')
      return
    }

    if (!isRangeValid) {
      setValidationError('Start time must be before end time.')
      return
    }

    setValidationError(null)
    if (!startAtIso || !endAtIso) {
      return
    }

    void dispatch(
      fetchRooms({
        date,
        startAt: startAtIso,
        endAt: endAtIso,
      }),
    )
  }, [date, dispatch, endAtIso, isRangeValid, startAtIso, endTime, startTime])

  useEffect(() => {
    void dispatch(fetchMyBookings())
  }, [dispatch])

  useEffect(() => {
    if (!lastSuccess) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      dispatch(clearBookingFeedback())
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [dispatch, lastSuccess])

  const isBookingPending = creatingStatus === 'pending'

  async function handleBookRoom(roomId: number) {
    if (!isRangeValid || isBookingPending || !startAtIso || !endAtIso) {
      return
    }

    const result = await dispatch(
      createRoomBooking({
        roomId,
        startAt: startAtIso,
        endAt: endAtIso,
      }),
    )

    if (createRoomBooking.fulfilled.match(result)) {
      void dispatch(
        fetchRooms({
          date,
          startAt: startAtIso,
          endAt: endAtIso,
        }),
      )
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (cancellingById[bookingId] === 'pending') {
      return
    }

    const result = await dispatch(cancelBooking({ bookingId }))

    if (cancelBooking.fulfilled.match(result) && startAtIso && endAtIso) {
      void dispatch(
        fetchRooms({
          date,
          startAt: startAtIso,
          endAt: endAtIso,
        }),
      )
    }
  }

  return (
    <DashboardLayout>
      <div className="spaces-page">
        <header className="spaces-page__header">
          <h1>Book a Room</h1>
          <p>Select a date and time range, then reserve an available room.</p>
        </header>

        <div className="spaces-controls">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <Input
            label="Start time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
          <Input
            label="End time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </div>

        {validationError && (
          <div className="spaces-error" role="alert">
            {validationError}
          </div>
        )}

        {lastSuccess && (
          <div className="spaces-success" role="status" aria-live="polite">
            {lastSuccess}
          </div>
        )}

        {lastError?.code === 409 && (
          <div className="spaces-error" role="alert">
            {lastError.message}
          </div>
        )}

        {lastError && lastError.code !== 409 && (
          <div className="spaces-error" role="alert">
            {lastError.message}
          </div>
        )}

        {roomsError && !validationError && (
          <div className="spaces-error" role="alert">
            {roomsError}
          </div>
        )}

        {usedManualFallback && !roomsError && (
          <p className="spaces-fallback-note" role="note">
            Availability service unavailable. Showing all rooms for manual selection.
          </p>
        )}

        {roomsLoading && isRangeValid && <SkeletonList count={4} />}

        {!roomsLoading && isRangeValid && !roomsError && rooms.length === 0 && (
          <div className="spaces-empty" role="status">
            No rooms available for the selected time range.
          </div>
        )}

        {!roomsLoading && isRangeValid && rooms.length > 0 && (
          <div className="spaces-grid">
            {rooms.map((room) => (
              <article key={room.id} className="spaces-card">
                <div>
                  <h2 className="spaces-card__title">{room.name}</h2>
                  <p className="spaces-card__meta">Capacity: {room.capacity}</p>
                </div>
                <div className="spaces-card__actions">
                  <AvailabilityBadge available={room.available} />
                  <Button
                    size="sm"
                    onClick={() => void handleBookRoom(room.id)}
                    disabled={!room.available || isBookingPending || !isRangeValid}
                    isLoading={isBookingPending}
                  >
                    Book slot
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}

        {myBookings.length > 0 && (
          <section className="spaces-bookings" aria-label="Your room bookings">
            <h2>Your bookings</h2>
            <div className="spaces-list">
              {myBookings.map((booking) => (
                <article key={booking.id} className="spaces-card">
                  <div>
                    <h3 className="spaces-card__title">
                      Room #{booking.room_id ?? booking.resource_id}
                    </h3>
                    <p className="spaces-card__meta">
                      {booking.start_at} – {booking.end_at}
                    </p>
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

export default RoomsRoute
