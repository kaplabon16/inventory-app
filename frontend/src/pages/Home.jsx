import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/client'
import Table from '../components/Table'
import Toolbar from '../components/Toolbar'
import { useTranslation } from 'react-i18next'

export default function Home() {
  const { t } = useTranslation()
  const [rows, setRows] = useState([])
  const [sel, setSel] = useState([])
  const load = async () => {
    const { data } = await api.get('/api/inventories')
    setRows(data)
  }
  useEffect(()=>{ load() },[])
  const columns = [
    { key: 'title', title: t('title'), render:(v,r)=><Link className="text-blue-600" to={`/inventory/${r.id}`}>{v}</Link> },
    { key: 'categoryName', title: t('category') },
    { key: 'ownerName', title: t('owner') },
    { key: 'itemsCount', title: t('items') }
  ]
  return (
    <div className="max-w-6xl mx-auto p-4">
      <Toolbar
        left={<div className="text-sm text-gray-500">{t('inventories')}</div>}
        right={<Link to="/inventory/new" className="px-3 py-1 border rounded text-sm">{t('createInventory')}</Link>}
      />
      <Table columns={columns} rows={rows} onSelect={setSel}/>
    </div>
  )
}
