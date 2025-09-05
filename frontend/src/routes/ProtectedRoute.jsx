import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="p-6">Loading…</div>
  if (user) return children
  const redirect = encodeURIComponent(location.pathname + location.search)
  return <Navigate to={`/login?redirect=${redirect}`} replace />
}
