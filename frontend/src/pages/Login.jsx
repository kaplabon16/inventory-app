import { useAuth } from '../store/auth'
import { useEffect } from 'react'

export default function Login() {
  const { loginGoogle, loginGithub, loadMe } = useAuth()
  useEffect(()=>{ loadMe() },[])
  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <div className="grid gap-3">
        <button onClick={loginGoogle} className="border rounded px-3 py-2">Continue with Google</button>
        <button onClick={loginGithub} className="border rounded px-3 py-2">Continue with GitHub</button>
      </div>
    </div>
  )
}
