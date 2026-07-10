import { logout, setTokens } from '@store/authSlice'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function getStore() {
  const module = await import('@store/index')
  return module.store
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
  skipRefresh?: boolean
}

let refreshInFlight: Promise<string | null> | null = null

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback
  }

  const record = data as Record<string, unknown>

  if (typeof record.detail === 'string') {
    return record.detail
  }

  if (Array.isArray(record.non_field_errors) && typeof record.non_field_errors[0] === 'string') {
    return record.non_field_errors[0]
  }

  const firstFieldError = Object.values(record).find((value) => Array.isArray(value) && typeof value[0] === 'string')
  if (Array.isArray(firstFieldError) && typeof firstFieldError[0] === 'string') {
    return firstFieldError[0]
  }

  return fallback
}

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

      const data = await parseResponseBody(response)
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
      const data = await parseResponseBody(response)
      throw new ApiError(
        401,
        extractErrorMessage(data, 'Authentication required'),
        data,
      )
    }
  }

  const data = await parseResponseBody(response)

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(data, `Request failed with status ${response.status}`),
      data,
    )
  }

  return data as T
}
