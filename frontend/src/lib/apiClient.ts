import { logout, selectAccessToken } from '@/features/auth/authSlice'
import { HttpError, readJsonResponse } from '@/lib/http'
import { apiFetch } from '@/lib/api'

export { HttpError as ApiError } from '@/lib/http'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function getStore() {
  const module = await import('@/app/store')
  return module.store
}

export interface FetchJsonOptions {
  method: string
  path: string
  body?: unknown
  auth?: boolean
}

export async function fetchJson<T>({
  method,
  path,
  body,
  auth = false,
}: FetchJsonOptions): Promise<T> {
  const store = await getStore()
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  if (auth) {
    const accessToken = selectAccessToken(store.getState())
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 401 && auth) {
    store.dispatch(logout())
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login')
    }
    const data = await response.text()
    throw new HttpError(401, 'Authentication required', data)
  }

  return readJsonResponse<T>(response)
}

export interface PostBookingBody {
  resource_type: string
  resource_id: string
  start_at: string
  end_at: string
}

export interface DeskBookingBody {
  desk_id: number
  booking_date: string
}

export interface BookingRecord {
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

export interface MyBooking {
  id: string
  resource_type: string
  resource_id: number
  resource_label?: string | null
  date: string
  start_at: string | null
  end_at: string | null
  status: string
  created_at: string
  is_upcoming: boolean
}

interface PaginatedBookings {
  count: number
  next: string | null
  previous: string | null
  results: BookingRecord[]
}

interface PaginatedMyBookings {
  count: number
  next: string | null
  previous: string | null
  results: MyBooking[]
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

export async function postDeskBooking(body: DeskBookingBody): Promise<BookingRecord> {
  return fetchJson<BookingRecord>({
    method: 'POST',
    path: '/api/v1/bookings/',
    body,
    auth: true,
  })
}

export async function postCancel(bookingId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/bookings/${bookingId}/`, {
    method: 'DELETE',
  })
}

export async function deleteDeskBooking(bookingId: string): Promise<void> {
  await fetchJson<void>({
    method: 'DELETE',
    path: `/api/v1/bookings/${bookingId}/`,
    auth: true,
  })
}

export async function getBookings(): Promise<BookingRecord[]> {
  const data = await apiFetch<PaginatedBookings>('/api/v1/bookings/')
  return data.results
}

export async function getMyBookings(params: {
  bucket: 'upcoming' | 'past'
  page?: number
}): Promise<PaginatedMyBookings> {
  const search = new URLSearchParams({
    bucket: params.bucket,
    page: String(params.page ?? 1),
  })

  return apiFetch<PaginatedMyBookings>(`/api/v1/my/bookings?${search.toString()}`)
}

export async function postBookingCancel(bookingId: string): Promise<MyBooking> {
  const booking = await apiFetch<BookingRecord>(
    `/api/v1/bookings/${bookingId}/cancel/`,
    { method: 'POST' },
  )

  return {
    id: booking.id,
    resource_type: booking.resource_type,
    resource_id: booking.resource_id,
    resource_label: booking.resource_label ?? null,
    date: booking.date,
    start_at: booking.start_at,
    end_at: booking.end_at,
    status: booking.status,
    created_at: booking.created_at,
    is_upcoming: booking.is_upcoming ?? false,
  }
}
