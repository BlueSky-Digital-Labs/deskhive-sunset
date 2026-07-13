import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useMemo } from 'react'
import { RootState, AppDispatch } from '@store/index'
import { fetchProfile, logout, selectIsAuthenticated } from '@store/authSlice'
import { deriveIsAdmin } from '@/utils/isAdmin'

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { user, accessToken, refreshToken, status, error } = useSelector(
    (state: RootState) => state.auth,
  )
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isAdmin = useMemo(
    () => deriveIsAdmin(user, accessToken),
    [user, accessToken],
  )

  useEffect(() => {
    if (accessToken && !user) {
      void dispatch(fetchProfile())
    }
  }, [accessToken, dispatch, user])

  const handleLogout = () => {
    dispatch(logout())
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isAdmin,
    isLoading: status === 'loading',
    error,
    logout: handleLogout,
  }
}
