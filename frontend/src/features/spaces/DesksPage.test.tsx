import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import DesksPage from '@/features/spaces/DesksPage'
import { createTestStore } from '@/test/test-utils'
import * as spacesApi from '@/features/spaces/api'

vi.mock('@/features/spaces/api', () => ({
  getFloors: vi.fn(),
  getDeskAvailability: vi.fn(),
}))

function renderDesksPage() {
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
        <DesksPage />
      </MemoryRouter>
    </Provider>,
  )
}

describe('DesksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(spacesApi.getFloors).mockResolvedValue([
      {
        id: 1,
        name: 'Open Plan',
        building: 'HQ',
        level: '3',
        is_active: true,
        created_at: '2026-07-10T00:00:00Z',
      },
    ])
  })

  it('fetches desk availability for the selected date and renders desks', async () => {
    vi.mocked(spacesApi.getDeskAvailability).mockResolvedValue([
      {
        id: 10,
        name: 'Desk A1',
        floor: 1,
        available: true,
      },
    ])

    renderDesksPage()

    await waitFor(() => {
      expect(spacesApi.getDeskAvailability).toHaveBeenCalled()
    })

    expect(await screen.findByText('Desk A1')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('refetches availability when the date changes', async () => {
    const user = userEvent.setup()

    vi.mocked(spacesApi.getDeskAvailability).mockResolvedValue([])

    renderDesksPage()

    await waitFor(() => {
      expect(spacesApi.getDeskAvailability).toHaveBeenCalledTimes(1)
    })

    const dateInput = screen.getByLabelText(/date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2026-08-01')

    await waitFor(() => {
      expect(spacesApi.getDeskAvailability).toHaveBeenCalledWith('2026-08-01')
    })
  })
})
