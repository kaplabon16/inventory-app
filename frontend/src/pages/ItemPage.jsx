import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'

export default function ItemPage() {
  const { id, itemId } = useParams()
  const [item,setItem] = useState(null)
  const [fields,setFields] = useState(null)

  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}/items/${itemId}`)
    setItem(data.item); setFields(data.fields)
  }
  useEffect(()=>{ load() },[id,itemId])

  const save = async () => {
    await api.put(`/api/inventories/${id}/items/${itemId}`, item)
    await load()
  }

  if (!item || !fields) return <div className="p-6">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto p-4 grid gap-3">
      <div><b>ID:</b> <input className="border rounded px-2 py-1 w-full"
        value={item.customId || ''} onChange={e=>setItem({...item, customId: e.target.value})}/></div>

      {fields.text.map((f,idx)=>(
        <label key={`t${idx}`} className="grid gap-1">
          <span>{f.title}</span>
          <input value={item[`text${idx+1}`]||''} onChange={e=>setItem({...item, [`text${idx+1}`]: e.target.value})}
            className="border rounded px-2 py-1"/>
        </label>
      ))}
      {fields.mtext.map((f,idx)=>(
        <label key={`m${idx}`} className="grid gap-1">
          <span>{f.title}</span>
          <textarea rows={4} value={item[`mtext${idx+1}`]||''} onChange={e=>setItem({...item, [`mtext${idx+1}`]: e.target.value})}
            className="border rounded px-2 py-1"/>
        </label>
      ))}
      {fields.num.map((f,idx)=>(
        <label key={`n${idx}`} className="grid gap-1">
          <span>{f.title}</span>
          <input type="number" value={item[`num${idx+1}`]??''} onChange={e=>setItem({...item, [`num${idx+1}`]: e.target.valueAsNumber})}
            className="border rounded px-2 py-1"/>
        </label>
      ))}
      {fields.link.map((f,idx)=>(
        <label key={`l${idx}`} className="grid gap-1">
          <span>{f.title}</span>
          <input type="url" value={item[`link${idx+1}`]||''} onChange={e=>setItem({...item, [`link${idx+1}`]: e.target.value})}
            className="border rounded px-2 py-1"/>
        </label>
      ))}
      {fields.bool.map((f,idx)=>(
        <label key={`b${idx}`} className="flex items-center gap-2">
          <input type="checkbox" checked={!!item[`bool${idx+1}`]} onChange={e=>setItem({...item, [`bool${idx+1}`]: e.target.checked})}/>
          <span>{f.title}</span>
        </label>
      ))}

      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 border rounded">Save</button>
        <button onClick={async()=>{ await api.delete(`/api/inventories/${id}/items/${itemId}`); history.back() }}
          className="px-3 py-1 border rounded">Delete</button>
      </div>
    </div>
  )
}
