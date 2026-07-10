import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import roomBookingsReducer from '@/features/rooms/roomBookingsSlice'
import roomAvailabilityReducer from '@/features/rooms/roomAvailabilitySlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    roomBookings: roomBookingsReducer,
    roomAvailability: roomAvailabilityReducer,
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
