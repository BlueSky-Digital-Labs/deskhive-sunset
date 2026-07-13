import { logout, setTokens } from '@/features/auth/authSlice'
import { HttpError, parseJsonBody, extractErrorMessage, readJsonResponse } from '@/lib/http'

export { HttpError as ApiError, isConflictError, isConflictStatus } from '@/lib/http'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function getStore() {
  const module = await import('@/app/store')
  return module.store
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
  skipRefresh?: boolean
}

let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    const store = await getStore()
    const { refreshToken } = store.getState().auth
    if (!refreshToken) {
      return null
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      })

      const data = await parseJsonBody(response)
      if (!response.ok) {
        return null
      }

      const access = (data as { access?: string }).access
      if (!access) {
        return null
      }

      store.dispatch(setTokens({ accessToken: access }))
      localStorage.setItem('accessToken', access)
      return access
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const store = await getStore()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (!options.skipAuth) {
    const accessToken = store.getState().auth.accessToken
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  const requestInit: RequestInit = {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  }

  let response = await fetch(`${API_BASE}${path}`, requestInit)

  if (
    response.status === 401 &&
    !options.skipAuth &&
    !options.skipRefresh
  ) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) {
      headers.set('Authorization', `Bearer ${newAccessToken}`)
      response = await fetch(`${API_BASE}${path}`, {
        ...requestInit,
        headers,
      })
    } else {
      store.dispatch(logout())
      const data = await parseJsonBody(response)
      throw new HttpError(
        401,
        extractErrorMessage(data, 'Authentication required'),
        data,
      )
    }
  }

  return readJsonResponse<T>(response)
}
