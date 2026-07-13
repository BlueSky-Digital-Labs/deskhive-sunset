import { useEffect, useState } from 'react'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { EmptyState } from '@components/EmptyState'
import { SkeletonList } from '@components/SkeletonList'
import { ApiError } from '@/lib/api'
import { getFloors } from './api'
import type { Floor } from './types'
import './spaces.css'

export function FloorsPage() {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadFloors() {
      setLoading(true)
      setError(null)

      try {
        const data = await getFloors()
        if (!cancelled) {
          setFloors(data)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof ApiError ? err.message : 'Failed to load floors'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadFloors()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <DashboardLayout>
      <div className="spaces-page">
        <header className="spaces-page__header">
          <h1>Floors</h1>
          <p>View building floors and their active status.</p>
        </header>

        {error && (
          <div className="spaces-error" role="alert">
            {error}
          </div>
        )}

        {loading && <SkeletonList count={4} />}

        {!loading && !error && floors.length === 0 && (
          <EmptyState message="No floors found. Floors will appear here once they are configured." />
        )}

        {!loading && floors.length > 0 && (
          <div className="spaces-list">
            {floors.map((floor) => (
              <article key={floor.id} className="spaces-card">
                <div>
                  <h2 className="spaces-card__title">{floor.name}</h2>
                  <p className="spaces-card__meta">
                    {floor.building} · Level {floor.level}
                  </p>
                </div>
                <span
                  className={`status-badge ${
                    floor.is_active ? 'status-badge--active' : 'status-badge--inactive'
                  }`}
                >
                  {floor.is_active ? 'Active' : 'Inactive'}
                </span>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default FloorsPage
