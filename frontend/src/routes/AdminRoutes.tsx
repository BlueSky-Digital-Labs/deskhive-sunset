import { Navigate, Route, Routes } from 'react-router-dom'
import SpacesPage from '@/features/admin/pages/SpacesPage'
import UtilisationPage from '@/features/admin/pages/UtilisationPage'

export function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="spaces" replace />} />
      <Route path="spaces" element={<SpacesPage />} />
      <Route path="utilisation" element={<UtilisationPage />} />
    </Routes>
  )
}

export default AdminRoutes
