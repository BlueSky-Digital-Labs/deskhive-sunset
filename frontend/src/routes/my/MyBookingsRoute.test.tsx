import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import MyBookingsRoute from '@/routes/my/MyBookingsRoute'
import { createTestStore } from '@/test/test-utils'
import * as apiClient from '@/lib/apiClient'
import { ToastProvider } from '@/lib/toast'

vi.mock('@/lib/apiClient', () => ({
  getMyBookings: vi.fn(),
  postBookingCancel: vi.fn(),
  postBooking: vi.fn(),
  postCancel: vi.fn(),
  getBookings: vi.fn(),
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

function renderMyBookingsRoute(initialEntry = '/my/bookings?bucket=upcoming&page=1') {
  const store = createTestStore({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 1,
      email: 'user@example.com',
      date_joined: '2026-01-01T00:00:00Z',
    },
    status: 'succeeded',
  })

  return {
    store,
    ...render(
      <Provider store={store}>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <MyBookingsRoute />
          </MemoryRouter>
        </ToastProvider>
      </Provider>,
    ),
  }
}

const upcomingBooking = {
  id: 'booking-1',
  resource_type: 'desk',
  resource_id: 12,
  resource_label: null,
  date: '2026-07-20',
  start_at: null,
  end_at: null,
  status: 'active',
  created_at: '2026-07-12T08:00:00.000Z',
  is_upcoming: true,
}

describe('MyBookingsRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.getMyBookings).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [upcomingBooking],
    })
  })

  it('renders upcoming bookings and fetches on mount', async () => {
    renderMyBookingsRoute()

    expect(await screen.findByText(/desk #12/i)).toBeInTheDocument()
    expect(apiClient.getMyBookings).toHaveBeenCalledWith({
      bucket: 'upcoming',
      page: 1,
    })
  })

  it('switches to past tab and updates URL query', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.getMyBookings).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })

    renderMyBookingsRoute()

    await screen.findByText(/no upcoming bookings yet/i)
    await user.click(screen.getByRole('tab', { name: /past/i }))

    await waitFor(() => {
      expect(apiClient.getMyBookings).toHaveBeenCalledWith({
        bucket: 'past',
        page: 1,
      })
    })
    expect(await screen.findByText(/no past bookings to show/i)).toBeInTheDocument()
  })

  it('cancels a booking with optimistic UI update', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.postBookingCancel).mockResolvedValue({
      ...upcomingBooking,
      status: 'cancelled',
      is_upcoming: false,
    })

    const { store } = renderMyBookingsRoute()

    await user.click(await screen.findByRole('button', { name: /^cancel$/i }))

    await waitFor(() => {
      expect(apiClient.postBookingCancel).toHaveBeenCalledWith('booking-1')
      expect(
        store.getState().myBookings.pages['upcoming:1']?.items[0].status,
      ).toBe('cancelled')
    })
  })

  it('shows retry label after failed cancellation', async () => {
    const user = userEvent.setup()
    const { ApiError } = await import('@/lib/api')
    vi.mocked(apiClient.postBookingCancel).mockRejectedValue(
      new ApiError(400, 'Only pending or confirmed upcoming bookings can be cancelled.'),
    )

    renderMyBookingsRoute()

    await user.click(await screen.findByRole('button', { name: /^cancel$/i }))

    expect(
      await screen.findByRole('button', { name: /retry cancel/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/upcoming bookings can be cancelled/i)).toBeInTheDocument()
  })

  it('shows loading skeleton while fetching', async () => {
    vi.mocked(apiClient.getMyBookings).mockImplementation(
      () => new Promise(() => undefined),
    )

    renderMyBookingsRoute()

    expect(await screen.findByLabelText(/loading/i)).toBeInTheDocument()
  })

  it('paginates bookings with next button', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.getMyBookings)
      .mockResolvedValueOnce({
        count: 25,
        next: 'http://example.com?page=2',
        previous: null,
        results: [upcomingBooking],
      })
      .mockResolvedValueOnce({
        count: 25,
        next: null,
        previous: 'http://example.com?page=1',
        results: [
          {
            ...upcomingBooking,
            id: 'booking-2',
            resource_id: 13,
          },
        ],
      })

    renderMyBookingsRoute()

    await screen.findByText(/desk #12/i)
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(apiClient.getMyBookings).toHaveBeenLastCalledWith({
        bucket: 'upcoming',
        page: 2,
      })
    })
    expect(await screen.findByText(/desk #13/i)).toBeInTheDocument()
  })
})
