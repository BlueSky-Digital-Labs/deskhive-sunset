import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { clearAccessToken, setAccessToken } from '@/lib/auth/tokenStore'
import { apiFetch, ApiError } from '@/lib/api'
import {
  AuthState,
  LoginCredentials,
  SignupCredentials,
  TokenPair,
  User,
} from '@/types/auth'

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

const initialState: AuthState = {
  accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  user: null,
  status: 'idle',
  error: null,
}

function persistTokens(accessToken: string | null, refreshToken: string | null) {
  setAccessToken(accessToken)

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export const login = createAsyncThunk<
  { user: User; accessToken: string; refreshToken: string },
  LoginCredentials,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const tokens = await apiFetch<TokenPair>('/api/v1/auth/login/', {
      method: 'POST',
      body: credentials,
      skipAuth: true,
      skipRefresh: true,
    })

    persistTokens(tokens.access, tokens.refresh)

    const user = await apiFetch<User>('/api/v1/auth/me/', {
      method: 'GET',
      skipAuth: true,
      skipRefresh: true,
      headers: {
        Authorization: `Bearer ${tokens.access}`,
      },
    })

    return {
      user,
      accessToken: tokens.access,
      refreshToken: tokens.refresh,
    }
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Login failed'))
  }
})

export const signup = createAsyncThunk<
  { user: User; accessToken: string; refreshToken: string },
  SignupCredentials,
  { rejectValue: string }
>('auth/signup', async (credentials, { dispatch, rejectWithValue }) => {
  try {
    await apiFetch<User>('/api/v1/auth/register/', {
      method: 'POST',
      body: credentials,
      skipAuth: true,
      skipRefresh: true,
    })

    return await dispatch(login(credentials)).unwrap()
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Signup failed'))
  }
})

export const refresh = createAsyncThunk<
  { accessToken: string; user: User },
  void,
  { rejectValue: string; state: { auth: AuthState } }
>('auth/refresh', async (_, { getState, rejectWithValue }) => {
  const refreshToken = getState().auth.refreshToken
  if (!refreshToken) {
    return rejectWithValue('No refresh token available')
  }

  try {
    const tokenResponse = await apiFetch<{ access: string }>('/api/v1/auth/refresh/', {
      method: 'POST',
      body: { refresh: refreshToken },
      skipAuth: true,
      skipRefresh: true,
    })

    persistTokens(tokenResponse.access, refreshToken)

    const user = await apiFetch<User>('/api/v1/auth/me/', {
      method: 'GET',
      skipAuth: true,
      skipRefresh: true,
      headers: {
        Authorization: `Bearer ${tokenResponse.access}`,
      },
    })

    return {
      accessToken: tokenResponse.access,
      user,
    }
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Token refresh failed'))
  }
})

export const fetchProfile = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await apiFetch<User>('/api/v1/auth/me/')
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load profile'))
    }
  },
)

export const logoutThunk = createAsyncThunk<void, void>('auth/logout', async () => {
  return undefined
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string
        user: { id: string; email: string }
        refreshToken?: string
      }>,
    ) => {
      state.accessToken = action.payload.accessToken
      state.user = {
        id: Number(action.payload.user.id),
        email: action.payload.user.email,
        date_joined: state.user?.date_joined ?? new Date().toISOString(),
      }
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken
      }
      persistTokens(state.accessToken, state.refreshToken)
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string }>) => {
      state.accessToken = action.payload.accessToken
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken
      }
      persistTokens(state.accessToken, state.refreshToken)
    },
    logout: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      state.status = 'idle'
      state.error = null
      clearAccessToken()
      persistTokens(null, null)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.user = action.payload.user
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Login failed'
      })
      .addCase(signup.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.accessToken = action.payload.accessToken
        state.refreshToken = action.payload.refreshToken
        state.user = action.payload.user
        state.error = null
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Signup failed'
      })
      .addCase(refresh.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(refresh.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.accessToken = action.payload.accessToken
        state.user = action.payload.user
        state.error = null
      })
      .addCase(refresh.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Token refresh failed'
        state.accessToken = null
        state.refreshToken = null
        state.user = null
        persistTokens(null, null)
      })
      .addCase(fetchProfile.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload
        state.error = null
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Failed to load profile'
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.accessToken = null
        state.refreshToken = null
        state.user = null
        state.status = 'idle'
        state.error = null
        persistTokens(null, null)
      })
  },
})

export const { clearError, logout, setCredentials, setTokens } = authSlice.actions

export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken

export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  Boolean(state.auth.accessToken && state.auth.user)

export const selectIsAuthLoading = (state: { auth: AuthState }) => state.auth.status === 'loading'

export default authSlice.reducer
