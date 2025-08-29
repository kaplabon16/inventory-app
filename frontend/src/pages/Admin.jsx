import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import Table from '../components/Table'
import Toolbar from '../components/Toolbar'
import { useTranslation } from 'react-i18next'

export default function Admin() {
  const { t } = useTranslation()
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState([]) // array of user ids
  const [loadingAction, setLoadingAction] = useState(false)

  const load = async () => {
    const { data } = await api.get('/api/admin/users')
    setRows(data.items || [])
  }
  useEffect(()=>{ load() },[])

  const count = selected.length
  const hasSel = count > 0
  const selLabel = hasSel ? ` (${count} selected)` : ''

  const cols = useMemo(() => ([
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'roles', title: 'Roles', render:v => Array.isArray(v) ? v.join(', ') : '' },
    { key: 'blocked', title: t('blocked'), render:v=> v ? 'Yes' : 'No' }
  ]), [t])

  const batch = (path) => async () => {
    if (!hasSel) return
    setLoadingAction(true)
    try {
      await Promise.all(selected.map(id => api.patch(`/api/admin/users/${id}/${path}`)))
      setSelected([])
      await load()
    } finally {
      setLoadingAction(false)
    }
  }

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <Toolbar
        left={<div className="text-sm text-gray-500">{t('users')}{selLabel}</div>}
        right={
          <>
            <button onClick={batch('make-admin')}  disabled={!hasSel || loadingAction} className="px-2 py-1 text-sm border rounded">{t('makeAdmin')}</button>
            <button onClick={batch('remove-admin')} disabled={!hasSel || loadingAction} className="px-2 py-1 text-sm border rounded">{t('removeAdmin')}</button>
            <button onClick={batch('block')}       disabled={!hasSel || loadingAction} className="px-2 py-1 text-sm border rounded">{t('block')}</button>
            <button onClick={batch('unblock')}     disabled={!hasSel || loadingAction} className="px-2 py-1 text-sm border rounded">{t('unblock')}</button>
          </>
        }
      />
      <Table
        columns={cols}
        rows={rows}
        selected={selected}
        onSelect={setSelected}
      />
    </div>
  )
}
