import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useSidebarContent } from '@hooks/useContent'
import { Logo } from '@components/atoms/Logo'
import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  LineChart,
} from 'lucide-react'
import './Sidebar.css'

// Menu items are now defined inside the component to use content hook

export const Sidebar = () => {
  const location = useLocation()
  const { logout, isAdmin } = useAuth()
  const sidebarContent = useSidebarContent()

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: sidebarContent.menuItems.dashboard,
      path: '/dashboard',
      active: true
    },
    {
      icon: Briefcase,
      label: sidebarContent.menuItems.jobs,
      path: '/jobs'
    },
    {
      icon: Calendar,
      label: sidebarContent.menuItems.calendar,
      path: '/calendar'
    },
    {
      icon: CalendarDays,
      label: 'My Bookings',
      path: '/my/bookings'
    },
    {
      icon: Users,
      label: sidebarContent.menuItems.clients,
      path: '/clients'
    },
    {
      icon: Users,
      label: sidebarContent.menuItems.employees,
      path: '/employees'
    },
    {
      icon: BarChart3,
      label: sidebarContent.menuItems.invoicing,
      path: '/invoicing'
    },
    {
      icon: Settings,
      label: sidebarContent.menuItems.settings,
      path: '/settings'
    }
  ]

  const adminMenuItems = isAdmin
    ? [
        {
          icon: Building2,
          label: 'Admin Spaces',
          path: '/admin/spaces',
        },
        {
          icon: LineChart,
          label: 'Utilisation',
          path: '/admin/utilisation',
        },
      ]
    : []

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Logo size="lg" className="logo--light" />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {adminMenuItems.length > 0 && (
          <div className="sidebar-nav__section">
            <p className="sidebar-nav__section-label">Admin</p>
            {adminMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          <span>{sidebarContent.user.logout}</span>
        </button>
      </div>
    </div>
  )
}
