import { apiFetch } from '@/lib/api'
import type { PaginatedResponse } from '@/types/api'
import type {
  AdminDesk,
  AdminFloor,
  AdminRoom,
  CreateDeskPayload,
  CreateFloorPayload,
  CreateRoomPayload,
  UpdateDeskPayload,
  UpdateFloorPayload,
  UpdateRoomPayload,
  UtilisationParams,
  UtilisationReport,
} from '@/features/admin/types'

const ADMIN_FLOORS_URL = '/api/v1/admin/floors/'
const ADMIN_DESKS_URL = '/api/v1/admin/desks/'
const ADMIN_ROOMS_URL = '/api/v1/admin/rooms/'
const UTILISATION_URL = '/api/v1/admin/utilisation'

async function listAll<T>(url: string): Promise<T[]> {
  const data = await apiFetch<PaginatedResponse<T>>(url)
  return data.results
}

export async function listFloors(): Promise<AdminFloor[]> {
  return listAll<AdminFloor>(ADMIN_FLOORS_URL)
}

export async function createFloor(payload: CreateFloorPayload): Promise<AdminFloor> {
  return apiFetch<AdminFloor>(ADMIN_FLOORS_URL, { method: 'POST', body: payload })
}

export async function updateFloor(
  id: number,
  payload: UpdateFloorPayload,
): Promise<AdminFloor> {
  return apiFetch<AdminFloor>(`${ADMIN_FLOORS_URL}${id}/`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteFloor(id: number): Promise<void> {
  await apiFetch<void>(`${ADMIN_FLOORS_URL}${id}/`, { method: 'DELETE' })
}

export async function listDesks(): Promise<AdminDesk[]> {
  return listAll<AdminDesk>(ADMIN_DESKS_URL)
}

export async function createDesk(payload: CreateDeskPayload): Promise<AdminDesk> {
  return apiFetch<AdminDesk>(ADMIN_DESKS_URL, { method: 'POST', body: payload })
}

export async function updateDesk(
  id: number,
  payload: UpdateDeskPayload,
): Promise<AdminDesk> {
  return apiFetch<AdminDesk>(`${ADMIN_DESKS_URL}${id}/`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteDesk(id: number): Promise<void> {
  await apiFetch<void>(`${ADMIN_DESKS_URL}${id}/`, { method: 'DELETE' })
}

export async function listRooms(): Promise<AdminRoom[]> {
  return listAll<AdminRoom>(ADMIN_ROOMS_URL)
}

export async function createRoom(payload: CreateRoomPayload): Promise<AdminRoom> {
  return apiFetch<AdminRoom>(ADMIN_ROOMS_URL, { method: 'POST', body: payload })
}

export async function updateRoom(
  id: number,
  payload: UpdateRoomPayload,
): Promise<AdminRoom> {
  return apiFetch<AdminRoom>(`${ADMIN_ROOMS_URL}${id}/`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteRoom(id: number): Promise<void> {
  await apiFetch<void>(`${ADMIN_ROOMS_URL}${id}/`, { method: 'DELETE' })
}

export async function getUtilisation(params: UtilisationParams): Promise<UtilisationReport> {
  const search = new URLSearchParams({
    start_date: params.startDate,
    end_date: params.endDate,
  })

  if (params.floorId !== undefined && params.floorId !== null) {
    search.set('floor_id', String(params.floorId))
  }

  return apiFetch<UtilisationReport>(`${UTILISATION_URL}?${search.toString()}`)
}
