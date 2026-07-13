import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clearAccessToken, setAccessToken } from '@/lib/auth/tokenStore'
import { HttpError } from '@/lib/http'
import { http } from '@/lib/api/http'

const mockDispatch = vi.fn()
const mockGetState = vi.fn()

vi.mock('@/app/store', () => ({
  store: {
    dispatch: (...args: unknown[]) => mockDispatch(...args),
    getState: () => mockGetState(),
  },
}))

describe('http client', () => {
  const originalFetch = global.fetch
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    clearAccessToken()
    mockGetState.mockReturnValue({
      auth: { refreshToken: null },
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('sends JSON requests with authorization when auth is enabled', async () => {
    setAccessToken('test-token')

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await http<{ ok: boolean }>('/api/v1/test', {
      method: 'POST',
      body: { name: 'Desk' },
    })

    expect(result).toEqual({ ok: true })
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Desk' }),
      }),
    )

    const [, init] = vi.mocked(global.fetch).mock.calls[0]
    const headers = init?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer test-token')
  })

  it('throws HttpError for non-OK responses', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(http('/api/v1/missing', { auth: false })).rejects.toEqual(
      expect.objectContaining({
        status: 404,
        message: 'Not found',
      }),
    )
  })

  it('redirects to login and dispatches logout on 401 when refresh fails', async () => {
    setAccessToken('expired-token')
    const assign = vi.fn()

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, pathname: '/dashboard', assign },
    })

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(http('/api/v1/protected')).rejects.toBeInstanceOf(HttpError)

    expect(mockDispatch).toHaveBeenCalled()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('retries once after refreshing the access token', async () => {
    setAccessToken('old-token')
    mockGetState.mockReturnValue({
      auth: { refreshToken: 'refresh-token' },
    })

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'expired' }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access: 'new-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    const result = await http<{ id: number }>('/api/v1/bookings/')

    expect(result).toEqual({ id: 1 })
    expect(global.fetch).toHaveBeenCalledTimes(3)
    expect(mockDispatch).toHaveBeenCalled()
  })
})
