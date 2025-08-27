import { useEffect, useState } from 'react'
import api from '../api/client'
import Table from '../components/Table'
import Toolbar from '../components/Toolbar'
import { useTranslation } from 'react-i18next'

export default function Admin() {
  const { t } = useTranslation()
  const [rows, setRows] = useState([])
  const [sel, setSel] = useState([])

  const load = async () => {
    const { data } = await api.get('/api/users')
    setRows(data)
  }
  useEffect(()=>{ load() },[])

  const act = (path) => async () => {
    if (sel.length===0) return
    await api.post(`/api/users/${path}`, { ids: sel })
    setSel([]); await load()
  }

  const cols = [
    { key: 'name', title: 'Name' },
    { key: 'email', title: 'Email' },
    { key: 'roles', title: 'Roles', render:v => v?.join(', ') },
    { key: 'blocked', title: t('blocked'), render:v=> v ? 'Yes' : 'No' }
  ]

  return (
    <div className="max-w-6xl mx-auto p-4">
      <Toolbar
        left={<div className="text-sm text-gray-500">{t('users')}</div>}
        right={
          <>
            <button onClick={act('make-admin')} className="px-2 py-1 border rounded text-sm">{t('makeAdmin')}</button>
            <button onClick={act('remove-admin')} className="px-2 py-1 border rounded text-sm">{t('removeAdmin')}</button>
            <button onClick={act('block')} className="px-2 py-1 border rounded text-sm">{t('block')}</button>
            <button onClick={act('unblock')} className="px-2 py-1 border rounded text-sm">{t('unblock')}</button>
          </>
        }
      />
      <Table columns={cols} rows={rows} onSelect={setSel}/>
    </div>
  )
}
