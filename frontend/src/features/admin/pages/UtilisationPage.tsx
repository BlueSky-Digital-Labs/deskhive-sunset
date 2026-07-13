import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Input } from '@components/atoms/Input'
import { AdminErrorState } from '@/features/admin/components/AdminUi'
import { useAdminFloors } from '@/features/admin/hooks/useSpaces'
import { useUtilisation } from '@/features/admin/hooks/useUtilisation'
import {
  getAdminErrorMessage,
  isUnauthorizedError,
} from '@/features/admin/utils/errors'
import '../admin.css'

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

function getDefaultRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  }
}

export function UtilisationPage() {
  const navigate = useNavigate()
  const defaults = useMemo(() => getDefaultRange(), [])
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [floorId, setFloorId] = useState<string>('')

  const floorsQuery = useAdminFloors()
  const utilisationQuery = useUtilisation({
    startDate,
    endDate,
    floorId: floorId ? Number(floorId) : null,
  })

  if (utilisationQuery.isError) {
    if (isUnauthorizedError(utilisationQuery.error)) {
      navigate('/login')
    }
  }

  return (
    <DashboardLayout>
      <div className="admin-page">
        <header className="admin-page__header">
          <div>
            <h1>Utilisation</h1>
            <p>Review desk and room booking utilisation across a date range.</p>
          </div>
        </header>

        <div className="admin-filters">
          <Input
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="End date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
          <div className="input-group">
            <label htmlFor="utilisation-floor" className="input__label">
              Floor (optional)
            </label>
            <select
              id="utilisation-floor"
              className="space-form-modal__select"
              value={floorId}
              onChange={(event) => setFloorId(event.target.value)}
            >
              <option value="">All floors</option>
              {(floorsQuery.data ?? []).map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {utilisationQuery.isLoading && (
          <div className="admin-table__loading" role="status">
            Loading utilisation...
          </div>
        )}

        {utilisationQuery.isError && (
          <AdminErrorState
            message={getAdminErrorMessage(
              utilisationQuery.error,
              'Failed to load utilisation data.',
            )}
          />
        )}

        {utilisationQuery.data && (
          <>
            <section className="admin-summary-grid" aria-label="Utilisation summary">
              <article className="admin-summary-card">
                <h2>Desks summary</h2>
                <dl>
                  <div>
                    <dt>Resources</dt>
                    <dd>{utilisationQuery.data.summary.desks.resource_count}</dd>
                  </div>
                  <div>
                    <dt>Bookings</dt>
                    <dd>{utilisationQuery.data.summary.desks.bookings_count}</dd>
                  </div>
                  <div>
                    <dt>Checked in</dt>
                    <dd>{utilisationQuery.data.summary.desks.checked_in_count}</dd>
                  </div>
                  <div>
                    <dt>Utilisation</dt>
                    <dd>{formatRate(utilisationQuery.data.summary.desks.utilisation_rate)}</dd>
                  </div>
                </dl>
              </article>

              <article className="admin-summary-card">
                <h2>Rooms summary</h2>
                <dl>
                  <div>
                    <dt>Resources</dt>
                    <dd>{utilisationQuery.data.summary.rooms.resource_count}</dd>
                  </div>
                  <div>
                    <dt>Bookings</dt>
                    <dd>{utilisationQuery.data.summary.rooms.bookings_count}</dd>
                  </div>
                  <div>
                    <dt>Checked in</dt>
                    <dd>{utilisationQuery.data.summary.rooms.checked_in_count}</dd>
                  </div>
                  <div>
                    <dt>Utilisation</dt>
                    <dd>{formatRate(utilisationQuery.data.summary.rooms.utilisation_rate)}</dd>
                  </div>
                </dl>
              </article>
            </section>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Desk bookings</th>
                    <th scope="col">Desk checked in</th>
                    <th scope="col">Desk utilisation</th>
                    <th scope="col">Room bookings</th>
                    <th scope="col">Room checked in</th>
                    <th scope="col">Room utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {utilisationQuery.data.daily.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.desks.bookings_count}</td>
                      <td>{row.desks.checked_in_count}</td>
                      <td>{formatRate(row.desks.utilisation_rate)}</td>
                      <td>{row.rooms.bookings_count}</td>
                      <td>{row.rooms.checked_in_count}</td>
                      <td>{formatRate(row.rooms.utilisation_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default UtilisationPage
