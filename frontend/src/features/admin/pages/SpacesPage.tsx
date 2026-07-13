import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { Button } from '@components/atoms/Button'
import { ConfirmDialog, AdminErrorState } from '@/features/admin/components/AdminUi'
import { SpaceFormModal } from '@/features/admin/components/SpaceFormModal'
import { SpacesTable } from '@/features/admin/components/SpacesTable'
import {
  useAdminDesks,
  useAdminFloors,
  useAdminRooms,
  useCreateDesk,
  useCreateFloor,
  useCreateRoom,
  useDeleteDesk,
  useDeleteFloor,
  useDeleteRoom,
  useToggleDeskActive,
  useToggleFloorActive,
  useToggleRoomActive,
  useUpdateDesk,
  useUpdateFloor,
  useUpdateRoom,
} from '@/features/admin/hooks/useSpaces'
import {
  getAdminErrorMessage,
  isForbiddenError,
  isUnauthorizedError,
} from '@/features/admin/utils/errors'
import type {
  AdminDesk,
  AdminFloor,
  AdminRoom,
  CreateDeskPayload,
  CreateFloorPayload,
  CreateRoomPayload,
  SpaceKind,
  UpdateDeskPayload,
  UpdateFloorPayload,
  UpdateRoomPayload,
} from '@/features/admin/types'
import '../admin.css'

type TabKey = SpaceKind

type SpaceEntity = AdminFloor | AdminDesk | AdminRoom

export function SpacesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('floor')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SpaceEntity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SpaceEntity | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const floorsQuery = useAdminFloors()
  const desksQuery = useAdminDesks()
  const roomsQuery = useAdminRooms()

  const createFloor = useCreateFloor()
  const updateFloor = useUpdateFloor()
  const deleteFloor = useDeleteFloor()
  const toggleFloor = useToggleFloorActive()

  const createDesk = useCreateDesk()
  const updateDesk = useUpdateDesk()
  const deleteDesk = useDeleteDesk()
  const toggleDesk = useToggleDeskActive()

  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const deleteRoom = useDeleteRoom()
  const toggleRoom = useToggleRoomActive()

  const floorLabelById = useMemo(() => {
    const labels: Record<number, string> = {}
    for (const floor of floorsQuery.data ?? []) {
      labels[floor.id] = floor.name
    }
    return labels
  }, [floorsQuery.data])

  const activeQuery =
    activeTab === 'floor' ? floorsQuery : activeTab === 'desk' ? desksQuery : roomsQuery

  const handleAuthError = (error: unknown) => {
    if (isUnauthorizedError(error)) {
      navigate('/login')
    }
  }

  const openCreateModal = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEditModal = (item: SpaceEntity) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingItem(null)
  }

  const handleSubmit = async (
    payload:
      | CreateFloorPayload
      | UpdateFloorPayload
      | CreateDeskPayload
      | UpdateDeskPayload
      | CreateRoomPayload
      | UpdateRoomPayload,
  ) => {
    try {
      if (activeTab === 'floor') {
        if (editingItem) {
          await updateFloor.mutateAsync({
            id: editingItem.id,
            payload: payload as UpdateFloorPayload,
          })
        } else {
          await createFloor.mutateAsync(payload as CreateFloorPayload)
        }
      } else if (activeTab === 'desk') {
        if (editingItem) {
          await updateDesk.mutateAsync({
            id: editingItem.id,
            payload: payload as UpdateDeskPayload,
          })
        } else {
          await createDesk.mutateAsync(payload as CreateDeskPayload)
        }
      } else if (editingItem) {
        await updateRoom.mutateAsync({
          id: editingItem.id,
          payload: payload as UpdateRoomPayload,
        })
      } else {
        await createRoom.mutateAsync(payload as CreateRoomPayload)
      }

      closeModal()
    } catch (error) {
      handleAuthError(error)
    }
  }

  const handleToggleActive = async (item: SpaceEntity) => {
    setTogglingId(item.id)
    try {
      if (activeTab === 'floor') {
        await toggleFloor.mutateAsync(item as AdminFloor)
      } else if (activeTab === 'desk') {
        await toggleDesk.mutateAsync(item as AdminDesk)
      } else {
        await toggleRoom.mutateAsync(item as AdminRoom)
      }
    } catch (error) {
      handleAuthError(error)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      if (activeTab === 'floor') {
        await deleteFloor.mutateAsync(deleteTarget.id)
      } else if (activeTab === 'desk') {
        await deleteDesk.mutateAsync(deleteTarget.id)
      } else {
        await deleteRoom.mutateAsync(deleteTarget.id)
      }
      setDeleteTarget(null)
    } catch (error) {
      handleAuthError(error)
    }
  }

  const isSubmitting =
    createFloor.isPending ||
    updateFloor.isPending ||
    createDesk.isPending ||
    updateDesk.isPending ||
    createRoom.isPending ||
    updateRoom.isPending

  const isDeleting = deleteFloor.isPending || deleteDesk.isPending || deleteRoom.isPending

  const tabLabel =
    activeTab === 'floor' ? 'Floor' : activeTab === 'desk' ? 'Desk' : 'Room'

  return (
    <DashboardLayout>
      <div className="admin-page">
        <header className="admin-page__header">
          <div>
            <h1>Manage Spaces</h1>
            <p>Create, update, and deactivate floors, desks, and rooms.</p>
          </div>
          <Button onClick={openCreateModal}>Create {tabLabel}</Button>
        </header>

        <div className="admin-tabs" role="tablist" aria-label="Space types">
          {(['floor', 'desk', 'room'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`admin-tabs__tab ${activeTab === tab ? 'admin-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'floor' ? 'Floors' : tab === 'desk' ? 'Desks' : 'Rooms'}
            </button>
          ))}
        </div>

        {activeQuery.isError && (
          <AdminErrorState
            message={getAdminErrorMessage(
              activeQuery.error,
              'Failed to load spaces.',
            )}
          />
        )}

        {activeTab === 'floor' && !isForbiddenError(activeQuery.error) && (
          <SpacesTable
            kind="floor"
            items={floorsQuery.data ?? []}
            isLoading={floorsQuery.isLoading}
            togglingId={togglingId}
            onToggleActive={handleToggleActive}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
            emptyMessage="No floors configured yet."
          />
        )}

        {activeTab === 'desk' && !isForbiddenError(activeQuery.error) && (
          <SpacesTable
            kind="desk"
            items={desksQuery.data ?? []}
            isLoading={desksQuery.isLoading}
            floorLabelById={floorLabelById}
            togglingId={togglingId}
            onToggleActive={handleToggleActive}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
            emptyMessage="No desks configured yet."
          />
        )}

        {activeTab === 'room' && !isForbiddenError(activeQuery.error) && (
          <SpacesTable
            kind="room"
            items={roomsQuery.data ?? []}
            isLoading={roomsQuery.isLoading}
            floorLabelById={floorLabelById}
            togglingId={togglingId}
            onToggleActive={handleToggleActive}
            onEdit={openEditModal}
            onDelete={setDeleteTarget}
            emptyMessage="No rooms configured yet."
          />
        )}

        <SpaceFormModal
          open={modalOpen}
          kind={activeTab}
          item={editingItem}
          floors={floorsQuery.data ?? []}
          isSubmitting={isSubmitting}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title={`Delete ${tabLabel}`}
          message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? Prefer deactivating via the status toggle when possible.`}
          confirmLabel="Delete"
          isLoading={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        />
      </div>
    </DashboardLayout>
  )
}

export default SpacesPage
