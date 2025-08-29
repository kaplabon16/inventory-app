import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import MarkdownBox from '../components/MarkdownBox'
import Toolbar from '../components/Toolbar'
import Table from '../components/Table'
import { useTranslation } from 'react-i18next'
import { renderIdPreview } from '../utils/idPreview'
import { useAuth } from '../store/auth'

const emptyFields = {
  text: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  mtext:[{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  num:  [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  link: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  bool: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
}

const defaultElements = [
  { order:1, type:'FIXED', param:'INV-' },
  { order:2, type:'RAND32', param:'' },
  { order:3, type:'SEQ', param:'001' }
]

export default function InventoryPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [inv, setInv] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [tab, setTab] = useState('items')
  const [fields,setFields] = useState(emptyFields)
  const [elements,setElements] = useState(defaultElements)
  const [items,setItems] = useState([])
  const [sel,setSel] = useState([])
  const [version,setVersion] = useState(1)
  const [categories, setCategories] = useState([])
  const [flash, setFlash] = useState('')
  const [stats, setStats] = useState(null)

  const toast = (msg) => { setFlash(msg); setTimeout(()=>setFlash(''), 2000) }

  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}`)
    setInv(data.inventory)
    setCanEdit(!!data.canEdit)
    setFields(data.fields)
    setElements(data.elements)
    setVersion(data.inventory.version)
    setItems(data.items)
    const cats = await api.get('/api/categories')
    setCategories(cats.data || [])
  }
  useEffect(()=>{ load() },[id])

  const loadStats = async () => {
    const { data } = await api.get(`/api/inventories/${id}/stats`)
    setStats(data)
  }
  useEffect(()=>{ if (tab==='stats') loadStats() },[tab])

  const idPreview = useMemo(()=>renderIdPreview(elements),[elements])

  if (!inv) return <div className="p-6">Loading…</div>

  const itemCols = [
    { key: 'customId', title: 'ID', render:(v,r)=><Link to={user ? `/inventories/${id}/item/${r.id}` : '#'} className="text-blue-600">{v}</Link> },
    ...(fields.text.map((f,idx)=> f.show ? [{key:`text${idx+1}`, title:f.title}] : []).flat()),
    ...(fields.num.map((f,idx)=> f.show ? [{key:`num${idx+1}`, title:f.title}] : []).flat()),
    ...(fields.bool.map((f,idx)=> f.show ? [{key:`bool${idx+1}`, title:f.title, render:(val)=> val ? '✓' : ''}] : []).flat())
  ]

  const saveSettings = async () => {
    try {
      const { data } = await api.put(`/api/inventories/${id}`, { ...inv, version, categoryId: inv.categoryId })
      setVersion(data.version)
      setInv(data)
      toast('Saved settings')
    } catch (e) {
      if (e?.response?.status === 409) toast('Version conflict — reload and try again')
      else toast('Save failed')
    }
  }

  const addItem = async () => {
    if (!user) { nav('/login'); return }
    const { data } = await api.post(`/api/inventories/${id}/items`, {})
    window.location.href = `/inventories/${id}/item/${data.id}`
  }

  const removeSelected = async () => {
    const ids = Array.isArray(sel) && sel[0] && Array.isArray(sel[0]) ? sel[0] : sel
    if (!ids.length) return
    await api.post(`/api/inventories/${id}/items/bulk-delete`, { ids })
    setSel([]); await load()
    toast('Deleted selected items')
  }

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <div className="flex items-center gap-3">
        {canEdit ? (
          <input className="px-2 py-1 text-xl font-semibold border rounded"
            value={inv.title} onChange={e=>setInv({...inv,title:e.target.value})}/>
        ) : (
          <div className="text-xl font-semibold">{inv.title}</div>
        )}
        {flash && <span className="ml-2 text-sm text-green-600">{flash}</span>}
        <span className="ml-auto text-sm text-gray-500">
          Category:&nbsp;
          {canEdit ? (
            <select
              className="px-2 py-1 border rounded"
              value={inv.categoryId}
              onChange={(e)=>setInv({...inv, categoryId: Number(e.target.value)})}
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (categories.find(c=>c.id===inv.categoryId)?.name || '-')}
        </span>
        {canEdit && (
          <button onClick={saveSettings} className="px-3 py-1 text-sm border rounded">Save</button>
        )}
      </div>

      <div className="mt-3">
        <nav className="flex gap-2">
          {['items','discussion','settings','customId','access','fields','stats'].map(k=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`px-3 py-1 border rounded text-sm ${tab===k?'bg-gray-100 dark:bg-gray-800':''}`}>
              {k}
            </button>
          ))}
        </nav>
      </div>

      {tab==='items' && (
        <>
          <Toolbar
            left={<div className="text-sm text-gray-500">Inventory items</div>}
            right={<>
              {canEdit && <button onClick={addItem} className="px-2 py-1 text-sm border rounded">Add item</button>}
              {canEdit && <button onClick={removeSelected} className="px-2 py-1 text-sm border rounded">Delete</button>}
            </>}
          />
          <Table columns={itemCols} rows={items} onSelect={canEdit ? setSel : undefined}/>
        </>
      )}

      {tab==='settings' && (
        <div className="grid gap-3 mt-3">
          <label className="grid gap-1">
            <span>Description</span>
            {canEdit ? (
              <MarkdownBox value={inv.description || ''} onChange={(v)=>setInv({...inv,description:v})}/>
            ) : (
              <div className="p-3 prose border rounded dark:prose-invert">{inv.description || <i>(no description)</i>}</div>
            )}
          </label>

          <label className="flex items-center gap-2">
            <span>Public write access</span>
            <input type="checkbox" disabled={!canEdit} checked={inv.publicWrite}
              onChange={e=>setInv({...inv, publicWrite: e.target.checked})}/>
          </label>

          {canEdit && (
            <div className="flex gap-2 pt-2">
              <button onClick={saveSettings} className="px-3 py-1 text-sm border rounded">Save</button>
              <button
                onClick={async()=>{
                  if (!confirm('Delete this inventory? This cannot be undone.')) return
                  await api.delete(`/api/inventories/${id}`)
                  nav('/profile')
                }}
                className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded"
              >Delete inventory</button>
            </div>
          )}
        </div>
      )}

      {tab==='customId' && (
        <div className="grid gap-3 mt-3">
          <div><b>Preview:</b> <code className="px-2 py-1 bg-gray-100 rounded dark:bg-gray-800">{idPreview}</code></div>
          <div className="text-sm text-gray-500">ID Elements</div>
          {elements.sort((a,b)=>a.order-b.order).map((el,idx)=>(
            <div key={idx} className="grid items-center gap-2 md:grid-cols-4">
              <select disabled={!canEdit} value={el.type} onChange={e=>{
                const next=[...elements]; next[idx]={...el,type:e.target.value}; setElements(next)
              }} className="px-2 py-1 border rounded">
                <option value="FIXED">Fixed</option>
                <option value="RAND20">20-bit random</option>
                <option value="RAND32">32-bit random</option>
                <option value="RAND6">6-digit random</option>
                <option value="RAND9">9-digit random</option>
                <option value="GUID">GUID</option>
                <option value="DATE">Date/time</option>
                <option value="SEQ">Sequence</option>
