import { useRef, useState } from "react"
import api from "../api/client"

export default function UploadImage({
  value,
  onChange,
  label = "Image",
  inventoryId = "" // ✅ NEW: required by backend
}) {
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")

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
      form.append("inventoryId", inventoryId) // ✅ include id in multipart
      const { data } = await api.post("/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { inventoryId } // ✅ and as query, either one will be read
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

        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600"
          >
            open
          </a>
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
        <div className="mt-1">
          <img src={value} alt="" className="border rounded max-h-40" />
        </div>
      )}
    </div>
  )
}
