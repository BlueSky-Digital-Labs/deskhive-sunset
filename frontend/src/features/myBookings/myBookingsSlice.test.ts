import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { ApiError } from '@/lib/api'
import myBookingsReducer, {
  cancelBooking,
  fetchMyBookings,
  pageKey,
} from '@/features/myBookings/myBookingsSlice'

vi.mock('@/lib/apiClient', () => ({
  getMyBookings: vi.fn(),
  postBookingCancel: vi.fn(),
}))

import { getMyBookings, postBookingCancel } from '@/lib/apiClient'

const sampleBooking = {
  id: 'booking-1',
  resource_type: 'room',
  resource_id: 5,
  resource_label: null,
  date: '2026-07-15',
  start_at: '2026-07-15T09:00:00.000Z',
  end_at: '2026-07-15T10:00:00.000Z',
  status: 'active',
  created_at: '2026-07-15T08:00:00.000Z',
  is_upcoming: true,
}

function createMyBookingsStore() {
  return configureStore({
    reducer: {
      myBookings: myBookingsReducer,
    },
  })
}

describe('myBookingsSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchMyBookings stores paginated page data', async () => {
    vi.mocked(getMyBookings).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [sampleBooking],
    })

    const store = createMyBookingsStore()
    const result = await store.dispatch(
      fetchMyBookings({ bucket: 'upcoming', page: 1 }),
    )

    expect(result.type).toBe('myBookings/fetchMyBookings/fulfilled')
    expect(getMyBookings).toHaveBeenCalledWith({ bucket: 'upcoming', page: 1 })
    expect(store.getState().myBookings.pages[pageKey('upcoming', 1)]).toEqual({
      items: [sampleBooking],
      page: 1,
      hasNext: false,
      loading: 'succeeded',
    })
  })

  it('fetchMyBookings records failure for retry flows', async () => {
    vi.mocked(getMyBookings).mockRejectedValue(
      new ApiError(500, 'Failed to load bookings.'),
    )

    const store = createMyBookingsStore()
    const result = await store.dispatch(
      fetchMyBookings({ bucket: 'past', page: 2 }),
    )

    expect(result.type).toBe('myBookings/fetchMyBookings/rejected')
    expect(store.getState().myBookings.pages[pageKey('past', 2)]?.loading).toBe(
      'failed',
    )
    expect(store.getState().myBookings.pages[pageKey('past', 2)]?.error).toBe(
      'Failed to load bookings.',
    )
  })

  it('cancelBooking optimistically cancels then confirms on success', async () => {
    vi.mocked(postBookingCancel).mockResolvedValue({
      ...sampleBooking,
      status: 'cancelled',
      is_upcoming: false,
    })

    const store = createMyBookingsStore()
    store.dispatch({
      type: 'myBookings/fetchMyBookings/fulfilled',
      payload: {
        bucket: 'upcoming',
        page: 1,
        items: [sampleBooking],
        hasNext: false,
      },
    })

    const result = await store.dispatch(cancelBooking({ bookingId: 'booking-1' }))

    expect(result.type).toBe('myBookings/cancelBooking/fulfilled')
    expect(postBookingCancel).toHaveBeenCalledWith('booking-1')
    expect(
      store.getState().myBookings.pages[pageKey('upcoming', 1)]?.items[0].status,
    ).toBe('cancelled')
    expect(store.getState().myBookings.cancellingById['booking-1']).toBe('succeeded')
  })

  it('cancelBooking rolls back optimistic update on failure', async () => {
    vi.mocked(postBookingCancel).mockRejectedValue(
      new ApiError(400, 'Only pending or confirmed upcoming bookings can be cancelled.'),
    )

    const store = createMyBookingsStore()
    store.dispatch({
      type: 'myBookings/fetchMyBookings/fulfilled',
      payload: {
        bucket: 'upcoming',
        page: 1,
        items: [sampleBooking],
        hasNext: false,
      },
    })

    const result = await store.dispatch(cancelBooking({ bookingId: 'booking-1' }))

    expect(result.type).toBe('myBookings/cancelBooking/rejected')
    expect(
      store.getState().myBookings.pages[pageKey('upcoming', 1)]?.items[0].status,
    ).toBe('active')
    expect(store.getState().myBookings.cancellingById['booking-1']).toBe('failed')
  })
})
