import { Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useDashboardContent } from '@hooks/useContent'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { EmptyState } from '@components/EmptyState'
import './DashboardPage.css'

const DashboardPage = () => {
  const { user } = useAuth()
  const dashboardContent = useDashboardContent()

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div className="welcome-section">
            <h1>
              {dashboardContent.welcome.title}, {user?.email?.split('@')[0] || 'User'}!
            </h1>
            <p>{dashboardContent.welcome.subtitle}</p>
          </div>
          <div className="user-avatar">
            <div className="avatar-circle">
              <span>{user?.email?.[0]?.toUpperCase() || 'U'}</span>
            </div>
          </div>
        </div>

        <EmptyState
          title={dashboardContent.emptyState.title}
          message={dashboardContent.emptyState.message}
        />

        <div className="dashboard-quick-links">
          <h2>{dashboardContent.quickLinks.title}</h2>
          <div className="dashboard-quick-links__grid">
            {dashboardContent.quickLinks.items.map((item) => (
              <Link key={item.path} to={item.path} className="dashboard-quick-link">
                <span className="dashboard-quick-link__label">{item.label}</span>
                <span className="dashboard-quick-link__description">{item.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage
