import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth/tokenStore'
import {
  HttpError,
  extractErrorMessage,
  parseJsonBody,
  readJsonResponse,
} from '@/lib/http'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export interface HttpOptions {
  method?: string
  body?: unknown
  auth?: boolean
  headers?: HeadersInit
  skipRefresh?: boolean
}

let refreshInFlight: Promise<string | null> | null = null

async function getStore() {
  const module = await import('@/app/store')
  return module.store
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    try {
      const store = await getStore()
      const { refreshToken } = store.getState().auth
      if (!refreshToken) {
        return null
      }

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

      const { setTokens } = await import('@/features/auth/authSlice')
      store.dispatch(setTokens({ accessToken: access }))
      setAccessToken(access)
      return access
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function handleUnauthorized(): Promise<void> {
  clearAccessToken()
  const store = await getStore()
  const { logout } = await import('@/features/auth/authSlice')
  store.dispatch(logout())

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    headers: customHeaders,
    skipRefresh = false,
  } = options

  const headers = new Headers(customHeaders)
  if (!headers.has('Content-Type') && body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (auth) {
    const token = getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const requestInit: RequestInit = {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }

  let response = await fetch(`${API_BASE}${path}`, requestInit)

  if (response.status === 401 && auth && !skipRefresh) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) {
      headers.set('Authorization', `Bearer ${newAccessToken}`)
      response = await fetch(`${API_BASE}${path}`, {
        ...requestInit,
        headers,
      })
    } else {
      await handleUnauthorized()
      const data = await parseJsonBody(response)
      throw new HttpError(
        401,
        extractErrorMessage(data, 'Authentication required'),
        data,
      )
    }
  } else if (response.status === 401 && auth) {
    await handleUnauthorized()
    const data = await parseJsonBody(response)
    throw new HttpError(
      401,
      extractErrorMessage(data, 'Authentication required'),
      data,
    )
  }

  return readJsonResponse<T>(response)
}

export { HttpError } from '@/lib/http'
