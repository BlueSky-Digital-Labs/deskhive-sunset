import { Link } from 'react-router-dom'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import '@/pages/NotFoundPage.css'

export function NotFound() {
  return (
    <DashboardLayout>
      <div className="not-found-page">
        <h1>404</h1>
        <p>The page you requested could not be found or you do not have access.</p>
        <Link to="/dashboard" className="not-found-page__link">
          Back to dashboard
        </Link>
      </div>
    </DashboardLayout>
  )
}

export default NotFound
