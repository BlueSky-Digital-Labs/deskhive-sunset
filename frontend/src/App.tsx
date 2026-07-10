import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@store/index'
import { refresh, selectIsAuthenticated } from '@store/authSlice'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import { DashboardPage } from '@pages/dashboard'
import ProtectedRoute from '@components/ProtectedRoute'

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
      <Route path="/register" element={<Navigate to="/signup" replace />} />
    </Routes>
  )
}

export default App
