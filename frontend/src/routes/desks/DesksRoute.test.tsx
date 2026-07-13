import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import DesksRoute from '@/routes/desks/DesksRoute'
import { createTestStore } from '@/test/test-utils'
import { ToastProvider } from '@/lib/toast'
import * as apiClient from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => ({
  fetchJson: vi.fn(),
  postDeskBooking: vi.fn(),
  deleteDeskBooking: vi.fn(),
}))

function renderDesksRoute() {
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
          <MemoryRouter>
            <DesksRoute />
          </MemoryRouter>
        </ToastProvider>
      </Provider>,
    ),
  }
}

describe('DesksRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.fetchJson).mockImplementation(async ({ path }) => {
      if (path.startsWith('/api/v1/availability/desks/')) {
        return [
          {
            id: 3,
            name: 'Desk A1',
            floor: 1,
            available: true,
          },
        ]
      }

      if (path === '/api/v1/bookings/') {
        return {
          count: 0,
          next: null,
          previous: null,
          results: [],
        }
      }

      return null
    })
  })

  it('renders desks and books successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.postDeskBooking).mockResolvedValue({
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
    })

    renderDesksRoute()

    expect(await screen.findByText('Desk A1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^book$/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      /desk booked successfully/i,
    )
    expect(apiClient.postDeskBooking).toHaveBeenCalled()
  })

  it('shows inline conflict error on 409 booking failure', async () => {
    const user = userEvent.setup()
    const { HttpError } = await import('@/lib/http')
    vi.mocked(apiClient.postDeskBooking).mockRejectedValue(
      new HttpError(409, 'Desk is already booked for this date.'),
    )

    renderDesksRoute()

    await screen.findByText('Desk A1')
    await user.click(screen.getByRole('button', { name: /^book$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already booked/i)
  })

  it('cancels an existing booking', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.fetchJson).mockImplementation(async ({ path }) => {
      if (path.startsWith('/api/v1/availability/desks/')) {
        return [
          {
            id: 3,
            name: 'Desk A1',
            floor: 1,
            available: false,
          },
        ]
      }

      if (path === '/api/v1/bookings/') {
        return {
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 'booking-9',
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
            },
          ],
        }
      }

      return null
    })
    vi.mocked(apiClient.deleteDeskBooking).mockResolvedValue(undefined)

    renderDesksRoute()

    const cancelButton = await screen.findByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(apiClient.deleteDeskBooking).toHaveBeenCalledWith('booking-9')
    })
  })

  it('shows loading skeleton while desks are loading', async () => {
    vi.mocked(apiClient.fetchJson).mockImplementation(({ path }) => {
      if (path.startsWith('/api/v1/availability/desks/')) {
        return new Promise(() => undefined)
      }

      if (path === '/api/v1/bookings/') {
        return Promise.resolve({
          count: 0,
          next: null,
          previous: null,
          results: [],
        })
      }

      return Promise.resolve(null)
    })

    renderDesksRoute()

    expect(await screen.findByLabelText(/loading/i)).toBeInTheDocument()
  })
})
