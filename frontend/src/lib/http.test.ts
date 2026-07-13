import { describe, it, expect } from 'vitest'
import {
  HttpError,
  extractErrorMessage,
  isConflictError,
  isConflictStatus,
} from '@/lib/http'

describe('http', () => {
  it('detects HTTP 409 conflict status', () => {
    expect(isConflictStatus(409)).toBe(true)
    expect(isConflictStatus(400)).toBe(false)
  })

  it('identifies conflict errors', () => {
    const conflict = new HttpError(409, 'Desk is already booked.')
    const other = new HttpError(500, 'Server error')

    expect(isConflictError(conflict)).toBe(true)
    expect(isConflictError(other)).toBe(false)
    expect(isConflictError(new Error('nope'))).toBe(false)
  })

  it('extracts API error messages from response bodies', () => {
    expect(extractErrorMessage({ detail: 'Already booked' }, 'fallback')).toBe(
      'Already booked',
    )
    expect(
      extractErrorMessage({ non_field_errors: ['Invalid payload'] }, 'fallback'),
    ).toBe('Invalid payload')
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
