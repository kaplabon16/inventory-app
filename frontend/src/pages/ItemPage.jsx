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
    return (fieldsFlat || [])
      .filter(f => {
        const key = mapKey(f.group)
        const arr = fields[key] || []
        const cfg = arr[f.slot - 1]
        return !!cfg?.show
      })
  }, [fields, fieldsFlat])

  if (!item || !fields) return <div className="p-6">Loading…</div>

  const moveImg = (from, to) => {
    const keys = ['img1','img2','img3']
    if (from<0 || to<0 || from>2 || to>2) return
    const next = { ...item }
    ;[next[keys[from]], next[keys[to]]] = [next[keys[to]], next[keys[from]]]
    setItem(next)
  }
  const clearImg = (slot) => {
    const key = `img${slot}`
    setItem({ ...item, [key]: null })
  }

  const inputFor = (f) => {
    const base = (f.group || '').toString().toUpperCase()
    const key =
      (base === 'NUMBER' ? 'num'
      : base === 'TEXT' ? 'text'
      : base === 'MTEXT' ? 'mtext'
      : base === 'LINK' ? 'link'
      : base === 'BOOL' ? 'bool' : 'img') + f.slot

    const label = fields[(base === 'NUMBER' ? 'num'
      : base === 'TEXT' ? 'text'
      : base === 'MTEXT' ? 'mtext'
      : base === 'LINK' ? 'link'
      : base === 'BOOL' ? 'bool' : 'image')]?.[f.slot-1]?.title || `${f.group} ${f.slot}`

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
      case 'IMAGE':
        return (
          <div className="grid gap-1">
            <span className="text-sm">{label}</span>
            <UploadImage
              label={label}
              value={item[`img${f.slot}`] || ''}
              onChange={(u)=>setItem({...item, [`img${f.slot}`]: u})}
              inventoryId={id}
              canWrite={canWrite}
              scope="item"
            />
            {canWrite && (
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={f.slot===1} onClick={()=>moveImg(f.slot-1, f.slot-2)}>←</button>
                  <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={f.slot===3} onClick={()=>moveImg(f.slot-1, f.slot)}>→</button>
                </div>
                <button className="px-2 py-1 text-sm border rounded" onClick={()=>clearImg(f.slot)}>Delete</button>
              </div>
            )}
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

function mapKey(g) {
  const k = (g || '').toString().toUpperCase()
  if (k === 'NUMBER') return 'num'
  if (k === 'TEXT') return 'text'
  if (k === 'MTEXT') return 'mtext'
  if (k === 'LINK') return 'link'
  if (k === 'BOOL') return 'bool'
  return 'image'
}
