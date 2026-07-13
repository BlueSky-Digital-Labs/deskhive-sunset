import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UtilisationPage from '@/features/admin/pages/UtilisationPage'
import { renderWithProviders } from '@/test/test-utils'
import * as useSpaces from '@/features/admin/hooks/useSpaces'
import * as useUtilisation from '@/features/admin/hooks/useUtilisation'

vi.mock('@/features/admin/hooks/useSpaces', () => ({
  useAdminFloors: vi.fn(),
}))

vi.mock('@/features/admin/hooks/useUtilisation', () => ({
  useUtilisation: vi.fn(),
}))

const mockReport = {
  start_date: '2026-07-07',
  end_date: '2026-07-13',
  floor_id: null,
  summary: {
    desks: {
      resource_count: 2,
      bookings_count: 4,
      checked_in_count: 3,
      utilisation_rate: 0.2857,
    },
    rooms: {
      resource_count: 1,
      bookings_count: 2,
      checked_in_count: 1,
      utilisation_rate: 0.2857,
    },
  },
  daily: [
    {
      date: '2026-07-07',
      desks: {
        bookings_count: 1,
        checked_in_count: 1,
        utilisation_rate: 0.5,
      },
      rooms: {
        bookings_count: 1,
        checked_in_count: 0,
        utilisation_rate: 1,
      },
    },
  ],
}

describe('UtilisationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useSpaces.useAdminFloors).mockReturnValue({
      data: [
        {
          id: 1,
          name: 'Open Plan',
          building: 'HQ',
          level: '3',
          is_active: true,
          created_at: '2026-07-10T00:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    vi.mocked(useUtilisation.useUtilisation).mockReturnValue({
      data: mockReport,
      isLoading: false,
      isError: false,
      error: null,
    } as never)
  })

  it('renders summary and daily utilisation data from the query hook', async () => {
    renderWithProviders(<UtilisationPage />, { route: '/admin/utilisation' })

    expect(await screen.findByRole('heading', { name: 'Utilisation' })).toBeInTheDocument()
    expect(screen.getByText('Desks summary')).toBeInTheDocument()
    expect(screen.getAllByText('28.6%').length).toBeGreaterThan(0)
    expect(screen.getByText('2026-07-07')).toBeInTheDocument()
    expect(useUtilisation.useUtilisation).toHaveBeenCalled()
  })

  it('updates query parameters when the floor filter changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UtilisationPage />, { route: '/admin/utilisation' })

    await user.selectOptions(screen.getByLabelText('Floor (optional)'), '1')

    expect(useUtilisation.useUtilisation).toHaveBeenLastCalledWith(
      expect.objectContaining({ floorId: 1 }),
    )
  })

  it('updates query parameters when the date range changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<UtilisationPage />, { route: '/admin/utilisation' })

    const startInput = screen.getByLabelText('Start date')
    await user.clear(startInput)
    await user.type(startInput, '2026-07-01')

    expect(useUtilisation.useUtilisation).toHaveBeenLastCalledWith(
      expect.objectContaining({ startDate: '2026-07-01' }),
    )
  })
})
