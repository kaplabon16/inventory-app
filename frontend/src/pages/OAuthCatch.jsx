import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function OAuthCatch() {
  const nav = useNavigate()
  const { setToken, loadMe } = useAuth()

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const token = hash.get('token')
    const rd = hash.get('rd') || '/profile'
    if (token) {
      setToken(token)
    }
    ;(async () => {
      await loadMe()
      nav(rd, { replace: true })
    })()
  }, [])

  return <div className="p-6">Signing you in…</div>
}
