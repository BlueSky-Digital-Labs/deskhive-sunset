export interface AdminFloor {
  id: number
  name: string
  building: string
  level: string
  is_active: boolean
  created_at: string
}

export interface AdminDesk {
  id: number
  name: string
  floor: number
  is_active: boolean
}

export interface AdminRoom {
  id: number
  name: string
  floor: number
  capacity: number
  is_active: boolean
}

export type SpaceKind = 'floor' | 'desk' | 'room'

export interface CreateFloorPayload {
  name: string
  building: string
  level: string
  is_active?: boolean
}

export interface UpdateFloorPayload {
  name?: string
  building?: string
  level?: string
  is_active?: boolean
}

export interface CreateDeskPayload {
  name: string
  floor: number
  is_active?: boolean
}

export interface UpdateDeskPayload {
  name?: string
  floor?: number
  is_active?: boolean
}

export interface CreateRoomPayload {
  name: string
  floor: number
  capacity: number
  is_active?: boolean
}

export interface UpdateRoomPayload {
  name?: string
  floor?: number
  capacity?: number
  is_active?: boolean
}

export interface ResourceMetrics {
  resource_count: number
  bookings_count: number
  checked_in_count: number
  utilisation_rate: number
}

export interface DailyResourceMetrics {
  bookings_count: number
  checked_in_count: number
  utilisation_rate: number
}

export interface UtilisationDailyRow {
  date: string
  desks: DailyResourceMetrics
  rooms: DailyResourceMetrics
}

export interface UtilisationReport {
  start_date: string
  end_date: string
  floor_id: number | null
  summary: {
    desks: ResourceMetrics
    rooms: ResourceMetrics
  }
  daily: UtilisationDailyRow[]
}

export interface UtilisationParams {
  startDate: string
  endDate: string
  floorId?: number | null
}
