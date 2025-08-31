// frontend/src/pages/InventoryPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import MarkdownBox from '../components/MarkdownBox'
import Toolbar from '../components/Toolbar'
import Table from '../components/Table'
import { useTranslation } from 'react-i18next'
import { renderIdPreview } from '../utils/idPreview'
import { useAuth } from '../store/auth'
import MultiImagePicker from '../components/MultiImagePicker'
import FieldsDesigner, { flattenFields, packFields } from '../components/FieldsDesigner'

const groupLabels = {
  text: 'Text',
  mtext: 'Multiple Text',
  num: 'Numbers',
  link: 'External Links',
  bool: 'Checkboxes (Boolean)',
  image: 'Images'
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
  const [canWrite, setCanWrite] = useState(false)
  const [tab, setTab] = useState('items')
  const [fields,setFields] = useState({ text:[], mtext:[], num:[], link:[], bool:[], image:[] })
  const [order,setOrder] = useState([])  // [{group,slot}] drives Add Item order
  const [elements,setElements] = useState(defaultElements)
  const [items,setItems] = useState([])
  const [sel,setSel] = useState([])
  const [version,setVersion] = useState(1)
  const [categories, setCategories] = useState([])
  const [flash, setFlash] = useState('')
  const [stats, setStats] = useState(null)
  const [loadErr, setLoadErr] = useState('')

  const toast = (msg) => { setFlash(msg); setTimeout(()=>setFlash(''), 2000) }

  const load = async () => {
    setLoadErr('')
    try {
      const { data } = await api.get(`/api/inventories/${id}`)
      const inv0 = data?.inventory || { id, title: 'Untitled', description: '', publicWrite: false, categoryId: 1 }
      setInv({
        ...inv0,
        image1: inv0.image1 || '',
        image2: inv0.image2 || '',
        image3: inv0.image3 || ''
      })
      setCanEdit(!!data?.canEdit)
      setCanWrite(!!data?.canWrite)

      const grouped = data?.fields || { text:[], mtext:[], num:[], link:[], bool:[], image:[] }
      setFields(grouped)
      const ord = Array.isArray(data?.fieldsFlat) && data.fieldsFlat.length
        ? data.fieldsFlat.map(x=>({ group: (String(x.group).toLowerCase()==='number'?'num':String(x.group).toLowerCase()), slot: x.slot }))
        : flattenFields(grouped).map(({group,slot})=>({group,slot}))
      setOrder(ord)

      setElements(data?.elements || defaultElements)
      setVersion(data?.inventory?.version || 1)
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      setLoadErr('Failed to load inventory.')
      setInv(null)
      setItems([])
    }

    try {
      const cats = await api.get('/api/categories')
      setCategories(Array.isArray(cats.data) ? cats.data : [])
    } catch { setCategories([]) }
  }
  useEffect(()=>{ load() },[id])

  const loadStats = async () => {
    try {
      const { data } = await api.get(`/api/inventories/${id}/stats`)
      setStats(data)
    } catch { setStats(null) }
  }
  useEffect(()=>{ if (tab==='stats') loadStats() },[tab])

  const idPreview = useMemo(()=>renderIdPreview(elements || []),[elements])

  if (loadErr) return <div className="p-6 text-red-600">{loadErr}</div>
  if (!inv) return <div className="p-6">Loading…</div>

  const itemCols = [
    { key: 'customId', title: 'ID', render:(v,r)=><Link to={user ? `/inventories/${id}/item/${r.id}` : '#'} className="text-blue-600">{v}</Link> },
    ...((fields?.text || []).map((f,idx)=> f?.show ? [{key:`text${idx+1}`, title:f.title?.trim() || `Text ${idx+1}`}] : []).flat()),
    ...((fields?.num  || []).map((f,idx)=> f?.show ? [{key:`num${idx+1}`,  title:f.title?.trim() || `Number ${idx+1}`}] : []).flat()),
    ...((fields?.bool || []).map((f,idx)=> f?.show ? [{key:`bool${idx+1}`, title:f.title?.trim() || `Flag ${idx+1}`, render:(val)=> val ? '✓' : ''}] : []).flat())
  ]

  const saveSettings = async () => {
    try {
      const { data } = await api.put(`/api/inventories/${id}`, {
        ...inv,
        version,
        categoryId: inv.categoryId
      })
      setVersion(data.version)
      setInv(prev => ({ ...prev, ...data }))
      toast('Saved settings')
    } catch (e) {
      if (e?.response?.status === 409) toast('Version conflict — reload and try again')
      else toast('Save failed')
    }
  }

  const addItem = async () => {
    if (!user) { nav('/login?redirect=' + encodeURIComponent(`/inventories/${id}`)); return }
    if (!canWrite) { toast('You do not have write access.'); return }
    try {
      const { data } = await api.post(`/api/inventories/${id}/items`, {})
      if (data?.id) window.location.href = `/inventories/${id}/item/${data.id}`
      else { toast('Created, but no item id returned.'); await load() }
    } catch { toast('Failed to add item') }
  }

  const removeSelected = async () => {
    if (!canWrite) { toast('You do not have write access.'); return }
    const ids = Array.isArray(sel) ? sel : []
    if (!ids.length) return
    try {
      await Promise.all(ids.map(itemId => api.delete(`/api/inventories/${id}/items/${itemId}`)))
      setSel([])
      await load()
      toast('Deleted selected items')
    } catch { toast('Delete failed for one or more items') }
  }

  const numLabels = [
    fields.num?.[0]?.title || 'Number 1',
    fields.num?.[1]?.title || 'Number 2',
    fields.num?.[2]?.title || 'Number 3'
  ]

  const onImagesChange = (arr) => {
    const [image1='', image2='', image3=''] = (arr || [])
    setInv(prev => ({ ...prev, image1, image2, image3 }))
  }

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <div className="flex flex-wrap items-center gap-3">
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

      <div className="mt-2 text-sm">
        <label className="flex items-center gap-2">
          <span>Public write access</span>
          <input type="checkbox" disabled={!canEdit} checked={!!inv.publicWrite}
            onChange={e=>setInv({...inv, publicWrite: e.target.checked})}/>
        </label>
      </div>

      {/* Multi images for inventory */}
      <div className="mt-3">
        <MultiImagePicker
          label="Inventory images"
          value={[inv.image1, inv.image2, inv.image3].filter(Boolean)}  {/* NOTE: prop is `value` */}
          onChange={onImagesChange}
          inventoryId={id}
          canWrite={canWrite || canEdit}
          max={3}
        />
      </div>

      <div className="mt-3">
        <nav className="flex flex-wrap gap-2">
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
              {(canWrite) && <button onClick={addItem} className="px-2 py-1 text-sm border rounded">Add item</button>}
              {(canWrite) && <button onClick={removeSelected} className="px-2 py-1 text-sm border rounded">Delete</button>}
            </>}
          />
          <Table
            columns={itemCols}
            rows={items}
            onSelect={canWrite ? setSel : undefined}
            emptyText="No items"
          />
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
          <div><b>Preview:</b> <code className="px-2 py-1 bg-gray-100 rounded dark:bg-gray-800">{renderIdPreview(elements || [])}</code></div>
          <div className="text-sm text-gray-500">ID Elements</div>
          {[...(elements || [])].sort((a,b)=>a.order-b.order).map((el,idx)=>(
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
              </select>
              <input disabled={!canEdit} value={el.param||''} onChange={e=>{
                const next=[...elements]; next[idx]={...el,param:e.target.value}; setElements(next)
              }} className="px-2 py-1 border rounded" placeholder="Format/value"/>
              <input disabled={!canEdit} type="number" value={el.order} onChange={e=>{
                const next=[...elements]; next[idx]={...el,order:parseInt(e.target.value||'1',10)}; setElements(next)
              }} className="w-24 px-2 py-1 border rounded"/>
              {canEdit && (
                <button onClick={()=>{
                  const next=[...elements]; next.splice(idx,1); setElements(next)
                }} className="px-2 py-1 text-sm border rounded">Delete</button>
              )}
            </div>
          ))}
          {canEdit && (
            <div>
              <button onClick={()=>setElements([...(elements||[]),{order:(elements?.length||0)+1,type:'FIXED',param:'-'}])}
                className="px-3 py-1 text-sm border rounded">Add element</button>
              <button onClick={async()=>{
                await api.post(`/api/inventories/${id}/custom-id`, { elements })
                await load(); toast('Saved ID pattern')
              }} className="px-3 py-1 ml-2 text-sm border rounded">Save</button>
            </div>
          )}
        </div>
      )}

      {tab==='fields' && (
        <div className="grid gap-4 mt-4">
          <FieldsDesigner
            value={fields}
            onChange={(grouped, ord) => { setFields(grouped); setOrder(ord) }}
          />
          {canEdit && (
            <div>
              <button className="px-3 py-1 text-sm border rounded"
                onClick={async ()=>{
                  await api.post(`/api/inventories/${id}/fields`, { fields, order })
                  await load()
                  toast('Saved field config')
                }}>
                Save
              </button>
            </div>
          )}
          <div className="text-xs text-gray-500">
            Tip: “Show in Add Item” controls visibility; order here controls the exact order shown there.
          </div>
        </div>
      )}

      {tab==='access' && (<AccessTab id={id} canEdit={canEdit}/>)}
      {tab==='discussion' && <DiscussionTab id={id}/>}

      {tab==='stats' && (
        <div className="grid gap-3 mt-3">
          {!stats ? <div className="p-4">Loading…</div> : (
            <>
              <div className="p-3 border rounded"><b>Items total:</b> {stats.count}</div>

              {[0,1,2].map(i=>(
                <div key={i} className="p-3 border rounded">
                  <div className="mb-1 font-medium">{numLabels[i]}</div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div><b>min:</b> {stats[`num${i+1}`].min ?? '-'}</div>
                    <div><b>max:</b> {stats[`num${i+1}`].max ?? '-'}</div>
                    <div><b>avg:</b> {stats[`num${i+1}`].avg ?? '-'}</div>
                    <div><b>median:</b> {stats[`num${i+1}`].median ?? '-'}</div>
                  </div>
                </div>
              ))}

              <div className="p-3 border rounded">
                <div className="mb-1 font-medium">Most frequent text values</div>
                {(stats.topText || []).length === 0
                  ? <div className="text-sm text-gray-500">No text values yet</div>
                  : <ul className="ml-6 list-disc">{stats.topText.map((r,i)=><li key={i}>{r.v} — {r.c}</li>)}</ul>}
              </div>

              <div className="p-3 border rounded">
                <div className="mb-1 font-medium">Created timeline (per month)</div>
                {(stats.timeline || []).length === 0
                  ? <div className="text-sm text-gray-500">No items yet</div>
                  : <ul className="ml-6 list-disc">{stats.timeline.map((r,i)=><li key={i}>{r.month}: {r.count}</li>)}</ul>}
              </div>

              <div className="p-3 border rounded">
                <div className="mb-1 font-medium">Top contributors</div>
                {(stats.contributors || []).length === 0
                  ? <div className="text-sm text-gray-500">No contributions yet</div>
                  : <ul className="ml-6 list-disc">{stats.contributors.map((r,i)=><li key={i}>{r.name || r.email} — {r.count}</li>)}</ul>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function AccessTab({ id, canEdit }) {
  const [users,setUsers] = useState([])
  const [list,setList] = useState([])
  const [q,setQ] = useState('')
  const [sort,setSort] = useState('name')

  const load = async () => {
    try {
      const { data } = await api.get(`/api/inventories/${id}/access`)
      setList(Array.isArray(data) ? data : [])
    } catch { setList([]) }
  }
  useEffect(()=>{ load() },[id])

  const findUsers = async (text) => {
    try {
      const { data } = await api.get('/api/users/search', { params: { q: text } })
      setUsers(Array.isArray(data) ? data : [])
    } catch { setUsers([]) }
  }
  useEffect(()=>{ if(q) findUsers(q) },[q])

  return (
    <div className="grid gap-3 mt-3">
      {canEdit && (
        <>
          <div className="flex gap-2">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Type email or name"
              className="flex-1 px-2 py-1 border rounded"/>
          </div>
          {q && (
            <div className="p-2 border rounded">
              {users.map(u=>(
                <div key={u.id} className="flex items-center justify-between py-1">
                  <div>{u.name} &lt;{u.email}&gt;</div>
                  <button className="px-2 py-1 text-sm border rounded"
                    onClick={async()=>{
                      await api.post(`/api/inventories/${id}/access`,{ userId: u.id, canWrite:true })
                      setQ(''); await load()
                    }}>Add</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm">Sort:</span>
        <select className="px-2 py-1 border rounded" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="name">name</option>
          <option value="email">email</option>
        </select>
      </div>
      <div className="border rounded">
        {[...list].sort((a,b)=>String(a[sort]).localeCompare(String(b[sort]))).map(x=>(
          <div key={x.userId} className="flex items-center justify-between px-3 py-2 border-b">
            <div>{x.name} &lt;{x.email}&gt;</div>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled={!canEdit} checked={!!x.canWrite} onChange={async(e)=>{
                  await api.put(`/api/inventories/${id}/access/${x.userId}`, { canWrite: e.target.checked })
                  await load()
                }}/> write
              </label>
              {canEdit && (
                <button className="px-2 py-1 text-sm border rounded"
                  onClick={async()=>{ await api.delete(`/api/inventories/${id}/access/${x.userId}`); await load() }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {list.length===0 && <div className="p-4 text-center text-gray-500">No users</div>}
      </div>
    </div>
  )
}

function DiscussionTab({ id }) {
  const [list,setList] = useState([])
  const [txt,setTxt] = useState('')

  const load = async () => {
    try {
      const { data } = await api.get(`/api/inventories/${id}/comments`)
      setList(Array.isArray(data) ? data : [])
    } catch { setList([]) }
  }
  useEffect(()=>{ load() },[id])

  const post = async () => {
    const body = (txt || '').trim()
    if (!body) return
    await api.post(`/api/inventories/${id}/comments`, { body })
    setTxt(''); await load()
  }

  return (
    <div className="grid gap-3 mt-3">
      <div className="p-2 border rounded">
        {list.map(c=>(
          <div key={c.id} className="py-2 border-b">
            <div className="text-sm text-gray-500">{c.userName}</div>
            <div>{c.body}</div>
          </div>
        ))}
        {list.length===0 && <div className="p-4 text-center text-gray-500">No comments</div>}
      </div>
      <div className="flex gap-2">
        <input value={txt} onChange={e=>setTxt(e.target.value)} className="flex-1 px-2 py-1 border rounded" placeholder="Write a comment…"/>
        <button onClick={post} className="px-3 py-1 text-sm border rounded">Post</button>
      </div>
    </div>
  )
}
