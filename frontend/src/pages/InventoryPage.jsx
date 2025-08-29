import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import MarkdownBox from '../components/MarkdownBox'
import Toolbar from '../components/Toolbar'
import Table from '../components/Table'
import { useUI } from '../store/ui'
import { useTranslation } from 'react-i18next'
import { renderIdPreview } from '../utils/idPreview'

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
  const { t } = useTranslation()
  const { autosaveState, setSaving } = useUI()
  const [inv, setInv] = useState(null)
  const [tab, setTab] = useState('items')
  const [fields,setFields] = useState(emptyFields)
  const [elements,setElements] = useState(defaultElements)
  const [items,setItems] = useState([])
  const [sel,setSel] = useState([])
  const [version,setVersion] = useState(1)

  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}`)
    setInv(data.inventory)
    setFields(data.fields)
    setElements(data.elements)
    setVersion(data.inventory.version)
    setItems(data.items)
  }
  useEffect(()=>{ load() },[id])

  useEffect(()=>{
    const timer = setInterval(async ()=>{
      if (!inv) return
      setSaving('saving')
      try {
        const { data } = await api.put(`/api/inventories/${id}`, { ...inv, version })
        setVersion(data.version)
        setSaving('saved')
      } catch {
        setSaving('saved')
      }
    }, 8000)
    return ()=>clearInterval(timer)
  },[inv, version])

  const addItem = async () => {
    const { data } = await api.post(`/api/inventories/${id}/items`, {})
    window.location.href = `/inventories/${id}/item/${data.id}`
  }

  const removeSelected = async () => {
    const ids = Array.isArray(sel) && sel[0] && Array.isArray(sel[0]) ? sel[0] : sel
    if (!ids.length) return
    await api.post(`/api/inventories/${id}/items/bulk-delete`, { ids })
    setSel([]); await load()
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
      <div className="flex items-center gap-3">
        <input className="px-2 py-1 text-xl font-semibold border rounded"
          value={inv.title} onChange={e=>setInv({...inv,title:e.target.value})}/>
        <span className="text-sm text-gray-500">{autosaveState==='saving' ? t('autosaving') : t('saved')}</span>
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
            <MarkdownBox value={inv.description || ''} onChange={(v)=>setInv({...inv,description:v})}/>
          </label>

          <label className="flex items-center gap-2">
            <span>{t('publicWrite')}</span>
            <input type="checkbox" checked={inv.publicWrite}
              onChange={e=>setInv({...inv, publicWrite: e.target.checked})}/>
          </label>
        </div>
      )}

      {tab==='customId' && (
        <div className="grid gap-3 mt-3">
          <div><b>{t('preview')}:</b> <code className="px-2 py-1 bg-gray-100 rounded dark:bg-gray-800">{idPreview}</code></div>
          <div className="text-sm text-gray-500">{t('idElements')}</div>
          {elements.sort((a,b)=>a.order-b.order).map((el,idx)=>(
            <div key={idx} className="grid items-center gap-2 md:grid-cols-4">
              <select value={el.type} onChange={e=>{
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
              <input value={el.param||''} onChange={e=>{
                const next=[...elements]; next[idx]={...el,param:e.target.value}; setElements(next)
              }} className="px-2 py-1 border rounded" placeholder={t('format')}/>
              <input type="number" value={el.order} onChange={e=>{
                const next=[...elements]; next[idx]={...el,order:parseInt(e.target.value||'1',10)}; setElements(next)
              }} className="w-24 px-2 py-1 border rounded"/>
              <button onClick={()=>{
                const next=[...elements]; next.splice(idx,1); setElements(next)
              }} className="px-2 py-1 text-sm border rounded">{t('delete')}</button>
            </div>
          ))}
          <div>
            <button onClick={()=>setElements([...elements,{order:elements.length+1,type:'FIXED',param:'-'}])}
              className="px-3 py-1 text-sm border rounded">{t('addElement')}</button>
            <button onClick={async()=>{
              await api.post(`/api/inventories/${id}/custom-id`, { elements })
              await load()
            }} className="px-3 py-1 ml-2 text-sm border rounded">{t('save')}</button>
          </div>
        </div>
      )}

      {tab==='fields' && (
        <div className="grid gap-6 mt-4">
          {['text','mtext','num','link','bool'].map(group=>(
            <div key={group} className="p-3 border rounded">
              <div className="mb-2 font-medium uppercase">{group}</div>
              {fields[group].map((f,idx)=>(
                <div key={idx} className="grid items-center gap-2 mb-2 md:grid-cols-4">
                  <input className="px-2 py-1 border rounded" placeholder="Title" value={f.title}
                    onChange={e=>{
                      const next = {...fields}; next[group][idx].title = e.target.value; setFields(next)
                    }}/>
                  <input className="px-2 py-1 border rounded" placeholder="Description" value={f.desc}
                    onChange={e=>{
                      const next = {...fields}; next[group][idx].desc = e.target.value; setFields(next)
                    }}/>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={!!f.show}
                      onChange={e=>{
                        const next = {...fields}; next[group][idx].show = e.target.checked; setFields(next)
                      }}/>
                    <span>{t('showInTable')}</span>
                  </label>
                  <button className="px-2 py-1 text-sm border rounded"
                    onClick={async()=>{
                      await api.post(`/api/inventories/${id}/fields`, { fields })
                      await load()
                    }}>{t('save')}</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab==='access' && (<AccessTab id={id}/>)}
      {tab==='stats' && <StatsTab id={id}/>}
      {tab==='discussion' && <DiscussionTab id={id}/>}
    </div>
  )
}

function AccessTab({ id }) {
  const [users,setUsers] = useState([])
  const [list,setList] = useState([])
  const [q,setQ] = useState('')
  const [sort,setSort] = useState('name')
  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}/access`)
    setList(data)
  }
  useEffect(()=>{ load() },[id])
  const findUsers = async (text) => {
    const { data } = await api.get('/api/users/search', { params: { q: text } })
    setUsers(data)
  }
  useEffect(()=>{ if(q) findUsers(q) },[q])
  return (
    <div className="grid gap-3 mt-3">
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
                <input type="checkbox" checked={x.canWrite} onChange={async(e)=>{
                  await api.put(`/api/inventories/${id}/access/${x.userId}`, { canWrite: e.target.checked })
                  await load()
                }}/> write
              </label>
              <button className="px-2 py-1 text-sm border rounded"
                onClick={async()=>{ await api.delete(`/api/inventories/${id}/access/${x.userId}`); await load() }}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {list.length===0 && <div className="p-4 text-center text-gray-500">No users</div>}
      </div>
    </div>
  )
}

function StatsTab({ id }) {
  const [data,setData] = useState(null)
  useEffect(()=>{ (async()=>{
    const { data } = await api.get(`/api/inventories/${id}/stats`)
    setData(data)
  })() },[id])
  if (!data) return <div className="p-4">Loading…</div>
  return (
    <div className="grid gap-3 mt-3 md:grid-cols-3">
      <div className="p-3 border rounded"><b>Items:</b> {data.count}</div>
      <div className="p-3 border rounded"><b>Num1 avg:</b> {data.num1_avg ?? '-'}</div>
      <div className="p-3 border rounded"><b>Num2 avg:</b> {data.num2_avg ?? '-'}</div>
    </div>
  )
}

function DiscussionTab({ id }) {
  const [list,setList] = useState([])
  const [txt,setTxt] = useState('')
  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}/comments`)
    setList(data)
  }
  useEffect(()=>{ load() },[id])
  const post = async () => {
    if (!txt.trim()) return
    await api.post(`/api/inventories/${id}/comments`, { body: txt })
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
        <input value={txt} onChange={e=>setTxt(e.target.value)} className="flex-1 px-2 py-1 border rounded"/>
        <button onClick={post} className="px-3 py-1 text-sm border rounded">Post</button>
      </div>
    </div>
  )
}
