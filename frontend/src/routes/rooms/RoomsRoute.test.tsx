import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import RoomsRoute from '@/routes/rooms/RoomsRoute'
import { createTestStore } from '@/test/test-utils'
import * as spacesApi from '@/features/spaces/api'
import * as apiClient from '@/lib/apiClient'

vi.mock('@/features/spaces/api', () => ({
  getRoomAvailability: vi.fn(),
  getRooms: vi.fn(),
}))

vi.mock('@/lib/apiClient', () => ({
  postBooking: vi.fn(),
  postCancel: vi.fn(),
  getBookings: vi.fn(),
}))

function renderRoomsRoute() {
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
        <MemoryRouter>
          <RoomsRoute />
        </MemoryRouter>
      </Provider>,
    ),
  }
}

describe('RoomsRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(spacesApi.getRoomAvailability).mockResolvedValue([
      {
        id: 5,
        name: 'Conference Room',
        floor: 1,
        capacity: 8,
        available: true,
      },
    ])
    vi.mocked(apiClient.getBookings).mockResolvedValue([])
  })

  it('renders rooms and books a slot successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.postBooking).mockResolvedValue({
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

    renderRoomsRoute()

    expect(await screen.findByText('Conference Room')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /book slot/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      /room booked successfully/i,
    )
    expect(apiClient.postBooking).toHaveBeenCalled()
  })

  it('shows inline conflict error on 409 booking failure', async () => {
    const user = userEvent.setup()
    const { ApiError } = await import('@/lib/api')
    vi.mocked(apiClient.postBooking).mockRejectedValue(
      new ApiError(409, 'Room is already booked for the requested time range.'),
    )

    renderRoomsRoute()

    await screen.findByText('Conference Room')
    await user.click(screen.getByRole('button', { name: /book slot/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /already booked/i,
    )
  })

  it('cancels an existing booking', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.getBookings).mockResolvedValue([
      {
        id: 'booking-9',
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
    ])
    vi.mocked(apiClient.postCancel).mockResolvedValue(undefined)

    renderRoomsRoute()

    const cancelButton = await screen.findByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(apiClient.postCancel).toHaveBeenCalledWith('booking-9')
    })
  })

  it('shows validation error when start is not before end', async () => {
    const user = userEvent.setup()

    renderRoomsRoute()

    await screen.findByText('Conference Room')

    const startInput = screen.getByLabelText(/^start time$/i)
    const endInput = screen.getByLabelText(/^end time$/i)

    await user.clear(startInput)
    await user.type(startInput, '12:00')
    await user.clear(endInput)
    await user.type(endInput, '10:00')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /start time must be before end time/i,
    )
  })

  it('shows loading skeleton while rooms are loading', async () => {
    vi.mocked(spacesApi.getRoomAvailability).mockImplementation(
      () => new Promise(() => undefined),
    )

    renderRoomsRoute()

    expect(await screen.findByLabelText(/loading/i)).toBeInTheDocument()
  })
})
