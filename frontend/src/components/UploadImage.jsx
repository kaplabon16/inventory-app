import { useRef, useState } from "react"
import api from "../api/client"

function ImageViewer({ src, onClose }) {
  if (!src) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <button className="absolute top-4 right-4 px-3 py-1.5 rounded bg-white text-black" onClick={onClose}>✕ Close</button>
      <img src={src} alt="" className="max-w-[92vw] max-h-[88vh] rounded shadow" onClick={(e)=>e.stopPropagation()}/>
    </div>
  )
}

/**
 * Multi-image uploader (max=3 by default)
 * props:
 *   images: string[]
 *   onChange(next: string[])
 *   inventoryId: string
 *   label?: string
 *   canWrite?: boolean
 *   max?: number
 */
export default function UploadImages({ images=[], onChange, inventoryId="", label="Images", canWrite=false, max=3 }) {
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [viewer, setViewer] = useState("")

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
    if (images.length >= max) {
      setErr(`Max ${max} images`)
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
      onChange?.([...(images || []), data.url])
    } catch (e) {
      setErr(e?.response?.data?.error || "Upload failed")
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  const pasteUrl = async () => {
    if (images.length >= max) { setErr(`Max ${max} images`); return }
    const u = prompt("Paste image URL")
    if (!u) return
    onChange?.([...(images || []), u.trim()])
  }

  const removeAt = (i) => onChange?.((images || []).filter((_, idx) => idx !== i))

  // simple HTML5 drag reorder
  const [dragIdx, setDragIdx] = useState(-1)
  const onDragStart = (i) => () => setDragIdx(i)
  const onDragOver = (i) => (e) => {
    e.preventDefault()
    if (dragIdx === -1 || dragIdx === i) return
    const arr = [...images]
    const [m] = arr.splice(dragIdx, 1)
    arr.splice(i, 0, m)
    setDragIdx(i)
    onChange?.(arr)
  }
  const onDragEnd = () => setDragIdx(-1)

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
              disabled={loading || !inventoryId || (images.length >= max)}
              title={!inventoryId ? "Open or create an inventory first" : ""}
            >
              {loading ? "Uploading…" : "Upload"}
            </button>

            <button
              type="button"
              onClick={pasteUrl}
              className="px-2 py-1 text-sm border rounded disabled:opacity-50"
              disabled={images.length >= max}
            >
              Paste URL
            </button>

            <span className="ml-1 text-xs text-gray-500">{images.length}/{max}</span>
          </>
        )}
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="flex flex-wrap gap-2">
        {(images || []).map((src, i) => (
          <div key={i}
               className="relative p-1 border rounded"
               draggable={canWrite}
               onDragStart={onDragStart(i)}
               onDragOver={onDragOver(i)}
               onDragEnd={onDragEnd}
               title={canWrite ? "Drag to reorder" : ""}
          >
            <img
              src={src}
              alt=""
              className="object-cover rounded h-28 w-28 cursor-zoom-in"
              onClick={()=>setViewer(src)}
            />
            {canWrite && (
              <button
                type="button"
                className="absolute w-6 h-6 bg-white border rounded-full -top-2 -right-2"
                onClick={()=>removeAt(i)}
                aria-label="Remove image"
                title="Remove"
              >✕</button>
            )}
          </div>
        ))}
      </div>

      <ImageViewer src={viewer} onClose={()=>setViewer("")}/>
    </div>
  )
}
