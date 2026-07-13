import { useQuery } from '@tanstack/react-query'
import { getUtilisation } from '@/api/admin'
import type { UtilisationParams } from '@/features/admin/types'

export const utilisationKeys = {
  all: ['admin', 'utilisation'] as const,
  report: (params: UtilisationParams) =>
    [...utilisationKeys.all, params.startDate, params.endDate, params.floorId ?? 'all'] as const,
}

export function useUtilisation(params: UtilisationParams, enabled = true) {
  return useQuery({
    queryKey: utilisationKeys.report(params),
    queryFn: () => getUtilisation(params),
    enabled: enabled && Boolean(params.startDate && params.endDate),
  })
}
