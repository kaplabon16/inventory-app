import { useState } from "react"
import api, { apiUrl } from "../api/client"
import { useLocation } from "react-router-dom"

export default function SupportTicketModal({ open, onClose, inventoryId }) {
  const [summary, setSummary] = useState("")
  const [priority, setPriority] = useState("Average")
  const [err, setErr] = useState("")
  const [ok, setOk] = useState("")
  const loc = useLocation()

  if (!open) return null

  const submit = async () => {
    setErr(""); setOk("")
    try {
      const { data } = await api.post(apiUrl("/support/ticket"), {
        summary, priority, inventoryId: inventoryId || "", link: window.location.origin + loc.pathname + loc.search
      })
      if (data?.ok) {
        setOk("Ticket uploaded. Admins will be notified by the flow.")
        setSummary("")
      } else setErr("Unexpected response.")
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || "Failed to upload")
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-lg p-4 bg-white rounded shadow dark:bg-[#0c0c0c] dark:border dark:border-[#1f1f1f] dark-surface">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Create support ticket</div>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>

        {err && <div className="mb-2 text-sm text-red-600">{err}</div>}
        {ok && <div className="mb-2 text-sm text-green-600">{ok}</div>}

        <label className="grid gap-1 mb-2">
          <span className="text-sm">Summary</span>
          <textarea rows={3} className="px-2 py-1 border rounded" value={summary} onChange={e=>setSummary(e.target.value)} />
        </label>

        <label className="grid gap-1 mb-4">
          <span className="text-sm">Priority</span>
          <select className="px-2 py-1 border rounded" value={priority} onChange={e=>setPriority(e.target.value)}>
            <option>High</option>
            <option>Average</option>
            <option>Low</option>
          </select>
        </label>

        <div className="flex justify-end gap-2 ">
          <button className="btn btn-primary" onClick={submit}>Submit</button>
        </div>
      </div>
    </div>
  )
}
