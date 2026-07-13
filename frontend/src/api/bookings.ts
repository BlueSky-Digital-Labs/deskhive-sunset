import { apiFetch, ApiError } from '@/lib/api'

export interface Booking {
  id: string
  user_id: number
  resource_type: string
  resource_id: number
  resource_label?: string | null
  room_id: number | null
  desk_id: number | null
  booking_date: string
  date: string
  start_at: string | null
  end_at: string | null
  status: string
  is_upcoming?: boolean
  created_at: string
  checked_in_at: string | null
}

export class CheckInConflictError extends Error {
  status = 409

  constructor(message = 'Check-in is only available on the booking day.') {
    super(message)
    this.name = 'CheckInConflictError'
  }
}

export async function checkIn(bookingId: string): Promise<Booking> {
  try {
    return await apiFetch<Booking>(`/api/v1/bookings/${bookingId}/check_in`, {
      method: 'POST',
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      throw new CheckInConflictError(
        typeof error.message === 'string' && error.message
          ? error.message
          : 'Check-in is only available on the booking day.',
      )
    }

    throw error
  }
}
