import { ReactNode } from 'react'
import { Button } from '@components/atoms/Button'
import { AdminStatusBadge } from './AdminUi'
import type { AdminDesk, AdminFloor, AdminRoom, SpaceKind } from '@/features/admin/types'
import './SpacesTable.css'

type SpaceItem = AdminFloor | AdminDesk | AdminRoom

interface SpacesTableProps<T extends SpaceItem> {
  kind: SpaceKind
  items: T[]
  isLoading?: boolean
  floorLabelById?: Record<number, string>
  togglingId?: number | null
  onToggleActive: (item: T) => void
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  emptyMessage?: string
}

function renderDetails<T extends SpaceItem>(
  item: T,
  kind: SpaceKind,
  floorLabelById?: Record<number, string>,
): ReactNode {
  if (kind === 'floor') {
    const floor = item as AdminFloor
    return `${floor.building} · Level ${floor.level}`
  }

  if (kind === 'desk') {
    const desk = item as AdminDesk
    return floorLabelById?.[desk.floor] ?? `Floor #${desk.floor}`
  }

  const room = item as AdminRoom
  const floorLabel = floorLabelById?.[room.floor] ?? `Floor #${room.floor}`
  return `${floorLabel} · Capacity ${room.capacity}`
}

export function SpacesTable<T extends SpaceItem>({
  kind,
  items,
  isLoading = false,
  floorLabelById,
  togglingId,
  onToggleActive,
  onEdit,
  onDelete,
  emptyMessage = 'No items found.',
}: SpacesTableProps<T>) {
  if (isLoading) {
    return <div className="admin-table__loading" role="status">Loading spaces...</div>
  }

  if (items.length === 0) {
    return <div className="admin-table__empty" role="status">{emptyMessage}</div>
  }

  const detailHeader =
    kind === 'floor' ? 'Building / Level' : kind === 'desk' ? 'Floor' : 'Floor / Capacity'

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">{detailHeader}</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{renderDetails(item, kind, floorLabelById)}</td>
              <td>
                <AdminStatusBadge active={item.is_active} />
              </td>
              <td>
                <div className="admin-table__actions">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleActive(item)}
                    isLoading={togglingId === item.id}
                    aria-label={`Toggle ${item.name} active status`}
                  >
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(item)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
