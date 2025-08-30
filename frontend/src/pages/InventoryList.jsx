import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { apiUrl } from '../api/client'
import { useAuth } from '../store/auth'

export default function InventoryList() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()
  const { user } = useAuth()

  const load = async () => {
    setError('')
    try {
      const { data } = await api.get(apiUrl('/inventories'))
      setRows(Array.isArray(data) ? data : (data?.data || []))
    } catch (e) {
      setRows([])
      setError('Failed to load inventories.')
    }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!user) { nav('/login'); return }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(apiUrl('/inventories'), { title: 'New Inventory', description: '', categoryId: 1 })
      const id = data?.id || data?.inventory?.id
      if (id) nav(`/inventories/${id}`)
      else {
        setLoading(false)
        setError('Created, but no ID returned. Please refresh.')
      }
    } catch (e) {
      setLoading(false)
      setError(e?.response?.data?.error || 'Failed to create inventory.')
    }
  }

  return (
    <div className="max-w-6xl p-6 mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">Inventories</h2>
        <button onClick={create} className="px-3 py-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-800" disabled={loading}>
          {loading ? 'Creating…' : 'Create inventory'}
        </button>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto">
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
              <tr><td colSpan="4" className="p-6 text-center text-gray-500">No data</td></tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className="border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" onClick={() => nav(`/inventories/${r.id}`)}>
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

