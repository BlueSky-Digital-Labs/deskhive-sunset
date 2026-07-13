import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { Armchair, CalendarClock, Monitor } from 'lucide-react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { SkeletonList } from '@components/SkeletonList'
import { Button } from '@components/atoms/Button'
import type { AppDispatch, RootState } from '@store/index'
import {
  cancelBooking,
  fetchMyBookings,
  isCancellableBooking,
  selectCancellingById,
  pageKey,
  setBucket,
  type BookingBucket,
} from '@/features/myBookings/myBookingsSlice'
import type { MyBooking } from '@/lib/apiClient'
import '@/features/myBookings/myBookings.css'

function parseBucket(value: string | null): BookingBucket {
  return value === 'past' ? 'past' : 'upcoming'
}

function parsePage(value: string | null): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function formatStatusLabel(status: string): string {
  if (status === 'active') {
    return 'confirmed'
  }

  return status.replace(/_/g, ' ')
}

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

export function MyBookingsRoute() {
  const dispatch = useDispatch<AppDispatch>()
  const [searchParams, setSearchParams] = useSearchParams()
  const cancellingById = useSelector(selectCancellingById)

  const bucket = parseBucket(searchParams.get('bucket'))
  const page = parsePage(searchParams.get('page'))
  const pageState = useSelector(
    (state: RootState) => state.myBookings.pages[pageKey(bucket, page)],
  )
  const [cancelErrorsById, setCancelErrorsById] = useState<Record<string, string>>({})

  const items = pageState?.items ?? []
  const isLoading = pageState?.loading === 'pending' || pageState === undefined
  const loadError = pageState?.error
  const hasNext = pageState?.hasNext ?? false
  const hasPrevious = page > 1

  useEffect(() => {
    dispatch(setBucket(bucket))
    void dispatch(fetchMyBookings({ bucket, page }))
  }, [bucket, dispatch, page])

  function updateQuery(nextBucket: BookingBucket, nextPage: number) {
    setSearchParams({
      bucket: nextBucket,
      page: String(nextPage),
    })
  }

  function handleTabChange(nextBucket: BookingBucket) {
    updateQuery(nextBucket, 1)
  }

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

  const emptyMessage = useMemo(
    () =>
      bucket === 'upcoming'
        ? 'No upcoming bookings yet.'
        : 'No past bookings to show.',
    [bucket],
  )

  return (
    <DashboardLayout>
      <div className="my-bookings-page">
        <header className="my-bookings-page__header">
          <h1>My Bookings</h1>
          <p>View upcoming and past desk and room reservations.</p>
        </header>

        <div className="my-bookings-tabs" role="tablist" aria-label="Booking buckets">
          <button
            type="button"
            role="tab"
            aria-selected={bucket === 'upcoming'}
            className={`my-bookings-tab ${bucket === 'upcoming' ? 'active' : ''}`}
            onClick={() => handleTabChange('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={bucket === 'past'}
            className={`my-bookings-tab ${bucket === 'past' ? 'active' : ''}`}
            onClick={() => handleTabChange('past')}
          >
            Past
          </button>
        </div>

        {loadError && (
          <div className="my-bookings-error" role="alert">
            {loadError}
            <div className="my-bookings-retry">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void dispatch(fetchMyBookings({ bucket, page }))}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {isLoading && <SkeletonList count={4} />}

        {!isLoading && !loadError && items.length === 0 && (
          <div className="my-bookings-empty" role="status">
            {emptyMessage}
          </div>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <div className="my-bookings-list" role="list">
            {items.map((booking) => {
              const cancelState = cancellingById[booking.id] ?? 'idle'
              const cancelError = cancelErrorsById[booking.id]
              const showCancel = isCancellableBooking(booking)

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
                    <span
                      className={`my-bookings-status my-bookings-status--${booking.status}`}
                    >
                      {formatStatusLabel(booking.status)}
                    </span>
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
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <div className="my-bookings-pagination">
            <span className="my-bookings-pagination__label">Page {page}</span>
            <div className="my-bookings-item__actions">
              <Button
                size="sm"
                variant="outline"
                disabled={!hasPrevious}
                onClick={() => updateQuery(bucket, page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!hasNext}
                onClick={() => updateQuery(bucket, page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default MyBookingsRoute
