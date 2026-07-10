import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { ApiError } from '@/lib/api'
import roomAvailabilityReducer, { fetchRooms } from '@/features/rooms/roomAvailabilitySlice'

vi.mock('@/features/spaces/api', () => ({
  getRoomAvailability: vi.fn(),
  getRooms: vi.fn(),
}))

import { getRoomAvailability, getRooms } from '@/features/spaces/api'

function createAvailabilityStore() {
  return configureStore({
    reducer: {
      roomAvailability: roomAvailabilityReducer,
    },
  })
}

describe('roomAvailabilitySlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchRooms loads availability for a date range', async () => {
    vi.mocked(getRoomAvailability).mockResolvedValue([
      {
        id: 1,
        name: 'Room A',
        floor: 2,
        capacity: 6,
        available: true,
      },
    ])

    const store = createAvailabilityStore()
    const result = await store.dispatch(
      fetchRooms({
        date: '2026-07-15',
        startAt: '2026-07-15T09:00:00.000Z',
        endAt: '2026-07-15T10:00:00.000Z',
      }),
    )

    expect(result.type).toBe('roomAvailability/fetchRooms/fulfilled')
    expect(store.getState().roomAvailability.rooms).toHaveLength(1)
    expect(store.getState().roomAvailability.usedManualFallback).toBe(false)
  })

  it('fetchRooms falls back to manual room list when availability fails', async () => {
    vi.mocked(getRoomAvailability).mockRejectedValue(
      new ApiError(503, 'Service unavailable'),
    )
    vi.mocked(getRooms).mockResolvedValue([
      {
        id: 2,
        name: 'Room B',
        floor: 1,
        capacity: 4,
        is_active: true,
      },
    ])

    const store = createAvailabilityStore()
    const result = await store.dispatch(fetchRooms({ date: '2026-07-15' }))

    expect(result.type).toBe('roomAvailability/fetchRooms/fulfilled')
    expect(store.getState().roomAvailability.usedManualFallback).toBe(true)
    expect(store.getState().roomAvailability.rooms[0]).toEqual({
      id: 2,
      name: 'Room B',
      floor: 1,
      capacity: 4,
      available: true,
    })
  })
})
