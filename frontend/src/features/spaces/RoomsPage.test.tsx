import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import RoomsPage from '@/features/spaces/RoomsPage'
import { createTestStore } from '@/test/test-utils'
import * as spacesApi from '@/features/spaces/api'

vi.mock('@/features/spaces/api', () => ({
  getRoomAvailability: vi.fn(),
}))

function renderRoomsPage() {
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

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <RoomsPage />
      </MemoryRouter>
    </Provider>,
  )
}

describe('RoomsPage', () => {
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
  })

  it('fetches room availability when the datetime range is valid', async () => {
    renderRoomsPage()

    await waitFor(() => {
      expect(spacesApi.getRoomAvailability).toHaveBeenCalled()
    })

    expect(await screen.findByText('Conference Room')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('shows validation error when start is not before end', async () => {
    renderRoomsPage()

    await waitFor(() => {
      expect(spacesApi.getRoomAvailability).toHaveBeenCalled()
    })

    vi.mocked(spacesApi.getRoomAvailability).mockClear()

    const startInput = screen.getByLabelText(/^start$/i)
    const endInput = screen.getByLabelText(/^end$/i)

    fireEvent.change(endInput, { target: { value: '2026-07-10T10:00' } })
    fireEvent.change(startInput, { target: { value: '2026-07-10T12:00' } })

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(/start time must be before end time/i)

    await waitFor(() => {
      expect(spacesApi.getRoomAvailability).not.toHaveBeenCalled()
    })
  })
})
