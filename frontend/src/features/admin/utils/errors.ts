import { ApiError } from '@/lib/api'

export function getAdminErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'Admins only'
    }
    if (error.status === 401) {
      return 'Please sign in to continue'
    }
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}
