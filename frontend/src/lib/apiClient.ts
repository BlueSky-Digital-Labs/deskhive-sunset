import { apiFetch } from '@/lib/api'

export interface PostBookingBody {
  resource_type: string
  resource_id: string
  start_at: string
  end_at: string
}

export interface BookingRecord {
  id: string
  user_id: number
  resource_type: string
  resource_id: number
  room_id: number | null
  desk_id: number | null
  booking_date: string
  date: string
  start_at: string | null
  end_at: string | null
  status: string
  created_at: string
  checked_in_at: string | null
}

interface PaginatedBookings {
  count: number
  next: string | null
  previous: string | null
  results: BookingRecord[]
}

function toRoomBookingPayload(body: PostBookingBody) {
  return {
    room_id: Number(body.resource_id),
    start_at: body.start_at,
    end_at: body.end_at,
  }
}

export async function postBooking(body: PostBookingBody): Promise<BookingRecord> {
  return apiFetch<BookingRecord>('/api/v1/bookings/', {
    method: 'POST',
    body: toRoomBookingPayload(body),
  })
}

export async function postCancel(bookingId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/bookings/${bookingId}/`, {
    method: 'DELETE',
  })
}

export async function getBookings(): Promise<BookingRecord[]> {
  const data = await apiFetch<PaginatedBookings>('/api/v1/bookings/')
  return data.results
}
