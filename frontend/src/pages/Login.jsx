// ...imports unchanged
export default function Login() {
  // ...
  const redirect = sp.get('redirect') || '/profile'
  const API = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'').replace(/\/api$/i,'')

  // ...same local login code

  return (
    <div className="max-w-md p-6 mx-auto">
      {/* ... */}
      <div className="mt-6 space-y-2">
        <a className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
           href={`${API}/api/auth/google?redirect=${encodeURIComponent(redirect)}`}>
          Continue with Google
        </a>
        <a className="block p-2 text-center border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
           href={`${API}/api/auth/github?redirect=${encodeURIComponent(redirect)}`}>
          Continue with GitHub
        </a>
      </div>
      {/* ... */}
    </div>
  )
}
