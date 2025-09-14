// Salesforce helper using Node 18+ global fetch (no node-fetch)
const LOGIN = process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
function need(k) { const v = process.env[k]; if (!v) throw new Error(`Missing env ${k}`); return v }

let cached = { access_token: null, instance_url: null, exp: 0 }

async function refreshToken() {
  const res = await fetch(`${LOGIN}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: need('SF_CLIENT_ID'),
      client_secret: need('SF_CLIENT_SECRET'),
      refresh_token: need('SF_REFRESH_TOKEN'),
    }),
  })
  if (!res.ok) throw new Error(`SF token refresh failed: ${res.status} ${await res.text()}`)
  const j = await res.json()
  cached = {
    access_token: j.access_token,
    instance_url: j.instance_url || process.env.SF_INSTANCE_URL || '',
    exp: Date.now() + 55 * 60 * 1000, // ~55m
  }
}

async function ensureAuth() {
  if (!cached.access_token || Date.now() > cached.exp) await refreshToken()
  if (!cached.instance_url) cached.instance_url = need('SF_INSTANCE_URL') // fallback if not in token response
}

export async function sfRequest(path, { method = 'GET', body } = {}) {
  await ensureAuth()
  const url = `${cached.instance_url}/services/data/v60.0${path}`
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${cached.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`SF request failed ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}
ƒ