import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import Login from '@/pages/Login'
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

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('dispatches login and stores auth state on successful submit', async () => {
    const user = userEvent.setup()
    const store = createTestStore()

    vi.mocked(api.apiFetch)
      .mockResolvedValueOnce({ access: 'access-token', refresh: 'refresh-token' })
      .mockResolvedValueOnce({
        id: 1,
        email: 'user@example.com',
        date_joined: '2026-01-01T00:00:00Z',
      })

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>,
    )

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() => {
      const state = store.getState().auth
      expect(state.accessToken).toBe('access-token')
      expect(state.refreshToken).toBe('refresh-token')
      expect(state.user?.email).toBe('user@example.com')
      expect(state.status).toBe('succeeded')
    })
  })

  it('shows backend error message for failed login', async () => {
    const user = userEvent.setup()
    const store = createTestStore()

    vi.mocked(api.apiFetch).mockRejectedValueOnce(new api.ApiError(401, 'Invalid credentials'))

    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>,
    )

    await user.type(screen.getByLabelText(/email/i), 'user@example.com')
    await user.type(screen.getByLabelText(/^password$/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
  })
})
