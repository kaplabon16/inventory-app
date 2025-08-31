import { useMemo } from "react"
import UploadImage from "./UploadImage"

/**
 * MultiImageUpload
 * Manages up to 3 images (array of urls).
 * Props:
 *  - images: string[] (length 0..3)
 *  - onChange: (array) => void
 *  - inventoryId
 *  - canWrite
 *  - label ("Images")
 *  - scope: "inventory" | "item"
 */
export default function MultiImageUpload({ images = [], onChange, inventoryId, canWrite, label = "Images", scope = "item" }) {
  const arr = useMemo(() => (Array.isArray(images) ? images.slice(0,3) : []), [images])
  const setAt = (i, v) => {
    const next = [...arr]
    next[i] = v || null
    onChange?.(next.filter(Boolean))
  }
  const addEmptySlot = () => {
    if (arr.length >= 3) return
    onChange?.([...arr, null])
  }
  const del = (i) => {
    const next = arr.filter((_,idx)=>idx!==i)
    onChange?.(next)
  }
  const swap = (i,j) => {
    const next = [...arr]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange?.(next)
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        {canWrite && arr.length < 3 && (
          <button className="px-2 py-1 text-sm border rounded" onClick={addEmptySlot}>
            Add image
          </button>
        )}
      </div>
      {arr.length === 0 && <div className="text-sm text-gray-500">No images</div>}
      <div className="grid gap-3 md:grid-cols-3">
        {arr.map((v, i) => (
          <div key={i} className="p-2 border rounded">
            <UploadImage
              value={v || ""}
              onChange={(u) => setAt(i, u)}
              label={`Image ${i+1}`}
              inventoryId={inventoryId}
              canWrite={canWrite}
              scope={scope}
            />
            {canWrite && (
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={i===0} onClick={()=>swap(i, i-1)}>←</button>
                  <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={i===arr.length-1} onClick={()=>swap(i, i+1)}>→</button>
                </div>
                <button className="px-2 py-1 text-sm border rounded" onClick={()=>del(i)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {arr.length >= 3 && <div className="text-sm text-gray-500">Max 3 images</div>}
    </div>
  )
}
