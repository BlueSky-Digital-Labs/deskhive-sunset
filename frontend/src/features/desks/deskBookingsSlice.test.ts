import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { HttpError } from '@/lib/http'
import deskBookingsReducer, {
  cancelBooking,
  createDeskBooking,
} from '@/features/desks/deskBookingsSlice'

vi.mock('@/lib/apiClient', () => ({
  postDeskBooking: vi.fn(),
  deleteDeskBooking: vi.fn(),
  fetchJson: vi.fn(),
}))

import { deleteDeskBooking, postDeskBooking } from '@/lib/apiClient'

function createDeskBookingsStore() {
  return configureStore({
    reducer: {
      deskBookings: deskBookingsReducer,
    },
  })
}

const sampleBooking = {
  id: 'booking-1',
  user_id: 1,
  resource_type: 'desk',
  resource_id: 3,
  room_id: null,
  desk_id: 3,
  booking_date: '2026-07-15',
  date: '2026-07-15',
  start_at: null,
  end_at: null,
  status: 'active',
  created_at: '2026-07-15T08:00:00.000Z',
  checked_in_at: null,
}

describe('deskBookingsSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createDeskBooking succeeds and stores booking', async () => {
    vi.mocked(postDeskBooking).mockResolvedValue(sampleBooking)

    const store = createDeskBookingsStore()
    const result = await store.dispatch(
      createDeskBooking({
        deskId: '3',
        date: '2026-07-15',
      }),
    )

    expect(result.type).toBe('deskBookings/createDeskBooking/fulfilled')
    expect(store.getState().deskBookings.creating).toBe('succeeded')
    expect(store.getState().deskBookings.lastSuccessMessage).toBe(
      'Desk booked successfully.',
    )
    expect(postDeskBooking).toHaveBeenCalledWith({
      desk_id: 3,
      booking_date: '2026-07-15',
    })
  })

  it('createDeskBooking maps 409 conflicts to lastError', async () => {
    vi.mocked(postDeskBooking).mockRejectedValue(
      new HttpError(409, 'Desk is already booked for this date.'),
    )

    const store = createDeskBookingsStore()
    const result = await store.dispatch(
      createDeskBooking({
        deskId: '3',
        date: '2026-07-15',
      }),
    )

    expect(result.type).toBe('deskBookings/createDeskBooking/rejected')
    expect(store.getState().deskBookings.creating).toBe('failed')
    expect(store.getState().deskBookings.lastError).toEqual({
      code: 409,
      message: 'Desk is already booked for this date.',
    })
  })

  it('cancelBooking optimistically cancels and rolls back on failure', async () => {
    vi.mocked(deleteDeskBooking).mockRejectedValue(
      new HttpError(500, 'Failed to cancel booking.'),
    )

    const store = createDeskBookingsStore()
    store.dispatch({
      type: 'deskBookings/fetchMyDeskBookings/fulfilled',
      payload: [sampleBooking],
    })

    const result = await store.dispatch(cancelBooking({ bookingId: 'booking-1' }))

    expect(result.type).toBe('deskBookings/cancelBooking/rejected')
    expect(store.getState().deskBookings.cancellingById['booking-1']).toBe('failed')
    expect(store.getState().deskBookings.bookings[0].status).toBe('active')
    expect(store.getState().deskBookings.lastError).toEqual({
      code: 500,
      message: 'Failed to cancel booking.',
    })
  })

  it('cancelBooking succeeds and marks booking cancelled', async () => {
    vi.mocked(deleteDeskBooking).mockResolvedValue(undefined)

    const store = createDeskBookingsStore()
    store.dispatch({
      type: 'deskBookings/fetchMyDeskBookings/fulfilled',
      payload: [sampleBooking],
    })

    const result = await store.dispatch(cancelBooking({ bookingId: 'booking-1' }))

    expect(result.type).toBe('deskBookings/cancelBooking/fulfilled')
    expect(store.getState().deskBookings.cancellingById['booking-1']).toBe('succeeded')
    expect(store.getState().deskBookings.bookings[0].status).toBe('cancelled')
    expect(deleteDeskBooking).toHaveBeenCalledWith('booking-1')
  })
})
