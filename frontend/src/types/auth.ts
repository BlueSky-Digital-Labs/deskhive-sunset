export interface User {
  id: number
  email: string
  date_joined: string
  is_staff?: boolean
  is_superuser?: boolean
}

export type AuthStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  status: AuthStatus
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  email: string
  password: string
}

export interface TokenPair {
  access: string
  refresh: string
}

export interface RefreshResponse {
  access: string
}
