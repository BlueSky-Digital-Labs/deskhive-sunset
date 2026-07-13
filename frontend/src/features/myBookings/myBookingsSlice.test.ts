import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { ApiError } from '@/lib/api'
import { CheckInConflictError } from '@/api/bookings'
import myBookingsReducer, {
  cancelBooking,
  checkInBooking,
  fetchMyBookings,
  pageKey,
} from '@/features/myBookings/myBookingsSlice'

vi.mock('@/lib/apiClient', () => ({
  getMyBookings: vi.fn(),
  postBookingCancel: vi.fn(),
}))

vi.mock('@/api/bookings', () => ({
  checkIn: vi.fn(),
  CheckInConflictError: class CheckInConflictError extends Error {
    status = 409

    constructor(message = 'Check-in is only available on the booking day.') {
      super(message)
      this.name = 'CheckInConflictError'
    }
  },
}))

import { getMyBookings, postBookingCancel } from '@/lib/apiClient'
import { checkIn } from '@/api/bookings'

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

  it('checkInBooking optimistically checks in then confirms on success', async () => {
    vi.mocked(checkIn).mockResolvedValue({
      id: 'booking-1',
      user_id: 1,
      resource_type: 'room',
      resource_id: 5,
      resource_label: null,
      room_id: 5,
      desk_id: null,
      booking_date: '2026-07-15',
      date: '2026-07-15',
      start_at: '2026-07-15T09:00:00.000Z',
      end_at: '2026-07-15T10:00:00.000Z',
      status: 'checked_in',
      is_upcoming: true,
      created_at: '2026-07-15T08:00:00.000Z',
      checked_in_at: '2026-07-15T09:05:00.000Z',
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

    const result = await store.dispatch(checkInBooking({ bookingId: 'booking-1' }))

    expect(result.type).toBe('myBookings/checkInBooking/fulfilled')
    expect(checkIn).toHaveBeenCalledWith('booking-1')
    expect(
      store.getState().myBookings.pages[pageKey('upcoming', 1)]?.items[0].status,
    ).toBe('checked_in')
    expect(store.getState().myBookings.checkingInById['booking-1']).toBe('succeeded')
  })

  it('checkInBooking rolls back optimistic update on 409 failure', async () => {
    vi.mocked(checkIn).mockRejectedValue(
      new CheckInConflictError('Check-in is only available on the booking day.'),
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

    const result = await store.dispatch(checkInBooking({ bookingId: 'booking-1' }))

    expect(result.type).toBe('myBookings/checkInBooking/rejected')
    expect(
      store.getState().myBookings.pages[pageKey('upcoming', 1)]?.items[0].status,
    ).toBe('active')
    expect(store.getState().myBookings.checkingInById['booking-1']).toBe('failed')
  })
})
