import { Link } from 'react-router-dom'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import { Monitor, DoorOpen, CalendarDays } from 'lucide-react'
import { useAuth } from '@hooks/useAuth'
import { useDashboardContent } from '@hooks/useContent'
import { DashboardLayout } from '@components/templates/DashboardLayout'
import { EmptyState } from '@components/EmptyState'
import './DashboardPage.css'

const quickLinkIcons: Record<string, typeof Monitor> = {
  '/desks': Monitor,
  '/rooms': DoorOpen,
  '/my/bookings': CalendarDays,
}

const DashboardPage = () => {
  const { user } = useAuth()
  const dashboardContent = useDashboardContent()
  const displayName = user?.email?.split('@')[0] || 'User'
  const avatarInitial = user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <Paper className="dashboard-header" elevation={2}>
          <div className="welcome-section">
            <Typography variant="h4" component="h1" className="dashboard-header__title">
              {dashboardContent.welcome.title}, {displayName}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {dashboardContent.welcome.subtitle}
            </Typography>
          </div>
          <Avatar className="dashboard-header__avatar" aria-hidden="true">
            {avatarInitial}
          </Avatar>
        </Paper>

        <EmptyState
          title={dashboardContent.emptyState.title}
          message={dashboardContent.emptyState.message}
        />

        <section className="dashboard-quick-links" aria-labelledby="dashboard-quick-links-title">
          <Typography id="dashboard-quick-links-title" variant="h6" component="h2" className="dashboard-quick-links__heading">
            {dashboardContent.quickLinks.title}
          </Typography>
          <div className="dashboard-quick-links__grid">
            {dashboardContent.quickLinks.items.map((item) => {
              const Icon = quickLinkIcons[item.path] ?? Monitor

              return (
                <Card key={item.path} className="dashboard-quick-link-card" elevation={2}>
                  <CardActionArea component={Link} to={item.path} className="dashboard-quick-link">
                    <CardContent className="dashboard-quick-link__content">
                      <span className="dashboard-quick-link__icon" aria-hidden="true">
                        <Icon size={22} />
                      </span>
                      <span className="dashboard-quick-link__label">{item.label}</span>
                      <span className="dashboard-quick-link__description">{item.description}</span>
                    </CardContent>
                  </CardActionArea>
                </Card>
              )
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage
