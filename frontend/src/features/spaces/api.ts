import { apiFetch } from '@/lib/api'
import type { PaginatedResponse } from '@/types/api'
import type {
  Desk,
  DeskAvailability,
  Floor,
  Room,
  RoomAvailability,
} from './types'

export async function getFloors(): Promise<Floor[]> {
  const data = await apiFetch<PaginatedResponse<Floor>>('/api/v1/floors/')
  return data.results
}

export async function getDesks(): Promise<Desk[]> {
  const data = await apiFetch<PaginatedResponse<Desk>>('/api/v1/desks/')
  return data.results
}

export async function getRooms(): Promise<Room[]> {
  const data = await apiFetch<PaginatedResponse<Room>>('/api/v1/rooms/')
  return data.results
}

export async function getDeskAvailability(date: string): Promise<DeskAvailability[]> {
  const params = new URLSearchParams({ date })
  return apiFetch<DeskAvailability[]>(`/api/v1/availability/desks/?${params.toString()}`)
}

export async function getRoomAvailability(
  startISO: string,
  endISO: string,
): Promise<RoomAvailability[]> {
  const params = new URLSearchParams({ start: startISO, end: endISO })
  return apiFetch<RoomAvailability[]>(`/api/v1/availability/rooms/?${params.toString()}`)
}
