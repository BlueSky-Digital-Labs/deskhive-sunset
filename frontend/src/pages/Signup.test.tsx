import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import Signup from '@/pages/Signup'
import { createTestStore } from '@/test/test-utils'
import * as api from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

describe('Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('registers then logs in and updates auth state', async () => {
    const user = userEvent.setup()
    const store = createTestStore()

    vi.mocked(api.apiFetch)
      .mockResolvedValueOnce({
        id: 1,
        email: 'new@example.com',
        date_joined: '2026-01-01T00:00:00Z',
      })
      .mockResolvedValueOnce({ access: 'access-token', refresh: 'refresh-token' })
      .mockResolvedValueOnce({
        id: 1,
        email: 'new@example.com',
        date_joined: '2026-01-01T00:00:00Z',
      })

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      </Provider>,
    )

    await user.type(screen.getByLabelText(/email/i), 'new@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^create account$/i }))

    await waitFor(() => {
      const state = store.getState().auth
      expect(state.accessToken).toBe('access-token')
      expect(state.user?.email).toBe('new@example.com')
      expect(state.status).toBe('succeeded')
    })
  })

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup()
    const store = createTestStore()

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Signup />
        </MemoryRouter>
      </Provider>,
    )

    await user.type(screen.getByLabelText(/email/i), 'new@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'different')
    await user.click(screen.getByRole('button', { name: /^create account$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(api.apiFetch).not.toHaveBeenCalled()
  })
})
