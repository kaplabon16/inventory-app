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
      setRows(Array.isArray(data) ? data : (data?.data || data || []))
    } catch (e) {
      setRows([])
      setError('Failed to load inventories.')
    }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!user) { nav('/login?redirect=/inventories'); return }
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
        <h2 className="font-medium">All Inventories</h2>
        <button onClick={create} className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed" disabled={loading}>
          {loading ? 'Creating…' : 'Create inventory'}
        </button>
      </div>

      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

      <div className="table-shell overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th className="text-left">Title</th>
              <th className="text-left">Category</th>
              <th className="text-left">Owner</th>
              <th className="text-left">Items</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="4" className="p-6 text-center text-slate-500 dark:text-slate-400">No data</td></tr>
            ) : (
              rows.reverse().map(r => (
                <tr key={r.id} className="cursor-pointer" onClick={() => nav(`/inventories/${r.id}`)}>
                  <td>{r.title}</td>
                  <td>{r.categoryName ?? r.category?.name ?? '-'}</td>
                  <td>{r.ownerName ?? r.owner?.name ?? '-'}</td>
                  <td>{r.itemsCount ?? r.items?.length ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
