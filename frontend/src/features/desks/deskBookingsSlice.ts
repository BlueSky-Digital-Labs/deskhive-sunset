import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit'
import { deleteDeskBooking, fetchJson, postDeskBooking, type BookingRecord } from '@/lib/apiClient'
import { HttpError } from '@/lib/http'
import type { RootState } from '@/app/store'

export type AsyncStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

export interface DeskBookingError {
  code: number
  message: string
}

export interface DeskBookingState {
  creating: AsyncStatus
  lastError?: DeskBookingError
  lastSuccessMessage?: string
  cancellingById: Record<string, AsyncStatus>
  cancelRollbackById: Record<string, BookingRecord>
  bookings: BookingRecord[]
  bookingsStatus: AsyncStatus
}

const initialState: DeskBookingState = {
  creating: 'idle',
  cancellingById: {},
  cancelRollbackById: {},
  bookings: [],
  bookingsStatus: 'idle',
}

export const createDeskBooking = createAsyncThunk<
  BookingRecord,
  { deskId: string; date: string },
  { rejectValue: DeskBookingError }
>(
  'deskBookings/createDeskBooking',
  async ({ deskId, date }, { rejectWithValue }) => {
    try {
      return await postDeskBooking({
        desk_id: Number(deskId),
        booking_date: date,
      })
    } catch (error) {
      if (error instanceof HttpError) {
        return rejectWithValue({
          code: error.status,
          message: error.message,
        })
      }

      return rejectWithValue({
        code: 0,
        message: 'Failed to create desk booking.',
      })
    }
  },
)

export const cancelBooking = createAsyncThunk<
  string,
  { bookingId: string },
  { rejectValue: { bookingId: string; error: DeskBookingError } }
>(
  'deskBookings/cancelBooking',
  async ({ bookingId }, { rejectWithValue }) => {
    try {
      await deleteDeskBooking(bookingId)
      return bookingId
    } catch (error) {
      const bookingError: DeskBookingError =
        error instanceof HttpError
          ? { code: error.status, message: error.message }
          : { code: 0, message: 'Failed to cancel booking.' }

      return rejectWithValue({ bookingId, error: bookingError })
    }
  },
)

export const fetchMyDeskBookings = createAsyncThunk<
  BookingRecord[],
  void,
  { rejectValue: string }
>('deskBookings/fetchMyDeskBookings', async (_, { rejectWithValue }) => {
  try {
    const data = await fetchJson<{
      count: number
      next: string | null
      previous: string | null
      results: BookingRecord[]
    }>({
      method: 'GET',
      path: '/api/v1/bookings/',
      auth: true,
    })

    return data.results
  } catch (error) {
    if (error instanceof HttpError) {
      return rejectWithValue(error.message)
    }

    return rejectWithValue('Failed to load desk bookings.')
  }
})

const deskBookingsSlice = createSlice({
  name: 'deskBookings',
  initialState,
  reducers: {
    clearDeskBookingFeedback(state) {
      state.lastError = undefined
      state.lastSuccessMessage = undefined
    },
    clearCancelRollback(state, action: { payload: string }) {
      delete state.cancelRollbackById[action.payload]
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createDeskBooking.pending, (state) => {
        state.creating = 'pending'
        state.lastError = undefined
        state.lastSuccessMessage = undefined
      })
      .addCase(createDeskBooking.fulfilled, (state, action) => {
        state.creating = 'succeeded'
        state.lastSuccessMessage = 'Desk booked successfully.'
        state.bookings = [
          action.payload,
          ...state.bookings.filter((booking) => booking.id !== action.payload.id),
        ]
      })
      .addCase(createDeskBooking.rejected, (state, action) => {
        state.creating = 'failed'
        if (action.payload) {
          state.lastError = action.payload
        }
      })
      .addCase(cancelBooking.pending, (state, action) => {
        const bookingId = action.meta.arg.bookingId
        state.cancellingById[bookingId] = 'pending'

        const booking = state.bookings.find((item) => item.id === bookingId)
        if (booking) {
          state.cancelRollbackById[bookingId] = booking
          state.bookings = state.bookings.map((item) =>
            item.id === bookingId ? { ...item, status: 'cancelled' } : item,
          )
        }
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const bookingId = action.payload
        state.cancellingById[bookingId] = 'succeeded'
        delete state.cancelRollbackById[bookingId]
        state.bookings = state.bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking,
        )
        state.lastSuccessMessage = 'Booking cancelled.'
        state.lastError = undefined
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        const bookingId = action.meta.arg.bookingId
        state.cancellingById[bookingId] = 'failed'

        const rollback = state.cancelRollbackById[bookingId]
        if (rollback) {
          state.bookings = state.bookings.map((booking) =>
            booking.id === bookingId ? rollback : booking,
          )
          delete state.cancelRollbackById[bookingId]
        }

        if (action.payload) {
          state.lastError = action.payload.error
        }
      })
      .addCase(fetchMyDeskBookings.pending, (state) => {
        state.bookingsStatus = 'pending'
      })
      .addCase(fetchMyDeskBookings.fulfilled, (state, action) => {
        state.bookingsStatus = 'succeeded'
        state.bookings = action.payload
      })
      .addCase(fetchMyDeskBookings.rejected, (state) => {
        state.bookingsStatus = 'failed'
      })
  },
})

export const { clearDeskBookingFeedback, clearCancelRollback } = deskBookingsSlice.actions

export const selectDeskBookingsState = (state: RootState) => state.deskBookings
export const selectDeskCreatingStatus = (state: RootState) => state.deskBookings.creating
export const selectDeskLastBookingError = (state: RootState) => state.deskBookings.lastError
export const selectDeskLastBookingSuccess = (state: RootState) =>
  state.deskBookings.lastSuccessMessage
export const selectDeskCancellingById = (state: RootState) =>
  state.deskBookings.cancellingById

const selectAllDeskBookings = (state: RootState) => state.deskBookings.bookings

export const selectMyDeskBookings = createSelector([selectAllDeskBookings], (bookings) =>
  bookings.filter(
    (booking) =>
      booking.resource_type === 'desk' && booking.status !== 'cancelled',
  ),
)

export default deskBookingsSlice.reducer
