import { useAuth } from '../store/auth'
import { useEffect, useState } from 'react'
import api from '../api/client'
import Table from '../components/Table'
import { Link } from 'react-router-dom'
import Toolbar from '../components/Toolbar'
import { useTranslation } from 'react-i18next'

export default function Profile() {
  const { user, loadMe } = useAuth()
  const { t } = useTranslation()
  const [owned, setOwned] = useState([])
  const [write, setWrite] = useState([])

  const load = async () => {
    const [a, b] = await Promise.all([
      api.get('/api/inventories?mine=1'),
      api.get('/api/inventories?canWrite=1')
    ])
    setOwned(a.data || [])
    setWrite(b.data || [])
  }

  useEffect(() => { loadMe(); load() }, [])

  const cols = [
    { key: 'title', title: t('title'), render: (v, r) => <Link to={`/inventories/${r.id}`} className="text-blue-600">{v}</Link> },
    { key: 'itemsCount', title: t('items') }
  ]

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <h1 className="mb-2 text-xl font-semibold">{user?.name}</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Toolbar left={<div className="text-sm text-gray-500">{t('inventories')} (owner)</div>} />
          <Table columns={cols} rows={owned}/>
        </div>
        <div>
          <Toolbar left={<div className="text-sm text-gray-500">{t('inventories')} ({t('writeAccess')})</div>} />
          <Table columns={cols} rows={write}/>
        </div>
      </div>
    </div>
  )
}
