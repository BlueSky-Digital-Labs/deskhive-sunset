import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import FloorsPage from '@/features/spaces/FloorsPage'
import { createTestStore } from '@/test/test-utils'
import * as spacesApi from '@/features/spaces/api'

vi.mock('@/features/spaces/api', () => ({
  getFloors: vi.fn(),
}))

function renderFloorsPage() {
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
        <FloorsPage />
      </MemoryRouter>
    </Provider>,
  )
}

describe('FloorsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists floors with building and level details', async () => {
    vi.mocked(spacesApi.getFloors).mockResolvedValueOnce([
      {
        id: 1,
        name: 'Open Plan',
        building: 'HQ',
        level: '3',
        is_active: true,
        created_at: '2026-07-10T00:00:00Z',
      },
    ])

    renderFloorsPage()

    expect(await screen.findByText('Open Plan')).toBeInTheDocument()
    expect(screen.getByText('HQ · Level 3')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows empty state when no floors are returned', async () => {
    vi.mocked(spacesApi.getFloors).mockResolvedValueOnce([])

    renderFloorsPage()

    expect(
      await screen.findByText(/no floors found/i),
    ).toBeInTheDocument()
  })

  it('shows API errors to the user', async () => {
    vi.mocked(spacesApi.getFloors).mockRejectedValueOnce(
      Object.assign(new Error('Server error'), { name: 'ApiError', status: 500 }),
    )

    renderFloorsPage()

    await waitFor(() => {
      expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
    })
  })
})
