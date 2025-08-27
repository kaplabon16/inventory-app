import { useEffect, useState } from 'react'
import api from '../api/client'
import { useNavigate } from 'react-router-dom'

export default function InventoryList() {
  const [loading,setLoading] = useState(false)
  const nav = useNavigate()
  const create = async () => {
    setLoading(true)
    const { data } = await api.post('/api/inventories', { title: 'New Inventory', description: '', categoryId: 1 })
    nav(`/inventory/${data.id}`)
  }
  useEffect(()=>{ create() },[])
  return <div className="p-6">{loading? 'Creating…': null}</div>
}
