import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import api, { apiUrl } from "../api/client"
import { useAuth } from "../store/auth"
import Table from "../components/Table"

export default function Home() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [latest, setLatest] = useState([])
  const [popular, setPopular] = useState([])
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState("")

  async function load() {
    try {
      const bust = Date.now()                  // no cache
      const [a, b] = await Promise.all([
        api.get(apiUrl("/inventories/public-recent"), { params: { take: 10, t: bust } }),
        api.get(apiUrl("/inventories/popular"), { params: { take: 5, t: bust } }),
      ])
      setLatest(a.data || [])
      setPopular(b.data || [])
    } catch {
      setLatest([]); setPopular([])
    }
  }

  useEffect(() => { load() }, [])

  const createNow = async () => {
    if (!user) { nav("/login?redirect=/inventories"); return }
    setCreating(true); setErr("")
    try {
      const { data } = await api.post(apiUrl("/inventories"), { title: "New Inventory", description: "", categoryId: 1 })
      const id = data?.id || data?.inventory?.id
      if (id) {
        nav(`/inventories/${id}`)
      } else {
        setErr("Created, but no ID returned. Please refresh.")
      }
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to create inventory.")
    } finally {
      setCreating(false)
      load()                                 // refresh list
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest Inventories</h2>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Refresh
          </button>
          <button
            onClick={createNow}
            disabled={creating}
            className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create inventory"}
          </button>
        </div>
      </div>
      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

      <Table
        columns={[
          { key: "title", title: "Title" },
          { key: "categoryName", title: "Category" },
          { key: "ownerName", title: "Owner" },
          { key: "itemsCount", title: "Items" },
        ]}
        rows={latest}
        rowLink={(r) => `/inventories/${r.id}`}
        emptyText="No data"
      />

      <div>
        <h3 className="mb-2 text-lg font-semibold">Top 5 Popular</h3>
        <Table
          columns={[
            { key: "title", title: "Title" },
            { key: "itemsCount", title: "Items" },
            { key: "categoryName", title: "Category" },
          ]}
          rows={popular}
          rowLink={(r) => `/inventories/${r.id}`}
          emptyText="No data"
        />
      </div>
    </div>
  )
}
