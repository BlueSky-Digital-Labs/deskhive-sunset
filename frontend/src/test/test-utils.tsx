import { configureStore } from '@reduxjs/toolkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import type { ReactElement, ReactNode } from 'react'
import authReducer from '@store/authSlice'
import roomBookingsReducer from '@/features/rooms/roomBookingsSlice'
import roomAvailabilityReducer from '@/features/rooms/roomAvailabilitySlice'
import myBookingsReducer from '@/features/myBookings/myBookingsSlice'
import type { AuthState, AuthStatus } from '@/types/auth'
import type { RoomAvailabilityState } from '@/features/rooms/roomAvailabilitySlice'
import type { RoomBookingState } from '@/features/rooms/roomBookingsSlice'
import type { MyBookingsState } from '@/features/myBookings/myBookingsSlice'

export function createTestStore(
  preloadedAuth?: Partial<AuthState>,
  preloadedState?: {
    roomBookings?: Partial<RoomBookingState>
    roomAvailability?: Partial<RoomAvailabilityState>
    myBookings?: Partial<MyBookingsState>
  },
) {
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
      roomBookings: roomBookingsReducer,
      roomAvailability: roomAvailabilityReducer,
      myBookings: myBookingsReducer,
    },
    preloadedState: {
      auth: defaultAuth,
      roomBookings: {
        creating: 'idle' as const,
        cancellingById: {},
        bookings: [],
        bookingsStatus: 'idle' as const,
        ...preloadedState?.roomBookings,
      },
      roomAvailability: {
        status: 'idle' as const,
        rooms: [],
        usedManualFallback: false,
        ...preloadedState?.roomAvailability,
      },
      myBookings: {
        bucket: 'upcoming' as const,
        pages: {},
        cancellingById: {},
        cancelRollbackById: {},
        checkingInById: {},
        checkInRollbackById: {},
        ...preloadedState?.myBookings,
      },
    },
  })
}

export type TestStore = ReturnType<typeof createTestStore>
export type TestAuthStatus = AuthStatus

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: TestStore
  queryClient?: QueryClient
  route?: string
}

export function renderWithProviders(
  ui: ReactElement,
  {
    store = createTestStore(),
    queryClient = createTestQueryClient(),
    route = '/',
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </QueryClientProvider>
      </Provider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
