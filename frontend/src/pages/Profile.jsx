
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


  const [owned, setOwned] = useState([])
  const [write, setWrite] = useState([])


  const [sfOpen, setSfOpen] = useState(false)
  const [hasSF, setHasSF] = useState(false)
  const [company, setCompany] = useState(user?.name || "")
  const [phone, setPhone] = useState("")
  const [title, setTitle] = useState("")
  const [msg, setMsg] = useState("")
  const [err, setErr] = useState("")


  useEffect(() => {
    setCompany(user?.name || "")
    const already =
      !!user?.salesforceContactId ||
      !!user?.salesforceAccountId ||
      !!user?.integrations?.salesforce?.contactId ||
      !!user?.crm?.salesforce?.contactId
    setHasSF(already)
  }, [user])


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

  }, [])

  const cols = [
    { key: "title", title: t("title"), render: (v, r) => <Link to={`/inventories/${r.id}`} className="text-blue-600">{v}</Link> },
    { key: "itemsCount", title: t("items") },
  ]

  const actionButton = "inline-flex items-center justify-center h-10 px-4 text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:ring-indigo-400 dark:bg-indigo-400 dark:text-black dark:hover:bg-indigo-300"
  const outlineButton = "inline-flex items-center justify-center h-10 px-4 text-sm font-semibold rounded-lg shadow-sm border border-indigo-500 text-indigo-600 transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-300 dark:border-indigo-400 dark:text-indigo-200 dark:hover:bg-indigo-500/10"

  const syncSF = async () => {
    setMsg(""); setErr("")
    try {
      const { data } = await api.post(apiUrl("/integrations/salesforce/sync-self"), { company, phone, title })
      if (data?.ok) {
        setMsg(`Successfully connected to Salesforce. Account: ${data.accountId}, Contact: ${data.contactId}`)
        setHasSF(true)
      } else {
        setErr("Unexpected response")
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || "Failed to sync")
    }
  }

  if (!user) return <div className="p-6">Please log in.</div>

  return (
    <div className="max-w-6xl p-4 mx-auto space-y-6">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 text-xl font-semibold">{user?.name}</h1>
          <div className="text-sm text-gray-600 dark:text-gray-300">{user?.email}</div>
        </div>
        <div className="flex items-center gap-2">
          {!hasSF ? (
            <button
              className={actionButton}
              onClick={() => { setErr(""); setMsg(""); setSfOpen(true) }}
            >
              Connect Salesforce
            </button>
          ) : (
            <span className="inline-flex items-center justify-center h-10 px-4 text-sm font-semibold rounded-lg border border-emerald-500 text-emerald-500 dark:border-emerald-400 dark:text-emerald-300">
              Salesforce connected
            </span>
          )}
        </div>
      </div>


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

      {/* Modal */}
      {sfOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setSfOpen(false)} />
          <div className="relative z-10 w-full max-w-lg p-6 bg-white rounded-xl shadow-2xl border border-indigo-100 dark:bg-[#0c0c0c] dark:border-[#1f1f1f] dark-surface">
            <div className="flex items-center justify-between mb-2">
              <button
                className={`${outlineButton} w-10 px-0`}
                onClick={() => setSfOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="text-lg font-semibold">Salesforce CRM</div>
            </div>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
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

            <div className="flex justify-end gap-2 mt-3">
              <button className={outlineButton} onClick={() => setSfOpen(false)}>
                Close
              </button>
              <button
                className={`${actionButton} disabled:opacity-60 disabled:cursor-not-allowed`}
                onClick={syncSF}
                disabled={hasSF}
              >
                {hasSF ? "Connected" : "Create in Salesforce"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
