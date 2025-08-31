import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import MarkdownBox from '../components/MarkdownBox'
import Toolbar from '../components/Toolbar'
import Table from '../components/Table'
import { useTranslation } from 'react-i18next'
import { renderIdPreview } from '../utils/idPreview'
import { useAuth } from '../store/auth'
import MultiImageUpload from '../components/MultiImageUpload'

const TYPES = ['text','mtext','num','link','bool','image']
const typeNames = { text:'Text', mtext:'Multi-line', num:'Number', link:'Link', bool:'Boolean', image:'Image' }

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
  const [fields,setFields] = useState(makeEmpty())
  const [dragList,setDragList] = useState([]) // flat list for DnD
  const [elements,setElements] = useState(defaultElements)
  const [items,setItems] = useState([])
  const [sel,setSel] = useState([])
  const [version,setVersion] = useState(1)
  const [categories, setCategories] = useState([])
  const [flash, setFlash] = useState('')
  const [stats, setStats] = useState(null)
  const [loadErr, setLoadErr] = useState('')

  const [invImages, setInvImages] = useState([]) // multi-image for inventory

  const toast = (msg) => { setFlash(msg); setTimeout(()=>setFlash(''), 2000) }

  const load = async () => {
    setLoadErr('')
    try {
      const { data } = await api.get(`/api/inventories/${id}`)
      const baseInv = data?.inventory || { id, title: 'Untitled', description: '', publicWrite: false, categoryId: 1 }
      setInv(baseInv)
      setInvImages([baseInv.image1, baseInv.image2, baseInv.image3].filter(Boolean))
      setCanEdit(!!data?.canEdit)
      setCanWrite(!!data?.canWrite)
      setFields(data?.fields || makeEmpty())
      setElements(data?.elements || defaultElements)
      setVersion(data?.inventory?.version || 1)
      setItems(Array.isArray(data?.items) ? data.items : [])
      // build flat drag list from fieldsFlat returned order
      const flat = (data.fieldsFlat || []).map(f => ({
        id:`${f.group}-${f.slot}`, group: mapGroup(f.group), slot: f.slot,
        title:f.title || `${f.group} ${f.slot}`, required: !!f.required, show:true
      }))
      setDragList(flat)
    } catch (e) {
      setLoadErr('Failed to load inventory.')
      setInv(null); setItems([]); setDragList([])
    }

    try {
      const cats = await api.get('/api/categories')
      setCategories(Array.isArray(cats.data) ? cats.data : [])
    } catch { setCategories([]) }
  }
  useEffect(()=>{ load() },[id])

  const loadStats = async () => {
    try { const { data } = await api.get(`/api/inventories/${id}/stats`); setStats(data) }
    catch { setStats(null) }
  }
  useEffect(()=>{ if (tab==='stats') loadStats() },[tab])

  const idPreview = useMemo(()=>renderIdPreview(elements || []),[elements])

  if (loadErr) return <div className="p-6 text-red-600">{loadErr}</div>
  if (!inv) return <div className="p-6">Loading…</div>

  const itemCols = [
    { key: 'customId', title: 'ID', render:(v,r)=><Link to={user ? `/inventories/${id}/item/${r.id}` : '#'} className="text-blue-600">{v}</Link> },
    ...visibleTableColumns(fields)
  ]

  const saveSettings = async () => {
    try {
      const { data } = await api.put(`/api/inventories/${id}`, {
        ...inv,
        version,
        categoryId: inv.categoryId,
        images: invImages
      })
      setVersion(data.version)
      setInv(data)
      setInvImages([data.image1, data.image2, data.image3].filter(Boolean))
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
      setSel([]); await load(); toast('Deleted selected items')
    } catch { toast('Delete failed for one or more items') }
  }

  // ----- Custom Fields DnD -----
  const [dragIdx, setDragIdx] = useState(-1)
  const onDragStart = (i) => setDragIdx(i)
  const onDragOver = (e, i) => { e.preventDefault(); if (i===dragIdx) return }
  const onDrop = (i) => {
    if (dragIdx < 0 || dragIdx === i) return
    const next = [...dragList]
    const [m] = next.splice(dragIdx, 1)
    next.splice(i, 0, m)
    setDragIdx(-1)
    setDragList(next)
  }
  const setItem = (i, patch) => {
    const next = [...dragList]; next[i] = { ...next[i], ...patch }; setDragList(next)
  }
  const addField = (kind) => {
    // find next free slot 1..3 for that group
    const group = kind
    const existSlots = dragList.filter(x=>x.group===group).map(x=>x.slot)
    const slot = [1,2,3].find(s => !existSlots.includes(s))
    if (!slot) return
    const rec = { id:`${group}-${slot}`, group, slot, title:`${typeNames[group]} ${slot}`, required:false, show:true }
    setDragList([...dragList, rec])
  }
  const removeField = (idKey) => setDragList(dragList.filter(x => x.id !== idKey))

  const saveFields = async () => {
    // rebuild grouped "fields" payload + "order"
    const fieldsPayload = makeFieldsFromFlat(dragList, fields)
    const order = dragList.map(x => ({ group: mapType(x.group), slot: x.slot }))
    await api.post(`/api/inventories/${id}/fields`, { fields: fieldsPayload, order })
    await load()
    toast('Saved field config')
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
        {canEdit && (<button onClick={saveSettings} className="px-3 py-1 text-sm border rounded">Save</button>)}
      </div>

      <div className="mt-2 text-sm">
        <label className="flex items-center gap-2">
          <span>Public write access</span>
          <input type="checkbox" disabled={!canEdit} checked={!!inv.publicWrite}
            onChange={e=>setInv({...inv, publicWrite: e.target.checked})}/>
        </label>
      </div>

      {/* 🔺 Inventory multi-image (owner/admin only). NOT shown for public-write users */}
      <div className="mt-3">
        {canEdit && (
          <MultiImageUpload
            label="Inventory images"
            images={invImages}
            onChange={setInvImages}
            inventoryId={id}
            canWrite={canEdit}
            scope="inventory"
          />
        )}
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
          <div><b>Preview:</b> <code className="px-2 py-1 bg-gray-100 rounded dark:bg-gray-800">{idPreview}</code></div>
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
          {/* Add field */}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button key={t} className="px-2 py-1 text-sm border rounded" onClick={()=>addField(t)}>
                  + {typeNames[t]}
                </button>
              ))}
            </div>
          )}

          {/* DnD list */}
          <div className="border rounded">
            {dragList.length === 0 && <div className="p-4 text-center text-gray-500">No fields</div>}
            {dragList.map((r, i) => (
              <div key={r.id}
                   draggable={canEdit}
                   onDragStart={()=>onDragStart(i)}
                   onDragOver={(e)=>onDragOver(e,i)}
                   onDrop={()=>onDrop(i)}
                   className="grid items-center gap-2 px-3 py-2 border-b md:grid-cols-6">
                <div className="text-gray-500 cursor-grab">↕</div>
                <div className="text-sm">{typeNames[r.group]} {r.slot}</div>
                <input
                  disabled={!canEdit}
                  className="px-2 py-1 border rounded"
                  value={r.title}
                  onChange={e=>setItem(i,{ title:e.target.value })}
                  placeholder="Label"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" disabled={!canEdit}
                    checked={!!r.show}
                    onChange={e=>setItem(i,{ show:e.target.checked })}
                  />
                  Show in Add Item
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" disabled={!canEdit}
                    checked={!!r.required}
                    onChange={e=>setItem(i,{ required:e.target.checked })}
                  />
                  Required
                </label>
                {canEdit && (
                  <button className="px-2 py-1 text-sm border rounded" onClick={()=>removeField(r.id)}>Remove</button>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <div>
              <button className="px-3 py-1 text-sm border rounded" onClick={saveFields}>Save</button>
            </div>
          )}
        </div>
      )}

      {tab==='access' && (<AccessTab id={id} canEdit={canEdit}/>)}
      {tab==='discussion' && <DiscussionTab id={id}/>}

      {tab==='stats' && (
        <StatsBlock stats={stats} fields={fields} />
      )}
    </div>
  )
}

/* ---------- helpers ---------- */

function makeEmpty() {
  const mk = () => ([{title:'',desc:'',show:false,required:false},{title:'',desc:'',show:false,required:false},{title:'',desc:'',show:false,required:false}])
  return { text:mk(), mtext:mk(), num:mk(), link:mk(), bool:mk(), image:mk() }
}

function mapGroup(g) {
  const k = (g||'').toString().toUpperCase()
  return k === 'NUMBER' ? 'num'
    : k === 'TEXT' ? 'text'
    : k === 'MTEXT' ? 'mtext'
    : k === 'LINK' ? 'link'
    : k === 'BOOL' ? 'bool'
    : 'image'
}
function mapType(short) {
  return short==='num' ? 'NUMBER'
    : short==='text' ? 'TEXT'
    : short==='mtext' ? 'MTEXT'
    : short==='link' ? 'LINK'
    : short==='bool' ? 'BOOL' : 'IMAGE'
}

function makeFieldsFromFlat(flat, current) {
  const res = { text:[...current.text], mtext:[...current.mtext], num:[...current.num], link:[...current.link], bool:[...current.bool], image:[...current.image] }
  // start clean
  for (const k of Object.keys(res)) for (let i=0;i<3;i++) res[k][i] = { title:'', desc:'', show:false, required:false }
  flat.forEach(r => {
    const idx = r.slot-1
    if (idx>=0 && idx<3) {
      res[r.group][idx] = { title:r.title||'', desc:'', show:!!r.show, required:!!r.required }
    }
  })
  return res
}

function visibleTableColumns(fields){
  const cols = []
  ;(fields?.text||[]).forEach((f,idx)=> f?.show && cols.push({key:`text${idx+1}`,title:f.title?.trim()||`Text ${idx+1}`}))
  ;(fields?.num ||[]).forEach((f,idx)=> f?.show && cols.push({key:`num${idx+1}`, title:f.title?.trim()||`Number ${idx+1}`}))
  ;(fields?.bool||[]).forEach((f,idx)=> f?.show && cols.push({key:`bool${idx+1}`,title:f.title?.trim()||`Flag ${idx+1}`,render:(v)=>v?'✓':''}))
  return cols
}

function AccessTab({ id, canEdit }) {
  const [users,setUsers] = useState([])
  const [list,setList] = useState([])
  const [q,setQ] = useState('')
  const [sort,setSort] = useState('name')

  const load = async () => {
    try { const { data } = await api.get(`/api/inventories/${id}/access`); setList(Array.isArray(data)?data:[]) }
    catch { setList([]) }
  }
  useEffect(()=>{ load() },[id])

  const findUsers = async (text) => {
    try { const { data } = await api.get('/api/users/search', { params: { q: text } }); setUsers(Array.isArray(data)?data:[]) }
    catch { setUsers([]) }
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
                    onClick={async()=>{ await api.post(`/api/inventories/${id}/access`,{ userId: u.id, canWrite:true }); setQ(''); await load() }}>Add</button>
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
                }}/> write
              </label>
              {canEdit && (
                <button className="px-2 py-1 text-sm border rounded"
                  onClick={async()=>{ await api.delete(`/api/inventories/${id}/access/${x.userId}`) }}>
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
    try { const { data } = await api.get(`/api/inventories/${id}/comments`); setList(Array.isArray(data)?data:[]) }
    catch { setList([]) }
  }
  useEffect(()=>{ load() },[id])
  const post = async () => {
    const body = (txt || '').trim(); if (!body) return
    await api.post(`/api/inventories/${id}/comments`, { body }); setTxt(''); await load()
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

function StatsBlock({ stats, fields }){
  const numLabels = [
    fields.num?.[0]?.title || 'Number 1',
    fields.num?.[1]?.title || 'Number 2',
    fields.num?.[2]?.title || 'Number 3'
  ]
  return (
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
  )
}
