import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { EmptyState } from '@components/EmptyState'
import { SkeletonList } from '@components/SkeletonList'
import { Button } from '@components/atoms/Button'
import type { AppDispatch, RootState } from '@store/index'
import {
  fetchMyBookings,
  pageKey,
  setBucket,
  type BookingBucket,
} from '@/features/myBookings/myBookingsSlice'
import { BookingList } from '@/features/bookings/components/BookingList'
import '@/features/myBookings/myBookings.css'

function parseBucket(value: string | null): BookingBucket {
  return value === 'past' ? 'past' : 'upcoming'
}

function parsePage(value: string | null): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function MyBookingsRoute() {
  const dispatch = useDispatch<AppDispatch>()
  const [searchParams, setSearchParams] = useSearchParams()

  const bucket = parseBucket(searchParams.get('bucket'))
  const page = parsePage(searchParams.get('page'))
  const pageState = useSelector(
    (state: RootState) => state.myBookings.pages[pageKey(bucket, page)],
  )

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
          <EmptyState message={emptyMessage} />
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <BookingList bookings={items} />
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
