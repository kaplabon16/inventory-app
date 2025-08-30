import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import UploadImage from '../components/UploadImage'

export default function ItemPage() {
  const { id, itemId } = useParams()
  const [item,setItem] = useState(null)
  const [fields,setFields] = useState(null)
  const [fieldsFlat, setFieldsFlat] = useState([]) // NEW
  const [likes,setLikes] = useState(0)

  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}/items/${itemId}`)
    setItem(data.item)
    setFields(data.fields)
    setFieldsFlat(data.fieldsFlat || [])
    setLikes(data.item?._count?.likes ?? 0)
  }
  useEffect(()=>{ load() },[id,itemId])

  const save = async () => {
    await api.put(`/api/inventories/${id}/items/${itemId}`, item)
    await load()
  }

  const toggleLike = async () => {
    const { data } = await api.post(`/api/inventories/${id}/items/${itemId}/like`)
    setLikes(data.count)
  }

  if (!item || !fields) return <div className="p-6">Loading…</div>

  // Render inputs following cross-type order
  const ordered = useMemo(
    () => (fieldsFlat?.length ? fieldsFlat : []).filter(f=>fields[f.group]?.[f.slot-1]?.show),
    [fieldsFlat, fields]
  )

  const inputFor = (f) => {
    const keyBase = f.group.toLowerCase()
    const key = (keyBase === 'number' ? 'num' : keyBase === 'text' ? 'text' : keyBase === 'mtext' ? 'mtext' : keyBase === 'link' ? 'link' : keyBase === 'bool' ? 'bool' : 'img') + f.slot
    const label = fields[f.group.toLowerCase()]?.[f.slot-1]?.title || `${f.group} ${f.slot}`

    switch (f.group) {
      case 'TEXT':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded"/>
          </label>
        )
      case 'MTEXT':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <textarea rows={4} value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded"/>
          </label>
        )
      case 'NUMBER':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input type="number" value={item[key]??''} onChange={e=>setItem({...item, [key]: e.target.valueAsNumber})}
              className="px-2 py-1 border rounded"/>
          </label>
        )
      case 'LINK':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input type="url" value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded"/>
          </label>
        )
      case 'BOOL':
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!item[key]} onChange={e=>setItem({...item, [key]: e.target.checked})}/>
            <span>{label}</span>
          </label>
        )
      case 'IMAGE':
        return (
          <div className="grid gap-1">
            <UploadImage
              label={label}
              value={item[`img${f.slot}`] || ''}
              onChange={(u)=>setItem({...item, [`img${f.slot}`]: u})}
              inventoryId={id}
            />
          </div>
        )
      default: return null
    }
  }

  return (
    <div className="grid max-w-3xl gap-3 p-4 mx-auto">
      <div className="flex items-center justify-between">
        <div><b>ID:</b> <input className="w-full px-2 py-1 border rounded"
          value={item.customId || ''} onChange={e=>setItem({...item, customId: e.target.value})}/></div>
        <button onClick={toggleLike} className="px-2 py-1 ml-3 border rounded">👍 {likes}</button>
      </div>

      {ordered.map((f,i)=><div key={`${f.group}-${f.slot}-${i}`}>{inputFor(f)}</div>)}

      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 border rounded">Save</button>
        <button onClick={async()=>{ await api.delete(`/api/inventories/${id}/items/${itemId}`); history.back() }}
          className="px-3 py-1 border rounded">Delete</button>
      </div>
    </div>
  )
}
