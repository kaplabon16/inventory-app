// frontend/src/components/MultiImagePicker.jsx
import { useMemo, useRef, useState } from "react"
import api from "../api/client"

function Thumb({ src, idx, onRemove, onView, draggable, onDragStart, onDragOver, onDrop }) {
  return (
    <div
      className="relative p-1 border rounded"
      draggable={draggable}
      onDragStart={(e)=>onDragStart(e, idx)}
      onDragOver={(e)=>{e.preventDefault(); onDragOver(idx)}}
      onDrop={(e)=>onDrop(e, idx)}
    >
      <img
        src={src}
        alt=""
        className="object-cover w-24 h-24 rounded cursor-zoom-in"
        onClick={()=>onView(src)}
      />
      <button
        type="button"
        className="absolute px-1 text-black rounded top-1 right-1 bg-white/90"
        onClick={(e)=>{ e.stopPropagation(); onRemove(idx) }}
        aria-label="Remove"
        title="Remove"
      >
        ✕
      </button>
    </div>
  )
}

export default function MultiImagePicker({
  values = [],              // array of urls (length ≤ 3)
  onChange,
  label = "Images",
  inventoryId = "",
  canWrite = false,
  max = 3
}) {
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [viewer, setViewer] = useState(null)
  const list = useMemo(()=> (Array.isArray(values) ? values.filter(Boolean) : []).slice(0, max), [values, max])

  const pick = () => fileRef.current?.click()

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setErr("")
    if (!inventoryId) {
      setErr("Upload failed: missing inventoryId")
      e.target.value = ""
      return
    }
    if (list.length >= max) {
      setErr(`Max ${max} images reached`)
      e.target.value = ""
      return
    }
    setLoading(true)
    try {
      const form = new FormData()
      form.append("file", f)
      form.append("inventoryId", inventoryId)
      const { data } = await api.post("/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { inventoryId },
      })
      const next = [...list, data.url].slice(0, max)
      onChange?.(next)
    } catch (e) {
      setErr(e?.response?.data?.error || "Upload failed")
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  const pasteUrl = async () => {
    if (list.length >= max) { setErr(`Max ${max} images reached`); return }
    const u = prompt("Paste image URL")
    if (!u) return
    onChange?.([...list, u.trim()].slice(0, max))
  }

  const removeAt = (i) => {
    const next = list.filter((_,idx)=>idx!==i)
    onChange?.(next)
  }

  // Drag & drop reorder (HTML5)
  const dragIndexRef = useRef(null)
  const onDragStart = (_e, from) => { dragIndexRef.current = from }
  const onDragOver = (_to) => {}
  const onDrop = (_e, to) => {
    const from = dragIndexRef.current
    dragIndexRef.current = null
    if (from===null || from===to) return
    const next = [...list]
    const [mv] = next.splice(from, 1)
    next.splice(to, 0, mv)
    onChange?.(next)
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
        {canWrite && (
          <>
            <button
              type="button"
              onClick={pick}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50"
              disabled={loading || !inventoryId || list.length>=max}
              title={!inventoryId ? "Open or create an inventory first" : ""}
            >
              {loading ? "Uploading…" : "Upload"}
            </button>
            <button type="button" onClick={pasteUrl} className="px-2 py-1 text-sm border rounded" disabled={list.length>=max}>
              Paste URL
            </button>
            <span className="text-xs text-gray-500">{list.length}/{max}</span>
          </>
        )}
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {list.length>0 ? (
        <div className="flex flex-wrap gap-2">
          {list.map((src,idx)=>(
            <Thumb
              key={idx}
              src={src}
              idx={idx}
              onRemove={removeAt}
              onView={setViewer}
              draggable={canWrite}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No images</div>
      )}

      {/* Viewer */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={()=>setViewer(null)}>
          <button
            aria-label="Close"
            className="absolute top-4 right-4 px-3 py-1.5 bg-white text-black rounded"
            onClick={(e)=>{ e.stopPropagation(); setViewer(null) }}
          >
            ✕ Close
          </button>
          <img src={viewer} alt="" className="max-h-[90vh] max-w-[95vw] rounded" onClick={(e)=>e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
