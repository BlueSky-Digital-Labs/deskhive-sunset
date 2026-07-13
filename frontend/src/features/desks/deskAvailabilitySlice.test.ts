import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { HttpError } from '@/lib/http'
import deskAvailabilityReducer, {
  fetchDeskAvailability,
} from '@/features/desks/deskAvailabilitySlice'

vi.mock('@/lib/apiClient', () => ({
  fetchJson: vi.fn(),
}))

import { fetchJson } from '@/lib/apiClient'

function createDeskAvailabilityStore() {
  return configureStore({
    reducer: {
      deskAvailability: deskAvailabilityReducer,
    },
  })
}

describe('deskAvailabilitySlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchDeskAvailability loads desks for a date', async () => {
    vi.mocked(fetchJson).mockResolvedValue([
      {
        id: 1,
        name: 'Desk A1',
        floor: 2,
        available: true,
      },
    ])

    const store = createDeskAvailabilityStore()
    const result = await store.dispatch(fetchDeskAvailability('2026-07-15'))

    expect(result.type).toBe('deskAvailability/fetchDeskAvailability/fulfilled')
    expect(store.getState().deskAvailability.byDate['2026-07-15'].desks).toHaveLength(1)
    expect(store.getState().deskAvailability.byDate['2026-07-15'].status).toBe('succeeded')
    expect(fetchJson).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/v1/availability/desks/?date=2026-07-15',
      auth: true,
    })
  })

  it('fetchDeskAvailability records failure for a date', async () => {
    vi.mocked(fetchJson).mockRejectedValue(new HttpError(503, 'Service unavailable'))

    const store = createDeskAvailabilityStore()
    const result = await store.dispatch(fetchDeskAvailability('2026-07-15'))

    expect(result.type).toBe('deskAvailability/fetchDeskAvailability/rejected')
    expect(store.getState().deskAvailability.byDate['2026-07-15'].status).toBe('failed')
    expect(store.getState().deskAvailability.byDate['2026-07-15'].error).toBe(
      'Service unavailable',
    )
  })
})
