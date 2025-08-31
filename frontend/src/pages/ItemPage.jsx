// frontend/src/pages/ItemPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import MultiImagePicker from '../components/MultiImagePicker'

export default function ItemPage() {
  const { id, itemId } = useParams()
  const [item,setItem] = useState(null)
  const [fields,setFields] = useState(null)
  const [fieldsFlat, setFieldsFlat] = useState([])
  const [likes,setLikes] = useState(0)
  const [canWrite, setCanWrite] = useState(false)

  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}/items/${itemId}`)
    setItem(data.item)
    setFields(data.fields)
    setFieldsFlat(data.fieldsFlat || [])
    setLikes(data.item?._count?.likes ?? 0)
    setCanWrite(!!data.canWrite)
  }
  useEffect(()=>{ load() },[id,itemId])

  const save = async () => {
    if (!canWrite) return
    await api.put(`/api/inventories/${id}/items/${itemId}`, item)
    await load()
  }

  const toggleLike = async () => {
    const { data } = await api.post(`/api/inventories/${id}/items/${itemId}/like`)
    setLikes(data.count)
  }

  const ordered = useMemo(() => {
    if (!fields || !fieldsFlat) return []
    const mapKey = (g) => {
      const k = (g || '').toString().toLowerCase()
      if (k === 'number') return 'num'
      return k
    }
    return (fieldsFlat || [])
      .filter(f => {
        const key = mapKey(f.group)
        const arr = fields[key] || []
        const cfg = arr[f.slot - 1]
        return !!cfg?.show
      })
  }, [fields, fieldsFlat])

  if (!item || !fields) return <div className="p-6">Loading…</div>

  const inputFor = (f) => {
    const base = (f.group || '').toString().toLowerCase()
    const key =
      (base === 'number' ? 'num'
      : base === 'text' ? 'text'
      : base === 'mtext' ? 'mtext'
      : base === 'link' ? 'link'
      : base === 'bool' ? 'bool' : 'img') + f.slot
    const label = fields[(base === 'number' ? 'num' : base)]?.[f.slot-1]?.title || `${f.group} ${f.slot}`

    switch (f.group) {
      case 'TEXT':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded" disabled={!canWrite}/>
          </label>
        )
      case 'MTEXT':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <textarea rows={4} value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded" disabled={!canWrite}/>
          </label>
        )
      case 'NUMBER':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input type="number" value={item[key]??''} onChange={e=>setItem({...item, [key]: e.target.valueAsNumber})}
              className="px-2 py-1 border rounded" disabled={!canWrite}/>
          </label>
        )
      case 'LINK':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input type="url" value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded" disabled={!canWrite}/>
          </label>
        )
      case 'BOOL':
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!item[key]} onChange={e=>setItem({...item, [key]: e.target.checked})} disabled={!canWrite}/>
            <span>{label}</span>
          </label>
        )
      case 'IMAGE': {
        // Use a multi picker bound to img1..img3
        const imgs = [item.img1, item.img2, item.img3].filter(Boolean)
        const setImgs = (arr=[]) => {
          const [a,b,c] = arr
          setItem({ ...item, img1: a || null, img2: b || null, img3: c || null })
        }
        return (
          <div className="grid gap-1">
            <MultiImagePicker
              label={label}
              inventoryId={id}
              value={imgs}
              onChange={setImgs}
              canWrite={canWrite}
              max={3}
            />
          </div>
        )
      }
      default: return null
    }
  }

  return (
    <div className="grid max-w-3xl gap-3 p-4 mx-auto">
      <div className="flex items-center justify-between">
        <div><b>ID:</b> <input className="w-full px-2 py-1 border rounded"
          value={item.customId || ''} onChange={e=>setItem({...item, customId: e.target.value})} disabled={!canWrite}/></div>
        <button onClick={toggleLike} className="px-2 py-1 ml-3 border rounded">👍 {likes}</button>
      </div>

      {ordered.map((f,i)=><div key={`${f.group}-${f.slot}-${i}`}>{inputFor(f)}</div>)}

      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 border rounded" disabled={!canWrite}>Save</button>
        <button onClick={async()=>{ if (!canWrite) return; await api.delete(`/api/inventories/${id}/items/${itemId}`); history.back() }}
          className="px-3 py-1 border rounded" disabled={!canWrite}>Delete</button>
      </div>
    </div>
  )
}
