import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useSidebarContent } from '@hooks/useContent'
import { Logo } from '@components/atoms/Logo'
import {
  LayoutDashboard,
  CalendarDays,
  Monitor,
  DoorOpen,
  LogOut,
  Building2,
  LineChart,
} from 'lucide-react'
import './Sidebar.css'

export const Sidebar = () => {
  const location = useLocation()
  const { logout, isAdmin } = useAuth()
  const sidebarContent = useSidebarContent()

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: sidebarContent.menuItems.dashboard,
      path: '/dashboard',
    },
    {
      icon: CalendarDays,
      label: sidebarContent.menuItems.myBookings,
      path: '/my/bookings',
    },
    {
      icon: Monitor,
      label: sidebarContent.menuItems.bookDesk,
      path: '/desks',
    },
    {
      icon: DoorOpen,
      label: sidebarContent.menuItems.bookRoom,
      path: '/rooms',
    },
  ]

  const adminMenuItems = isAdmin
    ? [
        {
          icon: Building2,
          label: sidebarContent.menuItems.adminSpaces,
          path: '/admin/spaces',
        },
        {
          icon: LineChart,
          label: sidebarContent.menuItems.utilisation,
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
