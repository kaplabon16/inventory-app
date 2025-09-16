import { useRef, useState } from "react"
import api from "../api/client"

export default function MultiImagePicker({
  label = "Images",
  inventoryId = "",
  value = [],        
  onChange, 
  canWrite = false,
  max = 3,
}) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const fileRef = useRef(null)
  const [viewer, setViewer] = useState(null)

  const pick = () => fileRef.current?.click()

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    if (!canWrite) return
    if (!inventoryId) { setErr("Missing inventoryId"); return }
    if (value.length >= max) { setErr(`Max ${max} images`); return }
    setErr(""); setLoading(true)
    try {
      const form = new FormData()
      form.append("file", f)
      form.append("inventoryId", inventoryId)
      const { data } = await api.post("/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { inventoryId },
      })
      const next = [...value, data.url].slice(0, max)
      onChange?.(next)
    } catch (e) {
      setErr(e?.response?.data?.error || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  const pasteUrl = async () => {
    if (!canWrite) return
    if (value.length >= max) { setErr(`Max ${max} images`); return }
    const u = prompt("Paste image URL")
    if (!u) return
    const url = u.trim()
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
      setErr("Invalid URL")
      return
    }
    onChange?.([...(value || []), url].slice(0, max))
  }

  const removeAt = (i) => {
    if (!canWrite) return
    const next = [...value]; next.splice(i,1); onChange?.(next)
  }


  const [dragIdx, setDragIdx] = useState(null)
  const onDragStart = (i) => () => setDragIdx(i)
  const onDragOver = (i) => (e) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === i) return
    const next = [...value]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(i, 0, moved)
    setDragIdx(i)
    onChange?.(next)
  }
  const onDragEnd = () => setDragIdx(null)

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
              disabled={loading || !inventoryId || value.length>=max}
              title={!inventoryId ? "Open or create an inventory first" : ""}
            >
              {loading ? "Uploading…" : "Upload"}
            </button>
            <button
              type="button"
              onClick={pasteUrl}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50"
              disabled={value.length>=max}
            >
              Paste URL
            </button>
            <span className="text-xs text-gray-500">{value.length}/{max}</span>
          </>
        )}
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />

    
      <div className="flex flex-wrap gap-2">
        {(value || []).map((u,i)=>(
          <div
            key={u+i}
            className="relative"
            draggable={canWrite}
            onDragStart={onDragStart(i)}
            onDragOver={onDragOver(i)}
            onDragEnd={onDragEnd}
          >
            <img
              src={u}
              alt=""
              onClick={()=>setViewer(u)}
              className="object-cover border rounded w-28 h-28 cursor-zoom-in"
            />
            {canWrite && (
              <button
                type="button"
                onClick={()=>removeAt(i)}
                className="absolute px-1 text-xs bg-white border rounded top-1 right-1"
                title="Remove"
              >✕</button>
            )}
          </div>
        ))}
      </div>

    
      {viewer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={()=>setViewer(null)}
          onKeyDown={(e)=>{ if (e.key==='Escape') setViewer(null) }}
          tabIndex={-1}
        >
          <button
            type="button"
            onClick={()=>setViewer(null)}
            className="absolute px-3 py-1 text-white border rounded right-4 top-4"
            title="Close"
          >✕ Close</button>
          <img
            src={viewer}
            alt=""
            className="max-w-[95vw] max-h-[85vh] rounded shadow-lg"
            onClick={(e)=>e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
