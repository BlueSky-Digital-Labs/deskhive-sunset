import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
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
import './SpaceFormModal.css'

type SpaceEntity = AdminFloor | AdminDesk | AdminRoom

interface SpaceFormModalProps {
  open: boolean
  kind: SpaceKind
  item?: SpaceEntity | null
  floors: AdminFloor[]
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (
    payload:
      | CreateFloorPayload
      | UpdateFloorPayload
      | CreateDeskPayload
      | UpdateDeskPayload
      | CreateRoomPayload
      | UpdateRoomPayload,
  ) => void
}

interface FormState {
  name: string
  building: string
  level: string
  floor: string
  capacity: string
  is_active: boolean
}

const defaultFormState: FormState = {
  name: '',
  building: '',
  level: '',
  floor: '',
  capacity: '1',
  is_active: true,
}

function getTitle(kind: SpaceKind, isEditing: boolean): string {
  const label = kind === 'floor' ? 'Floor' : kind === 'desk' ? 'Desk' : 'Room'
  return isEditing ? `Edit ${label}` : `Create ${label}`
}

export function SpaceFormModal({
  open,
  kind,
  item,
  floors,
  isSubmitting = false,
  onClose,
  onSubmit,
}: SpaceFormModalProps) {
  const [form, setForm] = useState<FormState>(defaultFormState)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = Boolean(item)

  useEffect(() => {
    if (!open) {
      return
    }

    if (!item) {
      setForm({
        ...defaultFormState,
        floor: floors[0] ? String(floors[0].id) : '',
      })
      setErrors({})
      return
    }

    if (kind === 'floor') {
      const floor = item as AdminFloor
      setForm({
        name: floor.name,
        building: floor.building,
        level: floor.level,
        floor: '',
        capacity: '1',
        is_active: floor.is_active,
      })
    } else if (kind === 'desk') {
      const desk = item as AdminDesk
      setForm({
        name: desk.name,
        building: '',
        level: '',
        floor: String(desk.floor),
        capacity: '1',
        is_active: desk.is_active,
      })
    } else {
      const room = item as AdminRoom
      setForm({
        name: room.name,
        building: '',
        level: '',
        floor: String(room.floor),
        capacity: String(room.capacity),
        is_active: room.is_active,
      })
    }

    setErrors({})
  }, [open, item, kind, floors])

  const activeFloors = useMemo(
    () => floors.filter((floor) => floor.is_active),
    [floors],
  )

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {}

    if (!form.name.trim()) {
      nextErrors.name = 'Name is required'
    }

    if (kind === 'floor') {
      if (!form.building.trim()) {
        nextErrors.building = 'Building is required'
      }
      if (!form.level.trim()) {
        nextErrors.level = 'Level is required'
      }
    }

    if (kind !== 'floor' && !form.floor) {
      nextErrors.floor = 'Floor is required'
    }

    if (kind === 'room') {
      const capacity = Number(form.capacity)
      if (!Number.isInteger(capacity) || capacity < 1) {
        nextErrors.capacity = 'Capacity must be at least 1'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    if (kind === 'floor') {
      onSubmit({
        name: form.name.trim(),
        building: form.building.trim(),
        level: form.level.trim(),
        is_active: form.is_active,
      })
      return
    }

    if (kind === 'desk') {
      onSubmit({
        name: form.name.trim(),
        floor: Number(form.floor),
        is_active: form.is_active,
      })
      return
    }

    onSubmit({
      name: form.name.trim(),
      floor: Number(form.floor),
      capacity: Number(form.capacity),
      is_active: form.is_active,
    })
  }

  if (!open) {
    return null
  }

  return (
    <div className="space-form-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="space-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="space-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="space-form-modal__header">
          <h2 id="space-form-title">{getTitle(kind, isEditing)}</h2>
          <button type="button" className="space-form-modal__close" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="space-form-modal__form" onSubmit={handleSubmit}>
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            error={errors.name}
            fullWidth
          />

          {kind === 'floor' && (
            <>
              <Input
                label="Building"
                value={form.building}
                onChange={(event) =>
                  setForm((current) => ({ ...current, building: event.target.value }))
                }
                error={errors.building}
                fullWidth
              />
              <Input
                label="Level"
                value={form.level}
                onChange={(event) =>
                  setForm((current) => ({ ...current, level: event.target.value }))
                }
                error={errors.level}
                fullWidth
              />
            </>
          )}

          {kind !== 'floor' && (
            <div className="input-group input-group--full-width">
              <label htmlFor="space-floor" className="input__label">
                Floor
              </label>
              <select
                id="space-floor"
                className="space-form-modal__select"
                value={form.floor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, floor: event.target.value }))
                }
              >
                <option value="">Select a floor</option>
                {activeFloors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name} ({floor.building} · Level {floor.level})
                  </option>
                ))}
              </select>
              {errors.floor && <span className="input__error">{errors.floor}</span>}
            </div>
          )}

          {kind === 'room' && (
            <Input
              label="Capacity"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(event) =>
                setForm((current) => ({ ...current, capacity: event.target.value }))
              }
              error={errors.capacity}
              fullWidth
            />
          )}

          <label className="space-form-modal__checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            Active
          </label>

          <div className="space-form-modal__actions">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
