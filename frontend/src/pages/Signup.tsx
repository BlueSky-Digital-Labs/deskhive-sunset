import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { AppDispatch, RootState } from '@store/index'
import { clearError, selectIsAuthenticated, selectIsAuthLoading, signup } from '@store/authSlice'
import { Button } from '@components/atoms/Button'
import { Input } from '@components/atoms/Input'
import Paper from '@mui/material/Paper'
import './auth.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

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
    const nextErrors: {
      email?: string
      password?: string
      confirmPassword?: string
    } = {}

    if (email && !emailPattern.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (password && password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }

    if (confirmPassword && confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    return nextErrors
  }, [confirmPassword, email, password])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = {
      email: !email ? 'Email is required.' : validationErrors.email,
      password: !password ? 'Password is required.' : validationErrors.password,
      confirmPassword: !confirmPassword
        ? 'Please confirm your password.'
        : validationErrors.confirmPassword,
    }

    setFieldErrors(nextErrors)

    if (nextErrors.email || nextErrors.password || nextErrors.confirmPassword) {
      return
    }

    const result = await dispatch(signup({ email, password }))
    if (signup.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true })
    }
  }

  const handleFieldChange = (
    field: 'email' | 'password' | 'confirmPassword',
    value: string,
  ) => {
    if (field === 'email') {
      setEmail(value)
    } else if (field === 'password') {
      setPassword(value)
    } else {
      setConfirmPassword(value)
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
          <h1>Create account</h1>
          <p>Sign up to start using DeskHive</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {(error || fieldErrors.email || fieldErrors.password || fieldErrors.confirmPassword) && (
            <div className="auth-error" role="alert" aria-live="polite">
              {error || fieldErrors.email || fieldErrors.password || fieldErrors.confirmPassword}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <Input
              id="signup-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => handleFieldChange('email', event.target.value)}
              aria-invalid={Boolean(fieldErrors.email || validationErrors.email)}
              fullWidth
              required
            />
            {(fieldErrors.email || validationErrors.email) && (
              <span className="auth-field-error">
                {fieldErrors.email || validationErrors.email}
              </span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <Input
              id="signup-password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => handleFieldChange('password', event.target.value)}
              aria-invalid={Boolean(fieldErrors.password || validationErrors.password)}
              fullWidth
              required
            />
            {(fieldErrors.password || validationErrors.password) && (
              <span className="auth-field-error">
                {fieldErrors.password || validationErrors.password}
              </span>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm-password">Confirm password</label>
            <Input
              id="signup-confirm-password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => handleFieldChange('confirmPassword', event.target.value)}
              aria-invalid={Boolean(fieldErrors.confirmPassword || validationErrors.confirmPassword)}
              fullWidth
              required
            />
            {(fieldErrors.confirmPassword || validationErrors.confirmPassword) && (
              <span className="auth-field-error">
                {fieldErrors.confirmPassword || validationErrors.confirmPassword}
              </span>
            )}
          </div>

          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
            Create account
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Paper>
    </div>
  )
}
