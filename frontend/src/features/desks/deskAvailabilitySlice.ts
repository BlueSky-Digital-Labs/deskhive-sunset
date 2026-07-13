import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { fetchJson } from '@/lib/apiClient'
import { HttpError } from '@/lib/http'
import type { DeskAvailability } from '@/features/spaces/types'
import type { RootState } from '@/app/store'

export type AvailabilityStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

export interface DeskDateAvailability {
  status: AvailabilityStatus
  desks: DeskAvailability[]
  error?: string
}

export interface DeskAvailabilityState {
  byDate: Record<string, DeskDateAvailability>
}

const initialState: DeskAvailabilityState = {
  byDate: {},
}

export const fetchDeskAvailability = createAsyncThunk<
  { date: string; desks: DeskAvailability[] },
  string,
  { rejectValue: { date: string; message: string } }
>('deskAvailability/fetchDeskAvailability', async (date, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams({ date })
    const desks = await fetchJson<DeskAvailability[]>({
      method: 'GET',
      path: `/api/v1/availability/desks/?${params.toString()}`,
      auth: true,
    })

    return { date, desks }
  } catch (error) {
    const message =
      error instanceof HttpError ? error.message : 'Failed to load desk availability.'

    return rejectWithValue({ date, message })
  }
})

const deskAvailabilitySlice = createSlice({
  name: 'deskAvailability',
  initialState,
  reducers: {
    resetDeskAvailability(state) {
      state.byDate = {}
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeskAvailability.pending, (state, action) => {
        const date = action.meta.arg
        const existing = state.byDate[date]

        state.byDate[date] = {
          status: 'pending',
          desks: existing?.desks ?? [],
          error: undefined,
        }
      })
      .addCase(fetchDeskAvailability.fulfilled, (state, action) => {
        const { date, desks } = action.payload
        state.byDate[date] = {
          status: 'succeeded',
          desks,
        }
      })
      .addCase(fetchDeskAvailability.rejected, (state, action) => {
        const payload = action.payload
        if (!payload) {
          return
        }

        state.byDate[payload.date] = {
          status: 'failed',
          desks: [],
          error: payload.message,
        }
      })
  },
})

export const { resetDeskAvailability } = deskAvailabilitySlice.actions

export const selectDeskAvailabilityByDate = (date: string) => (state: RootState) =>
  state.deskAvailability.byDate[date]

export const selectDesksForDate = (date: string) => (state: RootState) =>
  state.deskAvailability.byDate[date]?.desks ?? []

export const selectDesksLoadingForDate = (date: string) => (state: RootState) =>
  state.deskAvailability.byDate[date]?.status === 'pending'

export const selectDesksErrorForDate = (date: string) => (state: RootState) =>
  state.deskAvailability.byDate[date]?.error

export default deskAvailabilitySlice.reducer
