// src/pages/Home.jsx
import { useNavigate, Link } from "react-router-dom"
import { useEffect, useState } from "react"
import api, { apiUrl } from "../api/client"
import { useAuth } from "../store/auth"
import Table from "../components/Table"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
dayjs.extend(relativeTime)

export default function Home() {
  const [rows, setRows] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        // backend now supports ?take, returns updatedAt as well
        const res = await api.get(apiUrl("/inventories"), { params: { take: 12 } })
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data || [])
        if (active) setRows(data)
      } catch {
        if (active) setRows([])
      }
    })()
    return () => (active = false)
  }, [])

  const create = async () => {
    if (!user) { navigate("/login?redirect=/inventories"); return }
    try {
      const { data } = await api.post(apiUrl("/inventories"), { title: "New Inventory", description: "", categoryId: 1 })
      const id = data?.id || data?.inventory?.id
      if (id) navigate(`/inventories/${id}`)
    } catch {
      // simple fallback: go to the list page which still has the create action
      navigate("/inventories")
    }
  }

  const Card = ({ inv }) => (
    <div
      className="p-4 transition bg-white border rounded-lg dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <Link to={`/inventories/${inv.id}`} className="block">
        <div className="text-lg font-medium">{inv.title}</div>
        <div className="mt-1 text-xs text-gray-500">
          <span className="inline-block px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 mr-2">{inv.categoryName}</span>
          {inv.itemsCount} items • {dayjs(inv.updatedAt || Date.now()).fromNow()}
        </div>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          <span className="opacity-80">Owner:</span> {inv.ownerName ?? "-"}
        </div>
      </Link>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Inventories</h2>
        <button
          onClick={create}
          className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Create inventory
        </button>
      </div>

      {/* Recent Public Inventories – card grid */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold">Recent Public Inventories</h3>
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 border rounded">No inventories yet</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rows.slice(0, 8).map((inv) => <Card key={inv.id} inv={inv} />)}
          </div>
        )}
      </div>

      {/* Table (kept for power users) */}
      <Table
        columns={[
          { key: "title", title: "Title" },
          { key: "categoryName", title: "Category" },
          { key: "ownerName", title: "Owner" },
          { key: "itemsCount", title: "Items" },
        ]}
        rows={rows}
        rowLink={(r) => `/inventories/${r.id}`}
        emptyText="No data"
      />
    </div>
  )
}
