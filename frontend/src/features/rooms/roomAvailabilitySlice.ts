import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { ApiError } from '@/lib/api'
import { getRoomAvailability, getRooms } from '@/features/spaces/api'
import type { RoomAvailability } from '@/features/spaces/types'
import type { RootState } from '@store/index'

export type AvailabilityStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

export interface RoomAvailabilityState {
  status: AvailabilityStatus
  rooms: RoomAvailability[]
  error?: string
  usedManualFallback: boolean
}

const initialState: RoomAvailabilityState = {
  status: 'idle',
  rooms: [],
  usedManualFallback: false,
}

function dateToDayStartIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString()
}

function dateToDayEndIso(date: string): string {
  return new Date(`${date}T23:59:59`).toISOString()
}

export const fetchRooms = createAsyncThunk<
  { rooms: RoomAvailability[]; usedManualFallback: boolean },
  { date: string; startAt?: string; endAt?: string },
  { rejectValue: string }
>(
  'roomAvailability/fetchRooms',
  async ({ date, startAt, endAt }, { rejectWithValue }) => {
    const startIso = startAt ?? dateToDayStartIso(date)
    const endIso = endAt ?? dateToDayEndIso(date)

    try {
      const rooms = await getRoomAvailability(startIso, endIso)
      return { rooms, usedManualFallback: false }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        return rejectWithValue('Failed to load room availability.')
      }

      try {
        const manualRooms = await getRooms()
        return {
          rooms: manualRooms
            .filter((room) => room.is_active)
            .map((room) => ({
              id: room.id,
              name: room.name,
              floor: room.floor,
              capacity: room.capacity,
              available: true,
            })),
          usedManualFallback: true,
        }
      } catch {
        return rejectWithValue(error.message)
      }
    }
  },
)

const roomAvailabilitySlice = createSlice({
  name: 'roomAvailability',
  initialState,
  reducers: {
    resetRoomAvailability(state) {
      state.status = 'idle'
      state.rooms = []
      state.error = undefined
      state.usedManualFallback = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.status = 'pending'
        state.error = undefined
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.rooms = action.payload.rooms
        state.usedManualFallback = action.payload.usedManualFallback
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.status = 'failed'
        state.rooms = []
        state.error = action.payload ?? 'Failed to load rooms.'
      })
  },
})

export const { resetRoomAvailability } = roomAvailabilitySlice.actions

export const selectRoomAvailabilityState = (state: RootState) =>
  state.roomAvailability
export const selectAvailableRooms = (state: RootState) => state.roomAvailability.rooms
export const selectRoomsLoading = (state: RootState) =>
  state.roomAvailability.status === 'pending'
export const selectRoomsError = (state: RootState) => state.roomAvailability.error
export const selectUsedManualFallback = (state: RootState) =>
  state.roomAvailability.usedManualFallback

export default roomAvailabilitySlice.reducer
