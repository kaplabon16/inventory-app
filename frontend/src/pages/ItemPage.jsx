// frontend/src/pages/ItemPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import UploadImage from '../components/UploadImage'
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

  // Build ordered fields strictly by display order; collapse IMAGE slots into a single logical control at first image position
  const ordered = useMemo(() => {
    if (!fields || !fieldsFlat) return []
    const mapKey = (g) => {
      const k = (g || '').toString().toLowerCase()
      if (k === 'number') return 'num'
      return k
    }
    const visible = (fieldsFlat || [])
      .map(f => ({ ...f, k: mapKey(f.group) }))
      .filter(f => {
        const arr = fields[f.k] || []
        const cfg = arr[f.slot - 1]
        return !!cfg?.show
      })

    // collapse images: find first IMAGE position
    const imgs = visible.filter(v => v.k === 'image')
    if (imgs.length === 0) return visible
    const firstIdx = visible.findIndex(v => v.k === 'image')
    const withoutImgs = visible.filter(v => v.k !== 'image')
    // Insert a synthetic record
    withoutImgs.splice(firstIdx, 0, { k:'image-all', slot: 0, title: 'Images' })
    return withoutImgs
  }, [fields, fieldsFlat])

  if (!item || !fields) return <div className="p-6">Loading…</div>

  const inputFor = (f) => {
    if (f.k === 'image-all') {
      const arr = [item.img1, item.img2, item.img3].filter(Boolean)
      return (
        <div className="grid gap-1">
          <span className="font-medium">Images</span>
          <MultiImagePicker
            values={arr}
            onChange={(next)=>{
              const [a='',b='',c=''] = next
              setItem({...item, img1:a, img2:b, img3:c})
            }}
            inventoryId={id}
            canWrite={canWrite}
            max={3}
          />
        </div>
      )
    }

    const base = f.k // 'text'|'mtext'|'num'|'link'|'bool'|'image'
    const key = (base === 'num' ? 'num'
      : base === 'text' ? 'text'
      : base === 'mtext' ? 'mtext'
      : base === 'link' ? 'link'
      : base === 'bool' ? 'bool'
      : 'img') + f.slot
    const label = fields[(base === 'num' ? 'num' : base)]?.[f.slot-1]?.title || `${f.k.toUpperCase()} ${f.slot}`

    switch (base) {
      case 'text':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded" disabled={!canWrite}/>
          </label>
        )
      case 'mtext':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <textarea rows={4} value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded" disabled={!canWrite}/>
          </label>
        )
      case 'num':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input type="number" value={item[key]??''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded" disabled={!canWrite}/>
          </label>
        )
      case 'link':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input type="url" value={item[key]||''} onChange={e=>setItem({...item, [key]: e.target.value})}
              className="px-2 py-1 border rounded" disabled={!canWrite}/>
          </label>
        )
      case 'bool':
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!item[key]} onChange={e=>setItem({...item, [key]: e.target.checked})} disabled={!canWrite}/>
            <span>{label}</span>
          </label>
        )
      case 'image':
        // Kept for backward compatibility (if you still want per-slot image controls here)
        return (
          <div className="grid gap-1">
            <UploadImage
              label={label}
              value={item[`img${f.slot}`] || ''}
              onChange={(u)=>setItem({...item, [`img${f.slot}`]: u})}
              inventoryId={id}
              canWrite={canWrite}
            />
          </div>
        )
      default: return null
    }
  }

  return (
    <div className="grid max-w-3xl gap-3 p-4 mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <label className="grid gap-1">
            <span className="font-medium">ID</span>
            <input className="w-full px-2 py-1 border rounded"
              value={item.customId || ''} onChange={e=>setItem({...item, customId: e.target.value})} disabled={!canWrite}/>
          </label>
        </div>
        <button onClick={toggleLike} className="px-2 py-1 ml-3 border rounded">👍 {likes}</button>
      </div>

      {ordered.map((f,i)=><div key={`${f.k}-${f.slot}-${i}`}>{inputFor(f)}</div>)}

      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1 border rounded" disabled={!canWrite}>Save</button>
        <button onClick={async()=>{ if (!canWrite) return; await api.delete(`/api/inventories/${id}/items/${itemId}`); history.back() }}
          className="px-3 py-1 border rounded" disabled={!canWrite}>Delete</button>
      </div>
    </div>
  )
}
