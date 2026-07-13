import type { User } from '@/types/auth'

interface JwtPayload {
  is_staff?: boolean
  is_superuser?: boolean
}

function decodeJwtPayload(accessToken: string): JwtPayload | null {
  try {
    const [, payload] = accessToken.split('.')
    if (!payload) {
      return null
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized)
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export function deriveIsAdmin(user: User | null, accessToken: string | null): boolean {
  if (user?.is_staff || user?.is_superuser) {
    return true
  }

  if (!accessToken) {
    return false
  }

  const payload = decodeJwtPayload(accessToken)
  return Boolean(payload?.is_staff || payload?.is_superuser)
}
