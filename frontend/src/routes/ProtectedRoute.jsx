import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { user, isGuest, restoring } = useAuth()
  const location = useLocation()

  if (restoring) {
    return <div className="coin-boot">Checking your session...</div>
  }

  if (!user && !isGuest) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
