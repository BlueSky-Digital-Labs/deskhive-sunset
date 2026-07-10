import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { ApiError } from '@/lib/api'
import roomBookingsReducer, {
  cancelBooking,
  createRoomBooking,
} from '@/features/rooms/roomBookingsSlice'

vi.mock('@/lib/apiClient', () => ({
  postBooking: vi.fn(),
  postCancel: vi.fn(),
  getBookings: vi.fn(),
}))

import { postBooking, postCancel } from '@/lib/apiClient'

function createRoomBookingsStore() {
  return configureStore({
    reducer: {
      roomBookings: roomBookingsReducer,
    },
  })
}

describe('roomBookingsSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createRoomBooking succeeds and stores booking', async () => {
    vi.mocked(postBooking).mockResolvedValue({
      id: 'booking-1',
      user_id: 1,
      resource_type: 'room',
      resource_id: 5,
      room_id: 5,
      desk_id: null,
      booking_date: '2026-07-15',
      date: '2026-07-15',
      start_at: '2026-07-15T09:00:00.000Z',
      end_at: '2026-07-15T10:00:00.000Z',
      status: 'active',
      created_at: '2026-07-15T08:00:00.000Z',
      checked_in_at: null,
    })

    const store = createRoomBookingsStore()
    const result = await store.dispatch(
      createRoomBooking({
        roomId: 5,
        startAt: '2026-07-15T09:00:00.000Z',
        endAt: '2026-07-15T10:00:00.000Z',
      }),
    )

    expect(result.type).toBe('roomBookings/createRoomBooking/fulfilled')
    expect(store.getState().roomBookings.creating).toBe('succeeded')
    expect(store.getState().roomBookings.lastSuccessMessage).toBe(
      'Room booked successfully.',
    )
    expect(postBooking).toHaveBeenCalledWith({
      resource_type: 'room',
      resource_id: '5',
      start_at: '2026-07-15T09:00:00.000Z',
      end_at: '2026-07-15T10:00:00.000Z',
    })
  })

  it('createRoomBooking maps 409 conflicts to lastError', async () => {
    vi.mocked(postBooking).mockRejectedValue(
      new ApiError(409, 'Room is already booked for the requested time range.'),
    )

    const store = createRoomBookingsStore()
    const result = await store.dispatch(
      createRoomBooking({
        roomId: 5,
        startAt: '2026-07-15T09:00:00.000Z',
        endAt: '2026-07-15T10:00:00.000Z',
      }),
    )

    expect(result.type).toBe('roomBookings/createRoomBooking/rejected')
    expect(store.getState().roomBookings.creating).toBe('failed')
    expect(store.getState().roomBookings.lastError).toEqual({
      code: 409,
      message: 'Room is already booked for the requested time range.',
    })
  })

  it('cancelBooking succeeds and marks booking cancelled', async () => {
    vi.mocked(postCancel).mockResolvedValue(undefined)

    const store = createRoomBookingsStore()
    store.dispatch({
      type: 'roomBookings/fetchMyBookings/fulfilled',
      payload: [
        {
          id: 'booking-1',
          user_id: 1,
          resource_type: 'room',
          resource_id: 5,
          room_id: 5,
          desk_id: null,
          booking_date: '2026-07-15',
          date: '2026-07-15',
          start_at: '2026-07-15T09:00:00.000Z',
          end_at: '2026-07-15T10:00:00.000Z',
          status: 'active',
          created_at: '2026-07-15T08:00:00.000Z',
          checked_in_at: null,
        },
      ],
    })

    const result = await store.dispatch(cancelBooking({ bookingId: 'booking-1' }))

    expect(result.type).toBe('roomBookings/cancelBooking/fulfilled')
    expect(store.getState().roomBookings.cancellingById['booking-1']).toBe('succeeded')
    expect(store.getState().roomBookings.bookings[0].status).toBe('cancelled')
    expect(postCancel).toHaveBeenCalledWith('booking-1')
  })

  it('cancelBooking records failure state for rollback', async () => {
    vi.mocked(postCancel).mockRejectedValue(
      new ApiError(500, 'Failed to cancel booking.'),
    )

    const store = createRoomBookingsStore()
    const result = await store.dispatch(cancelBooking({ bookingId: 'booking-2' }))

    expect(result.type).toBe('roomBookings/cancelBooking/rejected')
    expect(store.getState().roomBookings.cancellingById['booking-2']).toBe('failed')
    expect(store.getState().roomBookings.lastError).toEqual({
      code: 500,
      message: 'Failed to cancel booking.',
    })
  })
})
