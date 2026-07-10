import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@components/ProtectedRoute'
import { createTestStore } from '@/test/test-utils'

function renderProtectedRoute(isAuthenticated: boolean) {
  const store = createTestStore(
    isAuthenticated
      ? {
          accessToken: 'token',
          refreshToken: 'refresh',
          user: {
            id: 1,
            email: 'user@example.com',
            date_joined: '2026-01-01T00:00:00Z',
          },
          status: 'succeeded',
        }
      : {
          accessToken: null,
          refreshToken: null,
          user: null,
          status: 'idle',
        },
  )

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

describe('ProtectedRoute', () => {
  it('renders children for authenticated users', () => {
    renderProtectedRoute(true)
    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', () => {
    renderProtectedRoute(false)
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })
})
