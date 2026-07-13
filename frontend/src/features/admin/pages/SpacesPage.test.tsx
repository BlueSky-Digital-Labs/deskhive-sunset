import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SpacesPage from '@/features/admin/pages/SpacesPage'
import { renderWithProviders } from '@/test/test-utils'
import * as useSpaces from '@/features/admin/hooks/useSpaces'

vi.mock('@/features/admin/hooks/useSpaces', () => ({
  useAdminFloors: vi.fn(),
  useAdminDesks: vi.fn(),
  useAdminRooms: vi.fn(),
  useCreateFloor: vi.fn(),
  useUpdateFloor: vi.fn(),
  useDeleteFloor: vi.fn(),
  useToggleFloorActive: vi.fn(),
  useCreateDesk: vi.fn(),
  useUpdateDesk: vi.fn(),
  useDeleteDesk: vi.fn(),
  useToggleDeskActive: vi.fn(),
  useCreateRoom: vi.fn(),
  useUpdateRoom: vi.fn(),
  useDeleteRoom: vi.fn(),
  useToggleRoomActive: vi.fn(),
}))

function mockMutation() {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }
}

function setupSpacesHooks() {
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

  vi.mocked(useSpaces.useAdminDesks).mockReturnValue({
    data: [
      {
        id: 10,
        name: 'Desk A1',
        floor: 1,
        is_active: true,
      },
    ],
    isLoading: false,
    isError: false,
    error: null,
  } as never)

  vi.mocked(useSpaces.useAdminRooms).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  } as never)

  vi.mocked(useSpaces.useCreateFloor).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useUpdateFloor).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useDeleteFloor).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useToggleFloorActive).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useCreateDesk).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useUpdateDesk).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useDeleteDesk).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useToggleDeskActive).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useCreateRoom).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useUpdateRoom).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useDeleteRoom).mockReturnValue(mockMutation() as never)
  vi.mocked(useSpaces.useToggleRoomActive).mockReturnValue(mockMutation() as never)
}

describe('SpacesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSpacesHooks()
  })

  it('renders floors tab and lists floors from the query hook', async () => {
    renderWithProviders(<SpacesPage />, { route: '/admin/spaces' })

    expect(await screen.findByText('Manage Spaces')).toBeInTheDocument()
    expect(screen.getByText('Open Plan')).toBeInTheDocument()
    expect(useSpaces.useAdminFloors).toHaveBeenCalled()
  })

  it('switches tabs and shows desks data', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SpacesPage />, { route: '/admin/spaces' })

    await user.click(screen.getByRole('tab', { name: 'Desks' }))

    expect(await screen.findByText('Desk A1')).toBeInTheDocument()
    expect(useSpaces.useAdminDesks).toHaveBeenCalled()
  })

  it('toggles floor active status through the mutation hook', async () => {
    const toggleFloor = mockMutation()
    vi.mocked(useSpaces.useToggleFloorActive).mockReturnValue(toggleFloor as never)

    const user = userEvent.setup()
    renderWithProviders(<SpacesPage />, { route: '/admin/spaces' })

    await user.click(await screen.findByRole('button', { name: /toggle open plan active status/i }))

    await waitFor(() => {
      expect(toggleFloor.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, name: 'Open Plan' }),
      )
    })
  })
})
