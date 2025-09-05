// frontend/src/pages/OAuthCatch.jsx
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


    if (window.history && window.history.replaceState) {
      const url = window.location.pathname + window.location.search
      window.history.replaceState(null, '', url)
    }

    (async () => {
      if (token) {
        setToken(token)
      }
      await loadMe()
      nav(rd, { replace: true })
    })()
  }, []) 

  return <div className="p-6">Signing you in…</div>
}
