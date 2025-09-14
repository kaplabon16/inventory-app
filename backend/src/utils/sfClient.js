import fetch from 'node-fetch'

const API_VERSION = process.env.SF_API_VERSION || 'v61.0'

export async function sfRequest(path, { method = 'GET', body } = {}) {
  const base = (process.env.SF_INSTANCE_URL || '').replace(/\/+$/,'')
  const token = process.env.SF_ACCESS_TOKEN
  if (!base || !token) throw new Error('Salesforce is not configured')

  const url = `${base}/services/data/${API_VERSION}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const text = await res.text().catch(()=> '')
    throw new Error(`SF ${method} ${path} ${res.status} ${text}`)
  }
  return res.status === 204 ? null : res.json()
}
