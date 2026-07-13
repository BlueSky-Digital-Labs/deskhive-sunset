import { http } from '@/lib/api/http'

export { HttpError as ApiError, isConflictError, isConflictStatus } from '@/lib/http'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
  skipRefresh?: boolean
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return http<T>(path, {
    method: options.method ?? 'GET',
    body: options.body,
    auth: !options.skipAuth,
    headers: options.headers,
    skipRefresh: options.skipRefresh,
  })
}
