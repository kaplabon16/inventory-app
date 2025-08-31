// frontend/src/components/UploadImage.jsx
import { useRef, useState } from "react"
import api from "../api/client"

export default function UploadImage({
  value,
  onChange,
  label = "Image",
  inventoryId = "",
  canWrite = false,
}) {
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [viewer, setViewer] = useState(false)

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
    setLoading(true)
    try {
      const form = new FormData()
      form.append("file", f)
      form.append("inventoryId", inventoryId)
      const { data } = await api.post("/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { inventoryId },
      })
      onChange?.(data.url)
    } catch (e) {
      setErr(e?.response?.data?.error || "Upload failed")
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  const pasteUrl = async () => {
    const u = prompt("Paste image URL")
    if (!u) return
    onChange?.(u.trim())
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
              disabled={loading || !inventoryId}
              title={!inventoryId ? "Open or create an inventory first" : ""}
            >
              {loading ? "Uploading…" : "Upload from device"}
            </button>

            <button
              type="button"
              onClick={pasteUrl}
              className="px-2 py-1 text-sm border rounded"
            >
              Paste URL
            </button>
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

      {value && (
        <>
          <div className="mt-1">
            {/* thumbnail */}
            <img
              src={value}
              alt=""
              className="border rounded max-h-40 cursor-zoom-in"
              onClick={() => setViewer(true)}
            />
          </div>

          {/* full-screen viewer */}
          {viewer && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
              onClick={() => setViewer(false)}
            >
              <button
                aria-label="Close"
                className="absolute top-4 right-4 px-3 py-1.5 bg-white text-black rounded"
                onClick={(e) => { e.stopPropagation(); setViewer(false) }}
              >
                ✕ Close
              </button>
              <img
                src={value}
                alt=""
                className="max-h-[90vh] max-w-[95vw] rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
