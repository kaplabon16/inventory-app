import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import api, { apiUrl } from "../api/client"
import { useAuth } from "../store/auth"
import Table from "../components/Table"

export default function Home() {
  const [rows, setRows] = useState([])
  const [cards, setCards] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()

  // load table + recent cards
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [list, recent] = await Promise.all([
          api.get(apiUrl("/inventories"), { params: { take: 10 } }),
          api.get(apiUrl("/inventories/public-recent"))
        ])
        if (!active) return
        setRows(Array.isArray(list.data) ? list.data : (list.data?.data || list.data || []))
        setCards(Array.isArray(recent.data) ? recent.data : [])
      } catch {
        if (active) { setRows([]); setCards([]) }
      }
    })()
    return () => (active = false)
  }, [])

  // one-click create + jump in
  const createClicked = async () => {
    if (!user) { navigate("/login?redirect=/inventories"); return }
    try {
      const { data } = await api.post(apiUrl('/inventories'), { title: 'New Inventory', description: '', categoryId: 1 })
      navigate(`/inventories/${data.id}`)
    } catch {
      navigate('/inventories') // fallback
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Recent cards */}
      {cards.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Recent Public Inventories</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(c=>(
              <div key={c.id}
                   onClick={()=>navigate(`/inventories/${c.id}`)}
                   className="p-4 transition border rounded cursor-pointer hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="mb-1 text-base font-medium">{c.title}</div>
                <div className="mb-2 text-sm text-gray-500">{c.category}</div>
                <div className="text-xs text-gray-500">{c.items} items • {c.owner}</div>
                {c.tags?.length>0 && (
                  <div className="mt-2 space-x-1">
                    {c.tags.slice(0,3).map(t=><span key={t} className="px-2 py-0.5 text-xs border rounded">{t}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Table */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Inventories</h2>
        <button
          onClick={createClicked}
          className="px-3 py-1.5 border rounded hover:bg-gray-100 hover:border-gray-900 dark:hover:bg-gray-800 cursor-pointer"
          title="Create inventory"
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
