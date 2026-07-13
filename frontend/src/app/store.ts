import { configureStore } from '@reduxjs/toolkit'
import authReducer from '@/features/auth/authSlice'
import deskAvailabilityReducer from '@/features/desks/deskAvailabilitySlice'
import deskBookingsReducer from '@/features/desks/deskBookingsSlice'
import roomBookingsReducer from '@/features/rooms/roomBookingsSlice'
import roomAvailabilityReducer from '@/features/rooms/roomAvailabilitySlice'
import myBookingsReducer from '@/features/myBookings/myBookingsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    deskAvailability: deskAvailabilityReducer,
    deskBookings: deskBookingsReducer,
    roomBookings: roomBookingsReducer,
    roomAvailability: roomAvailabilityReducer,
    myBookings: myBookingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
