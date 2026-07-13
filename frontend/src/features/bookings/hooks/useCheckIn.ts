import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '@store/index'
import {
  checkInBooking,
  selectCheckingInById,
} from '@/features/myBookings/myBookingsSlice'
import { useToast } from '@/lib/toast'
import type { MyBooking } from '@/lib/apiClient'

const CONFLICT_MESSAGE = 'Check-in is only available on the booking day.'

export function useCheckIn() {
  const dispatch = useDispatch<AppDispatch>()
  const checkingInById = useSelector(selectCheckingInById)
  const { showToast } = useToast()

  const checkIn = useCallback(
    async (bookingId: string): Promise<MyBooking | null> => {
      const result = await dispatch(checkInBooking({ bookingId }))

      if (checkInBooking.fulfilled.match(result)) {
        showToast({
          type: 'success',
          message: 'Checked in successfully.',
        })
        return result.payload
      }

      if (checkInBooking.rejected.match(result)) {
        const status = result.payload?.status
        const message = result.payload?.message ?? 'Failed to check in.'

        if (status === 409) {
          showToast({
            type: 'error',
            message: CONFLICT_MESSAGE,
          })
        } else {
          showToast({
            type: 'error',
            message,
          })
        }
      }

      return null
    },
    [dispatch, showToast],
  )

  return {
    checkIn,
    checkingInById,
  }
}
