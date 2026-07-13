import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import type { ReactNode } from 'react'
import { configureStore } from '@reduxjs/toolkit'
import myBookingsReducer, {
  pageKey,
} from '@/features/myBookings/myBookingsSlice'
import { ToastProvider } from '@/lib/toast'
import { useCheckIn } from '@/features/bookings/hooks/useCheckIn'
import { ApiError } from '@/lib/api'

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

import { checkIn, CheckInConflictError } from '@/api/bookings'

const sampleBooking = {
  id: 'booking-1',
  resource_type: 'desk',
  resource_id: 12,
  resource_label: null,
  date: '2026-07-13',
  start_at: null,
  end_at: null,
  status: 'active',
  created_at: '2026-07-12T08:00:00.000Z',
  is_upcoming: true,
}

function createHookStore() {
  const store = configureStore({
    reducer: {
      myBookings: myBookingsReducer,
    },
  })

  store.dispatch({
    type: 'myBookings/fetchMyBookings/fulfilled',
    payload: {
      bucket: 'upcoming',
      page: 1,
      items: [sampleBooking],
      hasNext: false,
    },
  })

  return store
}

function wrapper(store: ReturnType<typeof createHookStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <ToastProvider>{children}</ToastProvider>
      </Provider>
    )
  }
}

describe('useCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates cache and shows success toast on fulfilled check-in', async () => {
    vi.mocked(checkIn).mockResolvedValue({
      id: 'booking-1',
      user_id: 1,
      resource_type: 'desk',
      resource_id: 12,
      resource_label: null,
      room_id: null,
      desk_id: 12,
      booking_date: '2026-07-13',
      date: '2026-07-13',
      start_at: null,
      end_at: null,
      status: 'checked_in',
      is_upcoming: true,
      created_at: '2026-07-12T08:00:00.000Z',
      checked_in_at: '2026-07-13T09:00:00.000Z',
    })

    const store = createHookStore()
    const { result } = renderHook(() => useCheckIn(), {
      wrapper: wrapper(store),
    })

    const payload = await result.current.checkIn('booking-1')

    await waitFor(() => {
      expect(payload?.status).toBe('checked_in')
      expect(
        store.getState().myBookings.pages[pageKey('upcoming', 1)]?.items[0].status,
      ).toBe('checked_in')
      expect(document.body).toHaveTextContent('Checked in successfully.')
    })
  })

  it('rolls back optimistic update and shows conflict toast on 409', async () => {
    vi.mocked(checkIn).mockRejectedValue(
      new CheckInConflictError('Check-in is only available on the booking day.'),
    )

    const store = createHookStore()
    const { result } = renderHook(() => useCheckIn(), {
      wrapper: wrapper(store),
    })

    const payload = await result.current.checkIn('booking-1')

    await waitFor(() => {
      expect(payload).toBeNull()
      expect(
        store.getState().myBookings.pages[pageKey('upcoming', 1)]?.items[0].status,
      ).toBe('active')
      expect(document.body).toHaveTextContent(
        'Check-in is only available on the booking day.',
      )
    })
  })

  it('rolls back optimistic update on generic API failure', async () => {
    vi.mocked(checkIn).mockRejectedValue(new ApiError(400, 'Check-in window has closed.'))

    const store = createHookStore()
    const { result } = renderHook(() => useCheckIn(), {
      wrapper: wrapper(store),
    })

    const payload = await result.current.checkIn('booking-1')

    await waitFor(() => {
      expect(payload).toBeNull()
      expect(
        store.getState().myBookings.pages[pageKey('upcoming', 1)]?.items[0].status,
      ).toBe('active')
      expect(document.body).toHaveTextContent('Check-in window has closed.')
    })
  })

  it('calls the check-in API through the hook', async () => {
    vi.mocked(checkIn).mockResolvedValue({
      id: 'booking-1',
      user_id: 1,
      resource_type: 'desk',
      resource_id: 12,
      resource_label: null,
      room_id: null,
      desk_id: 12,
      booking_date: '2026-07-13',
      date: '2026-07-13',
      start_at: null,
      end_at: null,
      status: 'checked_in',
      is_upcoming: true,
      created_at: '2026-07-12T08:00:00.000Z',
      checked_in_at: '2026-07-13T09:00:00.000Z',
    })

    const store = createHookStore()
    const { result } = renderHook(() => useCheckIn(), {
      wrapper: wrapper(store),
    })

    await result.current.checkIn('booking-1')

    expect(checkIn).toHaveBeenCalledWith('booking-1')
  })
})
