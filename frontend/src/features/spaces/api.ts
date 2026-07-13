import { http } from '@/lib/api/http'
import type { PaginatedResponse } from '@/types/api'
import type {
  Desk,
  DeskAvailability,
  Floor,
  Room,
  RoomAvailability,
} from './types'

export async function getFloors(): Promise<Floor[]> {
  const data = await http<PaginatedResponse<Floor>>('/api/v1/floors/')
  return data.results
}

export async function getDesks(): Promise<Desk[]> {
  const data = await http<PaginatedResponse<Desk>>('/api/v1/desks/')
  return data.results
}

export async function getRooms(): Promise<Room[]> {
  const data = await http<PaginatedResponse<Room>>('/api/v1/rooms/')
  return data.results
}

export async function getDeskAvailability(date: string): Promise<DeskAvailability[]> {
  const params = new URLSearchParams({ date })
  return http<DeskAvailability[]>(`/api/v1/availability/desks/?${params.toString()}`)
}

export async function getRoomAvailability(
  startISO: string,
  endISO: string,
): Promise<RoomAvailability[]> {
  const params = new URLSearchParams({ start: startISO, end: endISO })
  return http<RoomAvailability[]>(`/api/v1/availability/rooms/?${params.toString()}`)
}
