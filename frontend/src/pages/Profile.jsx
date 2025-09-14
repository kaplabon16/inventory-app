import { useEffect, useState } from "react"
import api, { apiUrl } from "../api/client"
import { useAuth } from "../store/auth"

export default function Profile() {
  const { user } = useAuth()
  const [company, setCompany] = useState(user?.name || "")
  const [phone, setPhone] = useState("")
  const [title, setTitle] = useState("")
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")

  useEffect(()=>{ setCompany(user?.name || "") },[user])

  const syncSF = async () => {
    setMsg(""); setErr("")
    try {
      const { data } = await api.post(apiUrl("/integrations/salesforce/sync-self"), { company, phone, title })
      if (data?.ok) setMsg(`Synced to Salesforce. Account: ${data.accountId}, Contact: ${data.contactId}`)
      else setErr("Unexpected response")
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || "Failed to sync")
    }
  }

  if (!user) return <div className="p-6">Please log in.</div>

  return (
    <div className="max-w-2xl p-6 mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Profile</h2>
      <div>Name: {user.name}</div>
      <div>Email: {user.email}</div>

      <div className="p-4 mt-4 border rounded">
        <div className="mb-2 text-lg font-semibold">Salesforce CRM</div>
        <p className="mb-3 text-sm text-gray-600">Create an Account + linked Contact in your Salesforce Dev org.</p>

        {msg && <div className="mb-2 text-sm text-green-600">{msg}</div>}
        {err && <div className="mb-2 text-sm text-red-600">{err}</div>}

        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-sm">Company (Account Name)</span>
            <input className="px-2 py-1 border rounded" value={company} onChange={e=>setCompany(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Phone</span>
            <input className="px-2 py-1 border rounded" value={phone} onChange={e=>setPhone(e.target.value)} />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Title (for Contact)</span>
            <input className="px-2 py-1 border rounded" value={title} onChange={e=>setTitle(e.target.value)} />
          </label>
        </div>

        <div className="flex justify-end mt-3">
          <button className="px-3 py-1 text-sm border rounded" onClick={syncSF}>Create in Salesforce</button>
        </div>
      </div>
    </div>
  )
}
