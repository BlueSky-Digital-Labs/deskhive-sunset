import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ApiError } from '@/lib/api'
import { checkIn, CheckInConflictError } from '@/api/bookings'
import {
  getMyBookings,
  postBookingCancel,
  type MyBooking,
} from '@/lib/apiClient'
import { toMyBookingFromCheckInResponse } from '@/features/bookings/utils'
import type { RootState } from '@store/index'

export type BookingBucket = 'upcoming' | 'past'
export type AsyncStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

export interface MyBookingsPageState {
  items: MyBooking[]
  page: number
  hasNext: boolean
  loading: AsyncStatus
  error?: string
}

export interface MyBookingsState {
  bucket: BookingBucket
  pages: Record<string, MyBookingsPageState>
  cancellingById: Record<string, AsyncStatus>
  cancelRollbackById: Record<string, MyBooking>
  checkingInById: Record<string, AsyncStatus>
  checkInRollbackById: Record<string, MyBooking>
}

const initialState: MyBookingsState = {
  bucket: 'upcoming',
  pages: {},
  cancellingById: {},
  cancelRollbackById: {},
  checkingInById: {},
  checkInRollbackById: {},
}

export function pageKey(bucket: BookingBucket, page: number): string {
  return `${bucket}:${page}`
}

export function isCancellableBooking(booking: MyBooking): boolean {
  return (
    booking.is_upcoming &&
    ['pending', 'confirmed', 'active'].includes(booking.status)
  )
}

export const fetchMyBookings = createAsyncThunk<
  {
    bucket: BookingBucket
    page: number
    items: MyBooking[]
    hasNext: boolean
  },
  { bucket: BookingBucket; page: number },
  { rejectValue: { bucket: BookingBucket; page: number; message: string } }
>(
  'myBookings/fetchMyBookings',
  async ({ bucket, page }, { rejectWithValue }) => {
    try {
      const data = await getMyBookings({ bucket, page })
      return {
        bucket,
        page,
        items: data.results,
        hasNext: data.next !== null,
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Failed to load bookings.'

      return rejectWithValue({ bucket, page, message })
    }
  },
)

export const cancelBooking = createAsyncThunk<
  MyBooking,
  { bookingId: string },
  { rejectValue: { bookingId: string; message: string } }
>(
  'myBookings/cancelBooking',
  async ({ bookingId }, { rejectWithValue }) => {
    try {
      return await postBookingCancel(bookingId)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Failed to cancel booking.'

      return rejectWithValue({ bookingId, message })
    }
  },
)

export const checkInBooking = createAsyncThunk<
  MyBooking,
  { bookingId: string },
  { rejectValue: { bookingId: string; message: string; status?: number } }
>(
  'myBookings/checkInBooking',
  async ({ bookingId }, { rejectWithValue }) => {
    try {
      const booking = await checkIn(bookingId)
      return toMyBookingFromCheckInResponse(booking)
    } catch (error) {
      if (error instanceof ApiError) {
        return rejectWithValue({
          bookingId,
          message: error.message,
          status: error.status,
        })
      }

      if (error instanceof CheckInConflictError) {
        return rejectWithValue({
          bookingId,
          message: error.message,
          status: error.status,
        })
      }

      const message =
        error instanceof Error ? error.message : 'Failed to check in.'

      return rejectWithValue({
        bookingId,
        message,
      })
    }
  },
)

function updateBookingInPages(
  pages: Record<string, MyBookingsPageState>,
  bookingId: string,
  updater: (booking: MyBooking) => MyBooking,
) {
  for (const key of Object.keys(pages)) {
    const pageState = pages[key]
    const index = pageState.items.findIndex((item) => item.id === bookingId)
    if (index === -1) {
      continue
    }

    pages[key] = {
      ...pageState,
      items: pageState.items.map((item) =>
        item.id === bookingId ? updater(item) : item,
      ),
    }
  }
}

const myBookingsSlice = createSlice({
  name: 'myBookings',
  initialState,
  reducers: {
    setBucket(state, action: { payload: BookingBucket }) {
      state.bucket = action.payload
    },
    clearCancelRollback(state, action: { payload: string }) {
      delete state.cancelRollbackById[action.payload]
    },
    clearCheckInRollback(state, action: { payload: string }) {
      delete state.checkInRollbackById[action.payload]
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBookings.pending, (state, action) => {
        const { bucket, page } = action.meta.arg
        const key = pageKey(bucket, page)
        const existing = state.pages[key]

        state.pages[key] = {
          items: existing?.items ?? [],
          page,
          hasNext: existing?.hasNext ?? false,
          loading: 'pending',
          error: undefined,
        }
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        const { bucket, page, items, hasNext } = action.payload
        const key = pageKey(bucket, page)

        state.bucket = bucket
        state.pages[key] = {
          items,
          page,
          hasNext,
          loading: 'succeeded',
        }
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        const payload = action.payload
        if (!payload) {
          return
        }

        const key = pageKey(payload.bucket, payload.page)
        const existing = state.pages[key]

        state.pages[key] = {
          items: existing?.items ?? [],
          page: payload.page,
          hasNext: existing?.hasNext ?? false,
          loading: 'failed',
          error: payload.message,
        }
      })
      .addCase(cancelBooking.pending, (state, action) => {
        const { bookingId } = action.meta.arg
        state.cancellingById[bookingId] = 'pending'

        for (const pageState of Object.values(state.pages)) {
          const booking = pageState.items.find((item) => item.id === bookingId)
          if (booking) {
            state.cancelRollbackById[bookingId] = booking
            break
          }
        }

        updateBookingInPages(state.pages, bookingId, (booking) => ({
          ...booking,
          status: 'cancelled',
          is_upcoming: false,
        }))
      })
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const bookingId = action.payload.id
        state.cancellingById[bookingId] = 'succeeded'
        delete state.cancelRollbackById[bookingId]

        updateBookingInPages(state.pages, bookingId, () => action.payload)
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        const bookingId = action.meta.arg.bookingId
        state.cancellingById[bookingId] = 'failed'

        const rollback = state.cancelRollbackById[bookingId]
        if (rollback) {
          updateBookingInPages(state.pages, bookingId, () => rollback)
          delete state.cancelRollbackById[bookingId]
        }
      })
      .addCase(checkInBooking.pending, (state, action) => {
        const { bookingId } = action.meta.arg
        state.checkingInById[bookingId] = 'pending'

        for (const pageState of Object.values(state.pages)) {
          const booking = pageState.items.find((item) => item.id === bookingId)
          if (booking) {
            state.checkInRollbackById[bookingId] = booking
            break
          }
        }

        updateBookingInPages(state.pages, bookingId, (booking) => ({
          ...booking,
          status: 'checked_in',
        }))
      })
      .addCase(checkInBooking.fulfilled, (state, action) => {
        const bookingId = action.payload.id
        state.checkingInById[bookingId] = 'succeeded'
        delete state.checkInRollbackById[bookingId]

        updateBookingInPages(state.pages, bookingId, () => action.payload)
      })
      .addCase(checkInBooking.rejected, (state, action) => {
        const bookingId = action.meta.arg.bookingId
        state.checkingInById[bookingId] = 'failed'

        const rollback = state.checkInRollbackById[bookingId]
        if (rollback) {
          updateBookingInPages(state.pages, bookingId, () => rollback)
          delete state.checkInRollbackById[bookingId]
        }
      })
  },
})

export const { setBucket, clearCancelRollback, clearCheckInRollback } =
  myBookingsSlice.actions

export const selectMyBookingsState = (state: RootState) => state.myBookings
export const selectMyBookingsBucket = (state: RootState) => state.myBookings.bucket
export const selectMyBookingsPages = (state: RootState) => state.myBookings.pages
export const selectCancellingById = (state: RootState) =>
  state.myBookings.cancellingById
export const selectCheckingInById = (state: RootState) =>
  state.myBookings.checkingInById

export function selectMyBookingsPage(
  state: RootState,
  bucket: BookingBucket,
  page: number,
): MyBookingsPageState | undefined {
  return state.myBookings.pages[pageKey(bucket, page)]
}

export default myBookingsSlice.reducer
