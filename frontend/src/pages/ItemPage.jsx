// frontend/src/pages/ItemPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/client'
import UploadImage from '../components/UploadImage'

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

  // list of visible inputs in the correct cross-group order
  const ordered = useMemo(() => {
    if (!fields || !fieldsFlat) return []
    const keyOf = (g) => {
      const k = (g || '').toString().toLowerCase()
      if (k === 'number') return 'num'
      return k
    }
    return (fieldsFlat || [])
      .filter(f => {
        const arr = fields[keyOf(f.group)] || []
        const cfg = arr[f.slot - 1]
        return !!cfg?.show
      })
  }, [fields, fieldsFlat])

  if (!item || !fields) return <div className="p-6">Loading…</div>

  // build clean payload & prevent NaN
  const buildPayload = () => {
    const allowed = new Set([
      'customId',
      'text1','text2','text3',
      'mtext1','mtext2','mtext3',
      'num1','num2','num3',
      'link1','link2','link3',
      'bool1','bool2','bool3',
      'img1','img2','img3'
    ])
    const out = {}
    for (const [k, v] of Object.entries(item)) {
      if (!allowed.has(k)) continue
      if (k.startsWith('num')) {
        const n = Number(v)
        out[k] = Number.isFinite(n) ? n : null
      } else {
        out[k] = v
      }
    }
    return out
  }

  const save = async () => {
    if (!canWrite) return
    await api.put(`/api/inventories/${id}/items/${itemId}`, buildPayload())
    await load()
  }

  const toggleLike = async () => {
    const { data } = await api.post(`/api/inventories/${id}/items/${itemId}/like`)
    setLikes(data.count)
  }

  const inputFor = (f) => {
    const base = f.group
    const key =
      (base === 'NUMBER' ? 'num'
      : base === 'TEXT'   ? 'text'
      : base === 'MTEXT'  ? 'mtext'
      : base === 'LINK'   ? 'link'
      : base === 'BOOL'   ? 'bool' : 'img') + f.slot

    const labelMapKey = (base === 'NUMBER' ? 'num'
      : base === 'TEXT' ? 'text'
      : base === 'MTEXT' ? 'mtext'
      : base === 'LINK' ? 'link'
      : base === 'BOOL' ? 'bool' : 'image')
    const label = fields[labelMapKey]?.[f.slot-1]?.title || `${f.group} ${f.slot}`

    switch (base) {
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
            <input type="number" value={item[key] ?? ''} onChange={e=>{
              const n = e.target.value === '' ? null : e.target.valueAsNumber
              setItem({...item, [key]: Number.isFinite(n) ? n : null})
            }}
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
      case 'IMAGE':
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
