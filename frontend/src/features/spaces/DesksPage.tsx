import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { AvailabilityBadge } from '@components/AvailabilityBadge'
import { SkeletonList } from '@components/SkeletonList'
import { Input } from '@components/atoms/Input'
import { ApiError } from '@/lib/api'
import { getDeskAvailability, getFloors } from './api'
import type { DeskAvailability, Floor } from './types'
import './spaces.css'

function formatDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function DesksPage() {
  const [date, setDate] = useState(() => formatDateInputValue(new Date()))
  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloorId, setSelectedFloorId] = useState<string>('all')
  const [desks, setDesks] = useState<DeskAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadFloors() {
      try {
        const data = await getFloors()
        if (!cancelled) {
          setFloors(data)
        }
      } catch {
        // Floor filter is optional; availability still works without it.
      }
    }

    void loadFloors()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadAvailability() {
      setLoading(true)
      setError(null)

      try {
        const data = await getDeskAvailability(date)
        if (!cancelled) {
          setDesks(data)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : 'Failed to load desk availability'
          setError(message)
          setDesks([])
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
  }, [date])

  const filteredDesks = useMemo(() => {
    if (selectedFloorId === 'all') {
      return desks
    }

    const floorId = Number(selectedFloorId)
    return desks.filter((desk) => desk.floor === floorId)
  }, [desks, selectedFloorId])

  const floorNameById = useMemo(
    () => new Map(floors.map((floor) => [floor.id, floor.name])),
    [floors],
  )

  return (
    <DashboardLayout>
      <div className="spaces-page">
        <header className="spaces-page__header">
          <h1>Desks</h1>
          <p>Check desk availability for a selected date.</p>
        </header>

        <div className="spaces-controls">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />

          {floors.length > 0 && (
            <div className="input-group">
              <label htmlFor="desk-floor-filter" className="input__label">
                Floor
              </label>
              <select
                id="desk-floor-filter"
                className="input"
                value={selectedFloorId}
                onChange={(event) => setSelectedFloorId(event.target.value)}
              >
                <option value="all">All floors</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="spaces-error" role="alert">
            {error}
          </div>
        )}

        {loading && <SkeletonList count={6} />}

        {!loading && !error && filteredDesks.length === 0 && (
          <div className="spaces-empty" role="status">
            No desks available for the selected filters.
          </div>
        )}

        {!loading && filteredDesks.length > 0 && (
          <div className="spaces-grid">
            {filteredDesks.map((desk) => (
              <article key={desk.id} className="spaces-card">
                <div>
                  <h2 className="spaces-card__title">{desk.name}</h2>
                  <p className="spaces-card__meta">
                    Floor: {floorNameById.get(desk.floor) ?? `ID ${desk.floor}`}
                  </p>
                </div>
                <AvailabilityBadge available={desk.available} />
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default DesksPage
