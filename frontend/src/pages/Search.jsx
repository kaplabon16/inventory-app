import { useSearchParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/client'
import Table from '../components/Table'
import { useTranslation } from 'react-i18next'

export default function Search() {
  const { t } = useTranslation()
  const [sp] = useSearchParams()
  const q = sp.get('q') || ''
  const [rows, setRows] = useState([])

  useEffect(()=>{
    (async()=>{
      const { data } = await api.get('/api/search', { params: { q } })
      setRows(data.items || [])
    })()
  },[q])

  const cols = [
    { key: 'customId', title: 'ID', render:(v,r)=><Link to={`/inventories/${r.inventoryId}/item/${r.id}`} className="text-blue-600">{v}</Link> },
    { key: 'invTitle', title: 'Inventory' },
    { key: 't1', title: 'T1' }, { key: 't2', title: 'T2' }, { key: 't3', title: 'T3' }
  ]

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <div className="mb-2 text-sm text-gray-500">{t('search')}: <b>{q}</b></div>
      <Table columns={cols} rows={rows}/>
    </div>
  )
}
