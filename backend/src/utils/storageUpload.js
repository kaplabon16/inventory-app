import { Buffer } from 'node:buffer'

const PROVIDER = (process.env.SUPPORT_UPLOAD_PROVIDER || 'dropbox').toLowerCase()
const ROOT = process.env.SUPPORT_UPLOAD_FOLDER || '/SupportTickets'

function need(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

async function dropboxToken() {
  const key = need('DROPBOX_APP_KEY')
  const secret = need('DROPBOX_APP_SECRET')
  const refresh = need('DROPBOX_REFRESH_TOKEN')
  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
    }),
  })
  if (!res.ok) throw new Error(`Dropbox token refresh failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.access_token
}

async function dropboxUploadBytes({ path, bytes }) {
  const token = await dropboxToken()
  const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: { '.tag': 'add' },
        autorename: true,
        mute: false,
        strict_conflict: false,
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: bytes,
  })
  if (!res.ok) throw new Error(`Dropbox upload failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function ensureSharedLink(path) {
  const token = await dropboxToken()
  let res = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path,
      settings: { requested_visibility: 'public' },
    }),
  })

  if (res.status === 409) {
    // Already has one — list and reuse
    const list = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, direct_only: true }),
    })
    if (!list.ok) throw new Error(`Dropbox list_shared_links failed: ${list.status} ${await list.text()}`)
    const data = await list.json()
    const link = data?.links?.[0]?.url
    return link ? link.replace('?dl=0', '?dl=1') : null
  }

  if (!res.ok) throw new Error(`Dropbox create_shared_link failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return (data?.url || '').replace('?dl=0', '?dl=1')
}

/**
 * @param {{ filenamePrefix?: string, json: any }} param0
 */
export async function uploadSupportJson({ filenamePrefix = 'support_ticket', json }) {
  if (PROVIDER !== 'dropbox') throw new Error('Only Dropbox is supported by this build')
  const now = new Date()
  const y = String(now.getFullYear())
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const ts = now.toISOString().replace(/[:.]/g, '-')
  const name = `${filenamePrefix}-${ts}.json`
  const datedPath = `${ROOT}/${y}/${m}/${name}`.replace(/\/+/g, '/')
  const flatPath = `${ROOT}/${name}`.replace(/\/+/g, '/')

  // Do not mutate caller's object
  const safe = JSON.parse(JSON.stringify(json))
  const bytes = Buffer.from(JSON.stringify(safe, null, 2), 'utf8')

  // Upload to flat folder for simple triggers
  const metaFlat = await dropboxUploadBytes({ path: flatPath, bytes })
  let urlFlat = null
  try { urlFlat = await ensureSharedLink(metaFlat.path_lower || metaFlat.path_display) } catch { /* optional */ }

  // Upload to dated folder for archival
  const metaDated = await dropboxUploadBytes({ path: datedPath, bytes })
  let urlDated = null
  try { urlDated = await ensureSharedLink(metaDated.path_lower || metaDated.path_display) } catch { /* optional */ }

  return {
    provider: 'dropbox',
    path: metaDated.path_display,
    url: urlDated,
    path_flat: metaFlat.path_display,
    url_flat: urlFlat,
  }
}
