
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import UploadImage from '../components/UploadImage'

export default function ItemPage() {
  const { id, itemId } = useParams()
  const nav = useNavigate()
  const [item, setItem] = useState(null)
  const [fields, setFields] = useState(null)
  const [fieldsFlat, setFieldsFlat] = useState([])
  const [likes, setLikes] = useState(0)
  const [canWrite, setCanWrite] = useState(false)

  const load = async () => {
    const { data } = await api.get(`/api/inventories/${id}/items/${itemId}`)
    setItem(data.item)
    setFields(data.fields)
    setFieldsFlat(data.fieldsFlat || [])
    setLikes(data.item?._count?.likes ?? 0)
    setCanWrite(!!data.canWrite)
  }
  useEffect(() => { load() }, [id, itemId])

  const ordered = useMemo(() => {
    if (!fields || !fieldsFlat) return []
    const keyFor = (g) => {
      const k = (g || '').toString().toLowerCase()
      return k === 'number' ? 'num' : k
    }
    return (fieldsFlat || []).filter(f => {
      const cfg = (fields[keyFor(f.group)] || [])[f.slot - 1]
      return !!cfg?.show
    })
  }, [fields, fieldsFlat])

  const coerceNum = (v) => {
    if (v === '' || v === null || v === undefined) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  const save = async () => {
    if (!canWrite) return
    const payload = { ...item }
    ;['num1','num2','num3'].forEach(k => { payload[k] = coerceNum(payload[k]) })
    try {
      await api.put(`/api/inventories/${id}/items/${itemId}`, payload)
      nav(`/inventories/${id}`, { replace: true })
    } catch (e) {
      if (e?.response?.status === 401) {
        window.location.assign(`/login?redirect=/inventories/${id}/item/${itemId}`)
        return
      }
      alert('Save failed')
      await load()
    }
  }

  const deleteItem = async () => {
    if (!canWrite) return
    if (!confirm('Delete this item? This cannot be undone.')) return
    try {
      await api.delete(`/api/inventories/${id}/items/${itemId}`)
      nav(`/inventories/${id}`, { replace: true })
    } catch {
      alert('Delete failed')
    }
  }

  const toggleLike = async () => {
    try {
      const { data } = await api.post(`/api/inventories/${id}/items/${itemId}/like`)
      setLikes(data.count)
    } catch (e) {
      if (e?.response?.status === 401) {
        window.location.assign(`/login?redirect=/inventories/${id}/item/${itemId}`)
        return
      }
      alert('Failed to like')
    }
  }

  if (!item || !fields) return <div className="p-6">Loading…</div>

  const inputFor = (f) => {
    const baseGroup = (f.group || '').toString().toLowerCase()
    const resolvePrefixes = (group) => {
      switch (group) {
        case 'number': return { fieldKey: 'num', valuePrefix: 'num' }
        case 'text':   return { fieldKey: 'text', valuePrefix: 'text' }
        case 'mtext':  return { fieldKey: 'mtext', valuePrefix: 'mtext' }
        case 'link':   return { fieldKey: 'link', valuePrefix: 'link' }
        case 'bool':   return { fieldKey: 'bool', valuePrefix: 'bool' }
        case 'image':  return { fieldKey: 'image', valuePrefix: 'img' }
        default:       return { fieldKey: group, valuePrefix: group }
      }
    }

    const { fieldKey, valuePrefix } = resolvePrefixes(baseGroup)
    const valueKey = `${valuePrefix}${f.slot}`
    const configuredTitle = fields?.[fieldKey]?.[f.slot - 1]?.title
    const label = (configuredTitle && configuredTitle.trim())
      ? configuredTitle.trim()
      : (f.title?.trim() || `${f.group} ${f.slot}`)

    switch (f.group) {
      case 'TEXT':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input
              value={item[valueKey] || ''}
              onChange={(e) => setItem({ ...item, [valueKey]: e.target.value })}
              className="px-2 py-1 border rounded"
              disabled={!canWrite}
            />
          </label>
        )
      case 'MTEXT':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <textarea
              rows={4}
              value={item[valueKey] || ''}
              onChange={(e) => setItem({ ...item, [valueKey]: e.target.value })}
              className="px-2 py-1 border rounded"
              disabled={!canWrite}
            />
          </label>
        )
      case 'NUMBER':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input
              type="number"
              value={item[valueKey] ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                setItem({ ...item, [valueKey]: raw === '' ? '' : coerceNum(raw) })
              }}
              className="px-2 py-1 border rounded"
              disabled={!canWrite}
            />
          </label>
        )
      case 'LINK':
        return (
          <label className="grid gap-1">
            <span>{label}</span>
            <input
              type="url"
              value={item[valueKey] || ''}
              onChange={(e) => setItem({ ...item, [valueKey]: e.target.value })}
              className="px-2 py-1 border rounded"
              disabled={!canWrite}
            />
          </label>
        )
      case 'BOOL':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!item[valueKey]}
              onChange={(e) => setItem({ ...item, [valueKey]: e.target.checked })}
              disabled={!canWrite}
            />
            <span>{label}</span>
          </label>
        )
      case 'IMAGE':
        {
          const imageKey = `img${f.slot}`
          return (
            <div className="grid gap-1">
              <UploadImage
                label={label}
                value={item[imageKey] || ''}
                onChange={(u) => setItem({ ...item, [imageKey]: u })}
                inventoryId={id}
                canWrite={canWrite}
              />
            </div>
          )
        }
      default:
        return null
    }
  }

  return (
    <div className="grid max-w-3xl gap-3 p-4 mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xs">
          <b>ID:</b>{' '}
          <input
            className="w-full px-2 py-1 border rounded"
            value={item.customId || ''}
            onChange={(e) => setItem({ ...item, customId: e.target.value })}
            disabled={!canWrite}
          />
        </div>
        <button onClick={toggleLike} className="px-2 py-1 ml-3 border rounded">
          ❤️ {likes}
        </button>
      </div>

      {ordered.map((f, i) => (
        <div key={`${f.group}-${f.slot}-${i}`}>{inputFor(f)}</div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button onClick={save} className="px-3 py-1 border rounded" disabled={!canWrite}>
          Save
        </button>
        <button
          onClick={() => nav(`/inventories/${id}`)}
          className="px-3 py-1 border rounded"
        >
          Cancel
        </button>
        {canWrite && (
          <button
            onClick={deleteItem}
            className="px-3 py-1 text-red-600 border border-red-600 rounded"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
