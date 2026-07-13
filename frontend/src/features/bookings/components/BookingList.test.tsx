import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { BookingList } from '@/features/bookings/components/BookingList'
import { ToastProvider } from '@/lib/toast'
import { createTestStore } from '@/test/test-utils'
import type { MyBooking } from '@/lib/apiClient'
import * as bookingUtils from '@/features/bookings/utils'

vi.mock('@/api/bookings', () => ({
  checkIn: vi.fn(),
  CheckInConflictError: class CheckInConflictError extends Error {
    status = 409

    constructor(message = 'Check-in is only available on the booking day.') {
      super(message)
      this.name = 'CheckInConflictError'
    }
  },
}))

import { checkIn, CheckInConflictError } from '@/api/bookings'

function renderBookingList(bookings: MyBooking[]) {
  const store = createTestStore()
  store.dispatch({
    type: 'myBookings/fetchMyBookings/fulfilled',
    payload: {
      bucket: 'upcoming',
      page: 1,
      items: bookings,
      hasNext: false,
    },
  })

  return render(
    <Provider store={store}>
      <ToastProvider>
        <BookingList bookings={bookings} />
      </ToastProvider>
    </Provider>,
  )
}

const eligibleDeskBooking: MyBooking = {
  id: 'booking-1',
  resource_type: 'desk',
  resource_id: 12,
  resource_label: null,
  date: '2026-07-13',
  start_at: null,
  end_at: null,
  status: 'active',
  created_at: '2026-07-12T08:00:00.000Z',
  is_upcoming: true,
}

describe('BookingList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(bookingUtils, 'isCheckInEligible').mockReturnValue(true)
  })

  it('renders check-in button for eligible same-day bookings', () => {
    renderBookingList([eligibleDeskBooking])

    expect(screen.getByRole('button', { name: /check in/i })).toBeInTheDocument()
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument()
  })

  it('hides check-in button when booking is not for today', () => {
    vi.mocked(bookingUtils.isCheckInEligible).mockReturnValue(false)

    renderBookingList([
      {
        ...eligibleDeskBooking,
        date: '2026-07-20',
      },
    ])

    expect(screen.queryByRole('button', { name: /check in/i })).not.toBeInTheDocument()
  })

  it('updates status to checked in after successful check-in', async () => {
    const user = userEvent.setup()
    vi.mocked(checkIn).mockResolvedValue({
      id: 'booking-1',
      user_id: 1,
      resource_type: 'desk',
      resource_id: 12,
      resource_label: null,
      room_id: null,
      desk_id: 12,
      booking_date: '2026-07-13',
      date: '2026-07-13',
      start_at: null,
      end_at: null,
      status: 'checked_in',
      is_upcoming: true,
      created_at: '2026-07-12T08:00:00.000Z',
      checked_in_at: '2026-07-13T09:00:00.000Z',
    })

    const store = createTestStore()
    store.dispatch({
      type: 'myBookings/fetchMyBookings/fulfilled',
      payload: {
        bucket: 'upcoming',
        page: 1,
        items: [eligibleDeskBooking],
        hasNext: false,
      },
    })

    render(
      <Provider store={store}>
        <ToastProvider>
          <BookingList bookings={store.getState().myBookings.pages['upcoming:1']!.items} />
        </ToastProvider>
      </Provider>,
    )

    await user.click(screen.getByRole('button', { name: /check in/i }))

    await waitFor(() => {
      expect(checkIn).toHaveBeenCalledWith('booking-1')
      expect(
        store.getState().myBookings.pages['upcoming:1']?.items[0].status,
      ).toBe('checked_in')
      expect(document.body).toHaveTextContent('Checked in successfully.')
    })
  })

  it('shows conflict toast on 409 response', async () => {
    const user = userEvent.setup()
    vi.mocked(checkIn).mockRejectedValue(
      new CheckInConflictError('Check-in is only available on the booking day.'),
    )

    renderBookingList([eligibleDeskBooking])

    await user.click(screen.getByRole('button', { name: /check in/i }))

    await waitFor(() => {
      expect(document.body).toHaveTextContent(
        'Check-in is only available on the booking day.',
      )
      expect(screen.getByText(/confirmed/i)).toBeInTheDocument()
    })
  })

  it('renders status badge colors for checked-in bookings', () => {
    const { container } = render(
      <BookingList
        bookings={[
          {
            ...eligibleDeskBooking,
            status: 'checked_in',
          },
        ]}
      />,
      {
        wrapper: ({ children }) => (
          <Provider store={createTestStore()}>
            <ToastProvider>{children}</ToastProvider>
          </Provider>
        ),
      },
    )

    const badge = container.querySelector('.my-bookings-status--checked_in')
    expect(badge).toBeTruthy()
    expect(badge).toHaveTextContent('checked in')
  })
})
