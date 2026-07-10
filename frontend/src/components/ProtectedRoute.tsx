import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectIsAuthLoading } from '@store/authSlice'

interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
}

export const ProtectedRoute = ({
  children,
  redirectTo = '/login',
}: ProtectedRouteProps) => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading = useSelector(selectIsAuthLoading)
  const location = useLocation()

  if (isLoading && !isAuthenticated) {
    return <div role="status" aria-live="polite">Loading session...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export default ProtectedRoute
