
import fetch from 'node-fetch'
import { getTokenForUser, saveTokenForUser } from './sfStore.js'

const {
  SF_LOGIN_URL = 'https://login.salesforce.com',
  SF_CLIENT_ID,
  SF_CLIENT_SECRET,
  SF_REFRESH_TOKEN,     
  SF_INSTANCE_URL,      
} = process.env

function baseUrl(u = SF_LOGIN_URL) {
  return String(u || '').replace(/\/$/, '')
}

async function refreshWith(userCtx) {
  
  const refresh_token = userCtx?.refresh_token || SF_REFRESH_TOKEN
  if (!refresh_token) {

    return null
  }

  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: SF_CLIENT_ID || '',
    refresh_token,
  })
  if (SF_CLIENT_SECRET) form.set('client_secret', SF_CLIENT_SECRET)

  const url = `${baseUrl()}/services/oauth2/token`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Salesforce token refresh failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token, 
    instance_url: data.instance_url || userCtx?.instance_url || SF_INSTANCE_URL,
    scope: data.scope || userCtx?.scope || null,
    raw: data,
  }
}


export function getSfClientFor(userId = null) {
  let cache = {
    access_token: null,
    instance_url: SF_INSTANCE_URL || null,
   
  }

  async function ensureToken() {
  
    const stored = userId ? getTokenForUser(userId) : null

  
    if (stored?.access_token) {
      cache.access_token = stored.access_token
      cache.instance_url = stored.instance_url || cache.instance_url
      return { ...cache, _source: 'user' }
    }

    
    if (stored?.refresh_token) {
      const next = await refreshWith(stored)
      cache.access_token = next.access_token
      cache.instance_url = next.instance_url
     
      saveTokenForUser(userId, next)
      return { ...cache, _source: 'user_refreshed' }
    }

   
    if (SF_REFRESH_TOKEN) {
      const next = await refreshWith({ refresh_token: SF_REFRESH_TOKEN, instance_url: SF_INSTANCE_URL })
      cache.access_token = next.access_token
      cache.instance_url = next.instance_url
      return { ...cache, _source: 'env_refreshed' }
    }

    throw new Error('No Salesforce token available. Connect Salesforce or set SF_REFRESH_TOKEN.')
  }

  async function sfRequest(path, { method = 'GET', headers = {}, body } = {}) {
    const tok = await ensureToken()
    if (!tok.instance_url) {
      throw new Error('Salesforce instance URL is unknown. Reconnect Salesforce or set SF_INSTANCE_URL.')
    }

    const base = `${tok.instance_url.replace(/\/$/, '')}/services/data/v59.0`
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`

    const h = {
      Authorization: `Bearer ${tok.access_token}`,
      'Content-Type': 'application/json',
      ...headers,
    }

    const opts = { method, headers: h }
    if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body)

    const res = await fetch(url, opts)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SF request failed ${res.status}: ${text}`)
    }
    const ct = res.headers.get('content-type') || ''
    return ct.includes('application/json') ? res.json() : res.text()
  }

  return { sfRequest }
}

export default { getSfClientFor }
