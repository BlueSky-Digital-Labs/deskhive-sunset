import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@store/index'
import { refresh, selectIsAuthenticated } from '@store/authSlice'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import { DashboardPage } from '@pages/dashboard'
import FloorsPage from '@/features/spaces/FloorsPage'
import DesksPage from '@/features/spaces/DesksPage'
import RoomsPage from '@/features/spaces/RoomsPage'
import RoomsRoute from '@/routes/rooms/RoomsRoute'
import MyBookingsRoute from '@/routes/my/MyBookingsRoute'
import ProtectedRoute from '@components/ProtectedRoute'
import { ToastProvider } from '@/lib/toast'

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const refreshToken = useSelector((state: RootState) => state.auth.refreshToken)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  useEffect(() => {
    if (refreshToken) {
      void dispatch(refresh())
    }
  }, [dispatch, refreshToken])

  return (
    <ToastProvider>
      <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/spaces/floors"
        element={
          <ProtectedRoute>
            <FloorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/spaces/desks"
        element={
          <ProtectedRoute>
            <DesksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/spaces/rooms"
        element={
          <ProtectedRoute>
            <RoomsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute>
            <RoomsRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my/bookings"
        element={
          <ProtectedRoute>
            <MyBookingsRoute />
          </ProtectedRoute>
        }
      />
      <Route path="/register" element={<Navigate to="/signup" replace />} />
      </Routes>
    </ToastProvider>
  )
}

export default App
