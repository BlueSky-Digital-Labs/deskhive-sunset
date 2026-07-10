import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { RootState } from '@store/index'
import { logout, selectIsAuthenticated } from '@store/authSlice'
import { Button } from '@components/atoms/Button'
import { Logo } from '@components/atoms/Logo'
import { User, LogOut } from 'lucide-react'
import './Header.css'

export const Header = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  return (
    <header className="header">
      <div className="header__container">
        <Link to="/" className="header__logo">
          <Logo size="md" />
        </Link>

        <nav className="header__nav">
          {isAuthenticated ? (
            <div className="header__user-menu">
              <span className="header__user-info">
                <User size={16} />
                Welcome, {user?.email?.split('@')[0] || 'User'}
              </span>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </Button>
            </div>
          ) : (
            <div className="header__auth-links">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
