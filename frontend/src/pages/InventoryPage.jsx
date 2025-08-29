import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import MarkdownBox from '../components/MarkdownBox'
import Toolbar from '../components/Toolbar'
import Table from '../components/Table'
import { useTranslation } from 'react-i18next'
import { renderIdPreview } from '../utils/idPreview'

const emptyFields = {
  text: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  mtext:[{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  num:  [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  link: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
  bool: [{title:'',desc:'',show:false},{title:'',desc:'',show:false},{title:'',desc:'',show:false}],
}

export default function InventoryPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { t } = useTranslation()
  const [inv, setInv] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [tab, setTab] = useState('items')
  const [fields,setFields] = useState(emptyFields)
  const [elements,setElements] = useState([])
  const [items,setItems] = useState([])
  const [sel,setSel] = useState([])
  const [version,setVersion] = useState(1)
  const [categories, setCategories] = useState([])
  const [flash, setFlash] = useState('')

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

  const toast = (msg) => { setFlash(msg); setTimeout(()=>setFlash(''), 2000) }

  const saveBasics = async () => {
    const { data } = await api.put(`/api/inventories/${id}`, { ...inv, version, categoryId: inv.categoryId })
    setVersion(data.version); toast(t('saved'))
  }

  const addItem = async () => {
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

  const idPreview = useMemo(()=>renderIdPreview(elements),[elements])

  if (!inv) return <div className="p-6">Loading…</div>

  const itemCols = [
    { key: 'customId', title: 'ID', render:(v,r)=><Link to={`/inventories/${id}/item/${r.id}`} className="text-blue-600">{v}</Link> },
    ...(fields.text.map((f,idx)=> f.show ? [{key:`text${idx+1}`, title:f.title}] : []).flat()),
    ...(fields.num.map((f,idx)=> f.show ? [{key:`num${idx+1}`, title:f.title}] : []).flat()),
    ...(fields.bool.map((f,idx)=> f.show ? [{key:`bool${idx+1}`, title:f.title, render:(val)=> val ? '✓' : ''}] : []).flat())
  ]

  return (
    <div className="max-w-6xl p-4 mx-auto">
      <div className="flex flex-wrap items-center gap-3">
        {canEdit ? (
          <>
            <input className="px-2 py-1 text-xl font-semibold border rounded"
              value={inv.title} onChange={e=>setInv({...inv,title:e.target.value})}/>
            <button onClick={saveBasics} className="px-2 py-1 text-sm border rounded">{t('save')}</button>
          </>
        ) : (
          <div className="text-xl font-semibold">{inv.title}</div>
        )}
        {flash && <span className="ml-2 text-sm text-green-600">{flash}</span>}
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
            left={<div className="text-sm text-gray-500">{t('inventoryItems')}</div>}
            right={<>
              <button onClick={addItem} className="px-2 py-1 text-sm border rounded">{t('addItem')}</button>
              <button onClick={removeSelected} className="px-2 py-1 text-sm border rounded">{t('delete')}</button>
            </>}
          />
          <Table columns={itemCols} rows={items} onSelect={setSel}/>
        </>
      )}

      {tab==='settings' && (
        <div className="grid gap-3 mt-3">
          <label className="grid gap-1">
            <span>{t('description')}</span>
            {canEdit ? (
              <MarkdownBox value={inv.description || ''} onChange={(v)=>setInv({...inv,description:v})}/>
            ) : (
              <div className="p-3 prose border rounded dark:prose-invert">{inv.description || <i>(no description)</i>}</div>
            )}
          </label>

          <label className="grid gap-1">
            <span>{t('category')}</span>
            <select
              disabled={!canEdit}
              className="max-w-sm px-2 py-1 border rounded"
              value={inv.categoryId}
              onChange={(e)=>setInv({...inv, categoryId: Number(e.target.value)})}
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span>{t('publicWrite')}</span>
            <input type="checkbox" disabled={!canEdit} checked={inv.publicWrite}
              onChange={e=>setInv({...inv, publicWrite: e.target.checked})}/>
          </label>

          {canEdit && (
            <div className="flex gap-2 pt-2">
              <button onClick={saveBasics} className="px-3 py-1 text-sm border rounded">{t('save')}</button>
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
          <div><b>{t('preview')}:</b> <code className="px-2 py-1 bg-gray-100 rounded dark:bg-gray-800">{idPreview}</code></div>
          <div className="text-sm text-gray-500">{t('idElements')}</div>
          {elements.sort((a,b)=>a.order-b.order).map((el,idx)=>(
            <div key={idx} className="grid items-center gap-2 md:grid-cols-4">
              <select disabled={!canEdit} value={el.type} onChange={e=>{
                const next=[...elements]; next[idx]={...el,type:e.target.value}; setElements(next)
              }} className="px-2 py-1 border rounded">
                <option value="FIXED">{t('fixed')}</option>
                <option value="RAND20">{t('rand20')}</option>
                <option value="RAND32">{t('rand32')}</option>
                <option value="RAND6">{t('rand6')}</option>
                <option value="RAND9">{t('rand9')}</option>
                <option value="GUID">{t('guid')}</option>
                <option value="DATE">{t('date')}</option>
                <option value="SEQ">{t('seq')}</option>
              </select>
              <input disabled={!canEdit} value={el.param||''} onChange={e=>{
                const next=[...elements]; next[idx]={...el,param:e.target.value}; setElements(next)
              }} className="px-2 py-1 border rounded" placeholder={t('format')}/>
              <input disabled={!canEdit} type="number" value={el.order} onChange={e=>{
                const next=[...elements]; next[idx]={...el,order:parseInt(e.target.value||'1',10)}; setElements(next)
              }} className="w-24 px-2 py-1 border rounded"/>
              {canEdit && (
                <button onClick={()=>{
                  const next=[...elements]; next.splice(idx,1); setElements(next)
                }} className="px-2 py-1 text-sm border rounded">{t('delete')}</button>
              )}
            </div>
          ))}
          {canEdit && (
            <div>
              <button onClick={()=>setElements([...elements,{order:elements.length+1,type:'FIXED',param:'-'}])}
                className="px-3 py-1 text-sm border rounded">{t('addElement')}</button>
              <button onClick={async()=>{
                await api.post(`/api/inventories/${id}/custom-id`, { elements })
                await load(); toast('Saved ID pattern')
              }} className="px-3 py-1 ml-2 text-sm border rounded">{t('save')}</button>
            </div>
          )}
        </div>
      )}

      {tab==='fields' && (
        <div className="grid gap-6 mt-4">
          {['text','mtext','num','link','bool'].map(group=>(
            <div key={group} className="p-3 border rounded">
              <div className="mb-2 font-medium uppercase">{group}</div>
              {fields[group].map((f,idx)=>(
                <div key={idx} className="grid items-center gap-2 mb-2 md:grid-cols-4">
                  <input disabled={!canEdit} className="px-2 py-1 border rounded" placeholder="Title" value={f.title}
                    onChange={e=>{
                      const next = {...fields}; next[group][idx].title = e.target.value; setFields(next)
                    }}/>
                  <input disabled={!canEdit} className="px-2 py-1 border rounded" placeholder="Description" value={f.desc}
                    onChange={e=>{
                      const next = {...fields}; next[group][idx].desc = e.target.value; setFields(next)
                    }}/>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" disabled={!canEdit} checked={!!f.show}
                      onChange={e=>{
                        const next = {...fields}; next[group][idx].show = e.target.checked; setFields(next)
                      }}/>
                    <span>{t('showInTable')}</span>
                  </label>
                  {canEdit && (
                    <button className="px-2 py-1 text-sm border rounded"
                      onClick={async()=>{
                        await api.post(`/api/inventories/${id}/fields`, { fields })
                        await load(); toast('Saved field config')
                      }}>{t('save')}</button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab==='access' && (<AccessTab id={id} canEdit={canEdit}/>)}
      {tab==='stats' && <StatsTab id={id}/>}
      {tab==='discussion' && <DiscussionTab id={id}/>}
    </div>
  )
}

function AccessTab({ id, canEdit }) {
  // ... (unchanged from your version)
  return null /* keep your previous AccessTab implementation */
}

function StatsTab({ id }) {
  const [data,setData] = useState(null)
  useEffect(()=>{ (async()=>{
    const { data } = await api.get(`/api/inventories/${id}/stats`)
    setData(data)
  })() },[id])
  if (!data) return <div className="p-4">Loading…</div>
  return (
    <div className="grid gap-3 mt-3">
      <div className="p-3 border rounded"><b>Items:</b> {data.count} &nbsp; <b>Likes:</b> {data.likesTotal}</div>

      {['num1','num2','num3'].map(k=>(
        <div key={k} className="p-3 border rounded">
          <div className="mb-1 font-medium">{k}</div>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div><b>avg:</b> {data[k]?.avg ?? '-'}</div>
            <div><b>min:</b> {data[k]?.min ?? '-'}</div>
            <div><b>max:</b> {data[k]?.max ?? '-'}</div>
            <div><b>median:</b> {data[k]?.median ?? '-'}</div>
          </div>
        </div>
      ))}

      <div className="p-3 border rounded">
        <div className="mb-1 font-medium">Top text values</div>
        {(data.topText || []).length === 0
          ? <div className="text-sm text-gray-500">No text values yet</div>
          : <ul className="ml-6 list-disc">{data.topText.map((r,i)=><li key={i}>{r.v} — {r.c}</li>)}</ul>}
      </div>

      <div className="p-3 border rounded">
        <div className="mb-1 font-medium">Created timeline (per month)</div>
        <ul className="ml-6 list-disc">
          {(data.timeline || []).map(row => <li key={row.ym}>{row.ym}: {row.c}</li>)}
        </ul>
      </div>

      <div className="p-3 border rounded">
        <div className="mb-1 font-medium">Top contributors</div>
        <ul className="ml-6 list-disc">
          {(data.contributors || []).map((r,i)=><li key={i}>{r.name}: {r.c}</li>)}
        </ul>
      </div>
    </div>
  )
}

function DiscussionTab({ id }) {
  // ... (keep your previous DiscussionTab)
  return null
}
