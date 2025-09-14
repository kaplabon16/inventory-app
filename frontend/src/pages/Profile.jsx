// src/pages/Profile.jsx
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api, { apiUrl } from "../api/client"
import Table from "../components/Table"
import Toolbar from "../components/Toolbar"
import { useAuth } from "../store/auth"
import { useTranslation } from "react-i18next"

export default function Profile() {
  const { user, loadMe } = useAuth()
  const { t } = useTranslation()

  // Inventories
  const [owned, setOwned] = useState([])
  const [write, setWrite] = useState([])

  // Salesforce form + status
  const [company, setCompany] = useState(user?.name || "")
  const [phone, setPhone] = useState("")
  const [title, setTitle] = useState("")
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")

  // Keep company prefilled from user when user changes
  useEffect(() => {
    setCompany(user?.name || "")
  }, [user])

  // Load profile/inventories
  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        api.get(apiUrl("/inventories"), { params: { mine: 1 } }),
        api.get(apiUrl("/inventories"), { params: { canWrite: 1 } }),
      ])
      setOwned(Array.isArray(a.data) ? a.data : [])
      setWrite(Array.isArray(b.data) ? b.data : [])
    } catch {
      setOwned([])
      setWrite([])
    }
  }

  useEffect(() => {
    loadMe()
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cols = [
    { key: "title", title: t("title"), render: (v, r) => <Link to={`/inventories/${r.id}`} className="text-blue-600">{v}</Link> },
    { key: "itemsCount", title: t("items") },
  ]

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
    <div className="max-w-6xl p-4 mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-1 text-xl font-semibold">{user?.name}</h1>
        <div className="text-sm text-gray-600 dark:text-gray-300">{user?.email}</div>
      </div>

      {/* Inventories */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Toolbar left={<div className="text-sm text-gray-500">{t("inventories")} (owner)</div>} />
          <Table columns={cols} rows={owned} rowLink={(r) => `/inventories/${r.id}`} />
        </div>
        <div>
          <Toolbar left={<div className="text-sm text-gray-500">{t("inventories")} ({t("writeAccess")})</div>} />
          <Table columns={cols} rows={write} rowLink={(r) => `/inventories/${r.id}`} />
        </div>
      </div>

      {/* Salesforce card */}
      <div className="max-w-2xl p-4 mt-2 border rounded">
        <div className="mb-2 text-lg font-semibold">Salesforce CRM</div>
        <p className="mb-3 text-sm text-gray-600">
          Create an Account + linked Contact in your Salesforce Dev org.
        </p>

        {msg && <div className="mb-2 text-sm text-green-600">{msg}</div>}
        {err && <div className="mb-2 text-sm text-red-600">{err}</div>}

        <div className="grid gap-2">
          <label className="grid gap-1">
            <span className="text-sm">Company (Account Name)</span>
            <input
              className="px-2 py-1 border rounded"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Phone</span>
            <input
              className="px-2 py-1 border rounded"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Title (for Contact)</span>
            <input
              className="px-2 py-1 border rounded"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end mt-3">
          <button className="px-3 py-1 text-sm border rounded" onClick={syncSF}>
            Create in Salesforce
          </button>
        </div>
      </div>
    </div>
  )
}
