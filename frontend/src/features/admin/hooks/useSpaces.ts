import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDesk,
  createFloor,
  createRoom,
  deleteDesk,
  deleteFloor,
  deleteRoom,
  listDesks,
  listFloors,
  listRooms,
  updateDesk,
  updateFloor,
  updateRoom,
} from '@/api/admin'
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
} from '@/features/admin/types'

export const adminSpacesKeys = {
  floors: ['admin', 'spaces', 'floors'] as const,
  desks: ['admin', 'spaces', 'desks'] as const,
  rooms: ['admin', 'spaces', 'rooms'] as const,
}

export function useAdminFloors() {
  return useQuery({
    queryKey: adminSpacesKeys.floors,
    queryFn: listFloors,
  })
}

export function useCreateFloor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFloorPayload) => createFloor(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.floors })
    },
  })
}

export function useUpdateFloor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateFloorPayload }) =>
      updateFloor(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.floors })
    },
  })
}

export function useDeleteFloor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteFloor(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.floors })
    },
  })
}

export function useToggleFloorActive() {
  const updateMutation = useUpdateFloor()
  return {
    ...updateMutation,
    mutate: (floor: AdminFloor) =>
      updateMutation.mutate({ id: floor.id, payload: { is_active: !floor.is_active } }),
    mutateAsync: (floor: AdminFloor) =>
      updateMutation.mutateAsync({ id: floor.id, payload: { is_active: !floor.is_active } }),
  }
}

export function useAdminDesks() {
  return useQuery({
    queryKey: adminSpacesKeys.desks,
    queryFn: listDesks,
  })
}

export function useCreateDesk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDeskPayload) => createDesk(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.desks })
    },
  })
}

export function useUpdateDesk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateDeskPayload }) =>
      updateDesk(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.desks })
    },
  })
}

export function useDeleteDesk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteDesk(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.desks })
    },
  })
}

export function useToggleDeskActive() {
  const updateMutation = useUpdateDesk()
  return {
    ...updateMutation,
    mutate: (desk: AdminDesk) =>
      updateMutation.mutate({ id: desk.id, payload: { is_active: !desk.is_active } }),
    mutateAsync: (desk: AdminDesk) =>
      updateMutation.mutateAsync({ id: desk.id, payload: { is_active: !desk.is_active } }),
  }
}

export function useAdminRooms() {
  return useQuery({
    queryKey: adminSpacesKeys.rooms,
    queryFn: listRooms,
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateRoomPayload) => createRoom(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.rooms })
    },
  })
}

export function useUpdateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateRoomPayload }) =>
      updateRoom(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.rooms })
    },
  })
}

export function useDeleteRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteRoom(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSpacesKeys.rooms })
    },
  })
}

export function useToggleRoomActive() {
  const updateMutation = useUpdateRoom()
  return {
    ...updateMutation,
    mutate: (room: AdminRoom) =>
      updateMutation.mutate({ id: room.id, payload: { is_active: !room.is_active } }),
    mutateAsync: (room: AdminRoom) =>
      updateMutation.mutateAsync({ id: room.id, payload: { is_active: !room.is_active } }),
  }
}
