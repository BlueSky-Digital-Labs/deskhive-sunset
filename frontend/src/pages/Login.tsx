import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '@store/index'
import { clearError, login, selectIsAuthenticated, selectIsAuthLoading } from '@store/authSlice'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import Paper from '@mui/material/Paper'
import './auth.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const error = useSelector((state: RootState) => state.auth.error)
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading = useSelector(selectIsAuthLoading)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const validationErrors = useMemo(() => {
    const nextErrors: { email?: string; password?: string } = {}

    if (email && !emailPattern.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (password && password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    return nextErrors
  }, [email, password])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = {
      email: !email ? 'Email is required.' : validationErrors.email,
      password: !password ? 'Password is required.' : validationErrors.password,
    }

    setFieldErrors(nextErrors)

    if (nextErrors.email || nextErrors.password) {
      return
    }

    const result = await dispatch(login({ email, password }))
    if (login.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    }
  }

  const handleFieldChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value)
    } else {
      setPassword(value)
    }

    if (error) {
      dispatch(clearError())
    }

    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  return (
    <div className="auth-page">
      <Paper className="auth-container" elevation={3}>
        <div className="auth-header">
          <h1>Sign in</h1>
          <p>Access your DeskHive account</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {(error || fieldErrors.email || fieldErrors.password) && (
            <div className="auth-error" role="alert" aria-live="polite">
              {error || fieldErrors.email || fieldErrors.password}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <Input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              aria-invalid={Boolean(fieldErrors.email || validationErrors.email)}
              aria-describedby={fieldErrors.email || validationErrors.email ? 'login-email-error' : undefined}
              fullWidth
              required
            />
            {(fieldErrors.email || validationErrors.email) && (
              <span id="login-email-error" className="auth-field-error">
                {fieldErrors.email || validationErrors.email}
              </span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <Input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => handleFieldChange('password', event.target.value)}
              aria-invalid={Boolean(fieldErrors.password || validationErrors.password)}
              aria-describedby={fieldErrors.password || validationErrors.password ? 'login-password-error' : undefined}
              fullWidth
              required
            />
            {(fieldErrors.password || validationErrors.password) && (
              <span id="login-password-error" className="auth-field-error">
                {fieldErrors.password || validationErrors.password}
              </span>
            )}
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </p>
      </Paper>
    </div>
  )
}
