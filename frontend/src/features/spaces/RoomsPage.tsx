import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { AvailabilityBadge } from '@components/AvailabilityBadge'
import { SkeletonList } from '@components/SkeletonList'
import { Input } from '@components/atoms/Input'
import { ApiError } from '@/lib/api'
import { getRoomAvailability } from './api'
import type { RoomAvailability } from './types'
import './spaces.css'

function toDateTimeLocalValue(date: Date): string {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function toIsoString(value: string): string {
  return new Date(value).toISOString()
}

export function RoomsPage() {
  const defaultStart = useMemo(() => {
    const start = new Date()
    start.setHours(9, 0, 0, 0)
    return toDateTimeLocalValue(start)
  }, [])

  const defaultEnd = useMemo(() => {
    const end = new Date()
    end.setHours(10, 0, 0, 0)
    return toDateTimeLocalValue(end)
  }, [])

  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(defaultEnd)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<RoomAvailability[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRangeValid = useMemo(() => {
    if (!start || !end) {
      return false
    }

    return new Date(start) < new Date(end)
  }, [start, end])

  useEffect(() => {
    if (!start || !end) {
      setValidationError('Start and end times are required.')
      return
    }

    if (!isRangeValid) {
      setValidationError('Start time must be before end time.')
      setRooms([])
      return
    }

    setValidationError(null)

    let cancelled = false

    async function loadAvailability() {
      setLoading(true)
      setError(null)

      try {
        const data = await getRoomAvailability(toIsoString(start), toIsoString(end))
        if (!cancelled) {
          setRooms(data)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : 'Failed to load room availability'
          setError(message)
          setRooms([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadAvailability()

    return () => {
      cancelled = true
    }
  }, [start, end, isRangeValid])

  return (
    <DashboardLayout>
      <div className="spaces-page">
        <header className="spaces-page__header">
          <h1>Rooms</h1>
          <p>Check room availability for a selected time range.</p>
        </header>

        <div className="spaces-controls">
          <Input
            label="Start"
            type="datetime-local"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
          <Input
            label="End"
            type="datetime-local"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>

        {validationError && (
          <div className="spaces-error" role="alert">
            {validationError}
          </div>
        )}

        {error && !validationError && (
          <div className="spaces-error" role="alert">
            {error}
          </div>
        )}

        {loading && isRangeValid && <SkeletonList count={4} />}

        {!loading && isRangeValid && !error && rooms.length === 0 && (
          <div className="spaces-empty" role="status">
            No rooms available for the selected time range.
          </div>
        )}

        {!loading && isRangeValid && rooms.length > 0 && (
          <div className="spaces-grid">
            {rooms.map((room) => (
              <article key={room.id} className="spaces-card">
                <div>
                  <h2 className="spaces-card__title">{room.name}</h2>
                  <p className="spaces-card__meta">Capacity: {room.capacity}</p>
                </div>
                <AvailabilityBadge available={room.available} />
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default RoomsPage
