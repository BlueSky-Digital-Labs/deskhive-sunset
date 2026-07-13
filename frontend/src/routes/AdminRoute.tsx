import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

interface AdminRouteProps {
  children: ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()

  if (isLoading && !isAuthenticated) {
    return <div role="status">Loading session...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/404" replace />
  }

  return <>{children}</>
}

export default AdminRoute
