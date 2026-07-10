import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@store/authSlice'
import type { AuthState, AuthStatus } from '@/types/auth'

export function createTestStore(preloadedAuth?: Partial<AuthState>) {
  const defaultAuth: AuthState = {
    accessToken: null,
    refreshToken: null,
    user: null,
    status: 'idle',
    error: null,
    ...preloadedAuth,
  }

  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: defaultAuth,
    },
  })
}

export type TestStore = ReturnType<typeof createTestStore>
export type TestAuthStatus = AuthStatus
