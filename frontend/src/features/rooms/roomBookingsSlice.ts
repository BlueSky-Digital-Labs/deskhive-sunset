import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit'
import { ApiError } from '@/lib/api'
import { getBookings, postBooking, postCancel } from '@/lib/apiClient'
import type { BookingRecord } from '@/lib/apiClient'
import type { RootState } from '@store/index'

export type AsyncStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

export interface RoomBookingError {
  code: number
  message: string
}

export interface RoomBookingState {
  creating: AsyncStatus
  lastError?: RoomBookingError
  lastSuccessMessage?: string
  cancellingById: Record<string, AsyncStatus>
  bookings: BookingRecord[]
  bookingsStatus: AsyncStatus
}

const initialState: RoomBookingState = {
  creating: 'idle',
  cancellingById: {},
  bookings: [],
  bookingsStatus: 'idle',
}

export const createRoomBooking = createAsyncThunk<
  BookingRecord,
  { roomId: number; startAt: string; endAt: string },
  { rejectValue: RoomBookingError }
>(
  'roomBookings/createRoomBooking',
  async ({ roomId, startAt, endAt }, { rejectWithValue }) => {
    try {
      return await postBooking({
        resource_type: 'room',
        resource_id: String(roomId),
        start_at: startAt,
        end_at: endAt,
      })
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue({
          code: error.status,
          message: error.message,
        })
      }

      return rejectWithValue({
        code: 0,
        message: 'Failed to create room booking.',
      })
    }
  },
)

export const cancelBooking = createAsyncThunk<
  string,
  { bookingId: string },
  { rejectValue: { bookingId: string; error: RoomBookingError } }
>(
  'roomBookings/cancelBooking',
  async ({ bookingId }, { rejectWithValue }) => {
    try {
      await postCancel(bookingId)
      return bookingId
    } catch (error) {
      const bookingError: RoomBookingError =
        error instanceof ApiError
          ? { code: error.status, message: error.message }
          : { code: 0, message: 'Failed to cancel booking.' }

      return rejectWithValue({ bookingId, error: bookingError })
    }
  },
)

export const fetchMyBookings = createAsyncThunk<BookingRecord[]>(
  'roomBookings/fetchMyBookings',
  async () => getBookings(),
)

const roomBookingsSlice = createSlice({
  name: 'roomBookings',
  initialState,
  reducers: {
    clearBookingFeedback(state) {
      state.lastError = undefined
      state.lastSuccessMessage = undefined
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRoomBooking.pending, (state) => {
        state.creating = 'pending'
        state.lastError = undefined
        state.lastSuccessMessage = undefined
      })
      .addCase(createRoomBooking.fulfilled, (state, action) => {
        state.creating = 'succeeded'
        state.lastSuccessMessage = 'Room booked successfully.'
        state.bookings = [
          action.payload,
          ...state.bookings.filter((booking) => booking.id !== action.payload.id),
        ]
      })
      .addCase(createRoomBooking.rejected, (state, action) => {
        state.creating = 'failed'
        if (action.payload) {
          state.lastError = action.payload
        }
      })
      .addCase(cancelBooking.pending, (state, action) => {
        const bookingId = action.meta.arg.bookingId
        state.cancellingById[bookingId] = 'pending'
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const bookingId = action.payload
        state.cancellingById[bookingId] = 'succeeded'
        state.bookings = state.bookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'cancelled' }
            : booking,
        )
        state.lastSuccessMessage = 'Booking cancelled.'
        state.lastError = undefined
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        const bookingId = action.meta.arg.bookingId
        state.cancellingById[bookingId] = 'failed'
        if (action.payload) {
          state.lastError = action.payload.error
        }
      })
      .addCase(fetchMyBookings.pending, (state) => {
        state.bookingsStatus = 'pending'
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.bookingsStatus = 'succeeded'
        state.bookings = action.payload
      })
      .addCase(fetchMyBookings.rejected, (state) => {
        state.bookingsStatus = 'failed'
      })
  },
})

export const { clearBookingFeedback } = roomBookingsSlice.actions

export const selectRoomBookingsState = (state: RootState) => state.roomBookings
export const selectCreatingStatus = (state: RootState) => state.roomBookings.creating
export const selectLastBookingError = (state: RootState) => state.roomBookings.lastError
export const selectLastBookingSuccess = (state: RootState) =>
  state.roomBookings.lastSuccessMessage
export const selectCancellingById = (state: RootState) =>
  state.roomBookings.cancellingById

const selectAllBookings = (state: RootState) => state.roomBookings.bookings

export const selectMyRoomBookings = createSelector([selectAllBookings], (bookings) =>
  bookings.filter(
    (booking) =>
      booking.resource_type === 'room' && booking.status !== 'cancelled',
  ),
)

export default roomBookingsSlice.reducer
