import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import api from "../api/client"
import { useAuth } from "../store/auth"
import Table from "../components/Table"

export default function Home() {
  const [rows, setRows] = useState([])
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await api.get('/api/inventories', { params: { take: 10 } })
        if (active) setRows(Array.isArray(res.data) ? res.data : (res.data?.data || []))
      } catch {
        if (active) setRows([])
      }
    })()
    return () => (active = false)
  }, [])

  const createClicked = () => {
    if (!user) {
      navigate("/login")
      return
    }
    navigate("/inventories")
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Inventories</h2>
        <button
          onClick={createClicked}
          className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Create inventory
        </button>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Owner</th>
              <th className="p-2 text-left">Items</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-gray-500">No data</td>
              </tr>
            ) : (
              rows.map(r => (
                <tr
                  key={r.id}
                  className="border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                  onClick={() => navigate(`/inventories/${r.id}`)}
                >
                  <td className="p-2">{r.title}</td>
                  <td className="p-2">{r.categoryName ?? r.category?.name ?? '-'}</td>
                  <td className="p-2">{r.ownerName ?? r.owner?.name ?? '-'}</td>
                  <td className="p-2">{r.itemsCount ?? r.items?.length ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
