// frontend/src/pages/Home.jsx
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import api from "../api/client"
import { useAuth } from "../store/auth"
import Table from "../components/Table"
import { fmt } from "../utils/formatDate"

export default function Home() {
  const [rows, setRows] = useState([])
  const [recent, setRecent] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [a, b] = await Promise.all([
          api.get('/inventories', { params: { take: 10 } }),          // <- NO /api prefix
          api.get('/inventories/public-recent'),                      // <- NO /api prefix
        ])
        if (!active) return
        setRows(Array.isArray(a.data) ? a.data : (a.data?.data || a.data || []))
        setRecent(b.data || [])
      } catch {
        if (active) { setRows([]); setRecent([]) }
      }
    })()
    return () => (active = false)
  }, [])

  const createClicked = () => {
    if (!user) { navigate("/login"); return }
    navigate("/inventories")
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Recent cards */}
      <div className="my-4">
        <h2 className="mb-2 text-lg font-semibold">Recent Public Inventories</h2>
        {recent.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 border rounded">No recent inventories</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map(r => (
              <div key={r.id} className="card" onClick={()=>navigate(`/inventories/${r.id}`)}>
                <h3>{r.title}</h3>
                <div className="meta">{r.categoryName} • {r.itemsCount} items • {fmt(r.updatedAt)}</div>
                <div className="mt-2 tags">{r.tags?.map(t => <span key={t}>#{t}</span>)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Inventories</h2>
        <button
          onClick={createClicked}
          className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-900"
        >
          Create inventory
        </button>
      </div>

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
