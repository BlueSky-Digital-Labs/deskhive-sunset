import { apiFetch } from '@/lib/api'
import { LoginCredentials, SignupCredentials, TokenPair, User } from '@/types/auth'

class AuthService {
  async login(credentials: LoginCredentials): Promise<TokenPair> {
    return apiFetch<TokenPair>('/api/v1/auth/login/', {
      method: 'POST',
      body: credentials,
      skipAuth: true,
      skipRefresh: true,
    })
  }

  async register(credentials: SignupCredentials): Promise<User> {
    return apiFetch<User>('/api/v1/auth/register/', {
      method: 'POST',
      body: credentials,
      skipAuth: true,
      skipRefresh: true,
    })
  }

  async getCurrentUser(): Promise<User> {
    return apiFetch<User>('/api/v1/auth/me/')
  }

  async refreshToken(refreshToken: string): Promise<{ access: string }> {
    return apiFetch<{ access: string }>('/api/v1/auth/refresh/', {
      method: 'POST',
      body: { refresh: refreshToken },
      skipAuth: true,
      skipRefresh: true,
    })
  }
}

export const authService = new AuthService()
