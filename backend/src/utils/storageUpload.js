// backend/src/utils/storageUpload.js
import fetch from 'node-fetch'

function nowStamp() {
  const z = (n)=> String(n).padStart(2, '0')
  const d = new Date()
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}_${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}`
}

export async function uploadSupportJson({ filenamePrefix = 'ticket', json }) {
  const name = `${filenamePrefix}_${nowStamp()}.json`
  if (process.env.DROPBOX_ACCESS_TOKEN) {
    const token = process.env.DROPBOX_ACCESS_TOKEN
    const path = `/${process.env.DROPBOX_FOLDER || 'SupportTickets'}/${name}`
    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({ path, mode: 'add', autorename: true, mute: false })
      },
      body: Buffer.from(JSON.stringify(json, null, 2))
    })
    if (!res.ok) throw new Error(`Dropbox upload failed: ${res.status} ${await res.text()}`)
    return { provider: 'dropbox', path }
  }

  if (process.env.ONEDRIVE_ACCESS_TOKEN) {
    const token = process.env.ONEDRIVE_ACCESS_TOKEN
    const folder = process.env.ONEDRIVE_FOLDER || 'SupportTickets'
    // Using App Root special folder (requires appropriate app permission)
    const url = `https://graph.microsoft.com/v1.0/drive/special/approot:/${encodeURIComponent(folder)}/${encodeURIComponent(name)}:/content`
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(json)
    })
    if (!res.ok) throw new Error(`OneDrive upload failed: ${res.status} ${await res.text()}`)
    return { provider: 'onedrive', path: `${folder}/${name}` }
  }

  throw new Error('Neither DROPBOX_ACCESS_TOKEN nor ONEDRIVE_ACCESS_TOKEN is configured')
}
