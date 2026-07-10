export interface Floor {
  id: number
  name: string
  building: string
  level: string
  is_active: boolean
  created_at: string
}

export interface Desk {
  id: number
  name: string
  floor: number
  is_active: boolean
}

export interface Room {
  id: number
  name: string
  floor: number
  capacity: number
  is_active: boolean
}

export interface DeskAvailability {
  id: number
  name: string
  floor: number
  available: boolean
}

export interface RoomAvailability {
  id: number
  name: string
  floor: number
  capacity: number
  available: boolean
}
