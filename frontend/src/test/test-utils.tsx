import { configureStore } from '@reduxjs/toolkit'
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
        ...preloadedState?.myBookings,
      },
    },
  })
}

export type TestStore = ReturnType<typeof createTestStore>
export type TestAuthStatus = AuthStatus
