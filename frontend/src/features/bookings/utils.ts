import type { MyBooking } from '@/lib/apiClient'

const CHECK_IN_STATUSES = new Set(['pending', 'confirmed', 'active'])

export function formatStatusLabel(status: string): string {
  if (status === 'active') {
    return 'confirmed'
  }

  if (status === 'checked_in') {
    return 'checked in'
  }

  return status.replace(/_/g, ' ')
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isCheckInEligible(booking: MyBooking, now = new Date()): boolean {
  if (!booking.is_upcoming || !CHECK_IN_STATUSES.has(booking.status)) {
    return false
  }

  if (booking.date !== formatLocalDate(now)) {
    return false
  }

  if (booking.resource_type === 'room') {
    if (!booking.start_at || !booking.end_at) {
      return false
    }

    const start = new Date(booking.start_at)
    const end = new Date(booking.end_at)
    return now >= start && now <= end
  }

  return true
}

export function toMyBookingFromCheckInResponse(booking: {
  id: string
  resource_type: string
  resource_id: number
  resource_label?: string | null
  date: string
  start_at: string | null
  end_at: string | null
  status: string
  created_at: string
  is_upcoming?: boolean
}): MyBooking {
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
    is_upcoming: booking.is_upcoming ?? true,
  }
}
