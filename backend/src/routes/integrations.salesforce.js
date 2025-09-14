// backend/src/routes/integrations.salesforce.js
import { Router } from 'express'
import fs from 'fs'
import path from 'path'

const router = Router()

const SF_LOGIN_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
const SF_CLIENT_ID = process.env.SF_CLIENT_ID
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET || ''
const SF_REDIRECT = process.env.SF_REDIRECT // must match Connected App
const TOKENS_PATH = path.join(process.cwd(), 'backend', 'sf_tokens.json')

// — helpers —
const readTokens = () => {
  try { return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8')) } catch { return null }
}
const writeTokens = (t) => {
  try { fs.writeFileSync(TOKENS_PATH, JSON.stringify(t, null, 2)) } catch {}
}
const form = (obj) => new URLSearchParams(obj)

// build OAuth URL
const authUrl = () => {
  const u = new URL(`${SF_LOGIN_URL}/services/oauth2/authorize`)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', SF_CLIENT_ID)
  u.searchParams.set('redirect_uri', SF_REDIRECT)
  u.searchParams.set('scope', 'refresh_token offline_access api id web')
  return u.toString()
}

// GET /api/integrations/salesforce/oauth/start
router.get('/oauth/start', (_req, res) => res.redirect(authUrl()))

// GET /api/integrations/salesforce/oauth/callback
router.get('/oauth/callback', async (req, res) => {
  try {
    const code = req.query.code
    if (!code) return res.status(400).send('Missing "code"')
    const r = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({
        grant_type: 'authorization_code',
        client_id: SF_CLIENT_ID,
        client_secret: SF_CLIENT_SECRET,
        redirect_uri: SF_REDIRECT,
        code
      })
    })
    if (!r.ok) {
      const text = await r.text()
      return res.status(500).send(`Exchange failed: ${r.status} ${text}`)
    }
    const tokens = await r.json() // { access_token, refresh_token, instance_url, ... }

    // dev-only: write to file so you can test locally
    if (process.env.NODE_ENV !== 'production') writeTokens(tokens)

    res.send(`
      <h3>Salesforce connected</h3>
      <p>Tokens ${process.env.NODE_ENV === 'production' ? 'received' : 'saved to backend/sf_tokens.json'}.</p>
      <p>You can close this tab.</p>
    `)
  } catch (e) {
    res.status(500).send('OAuth callback error')
  }
})

// GET /api/integrations/salesforce/sync-self
router.get('/sync-self', async (_req, res) => {
  try {
    const fileTokens = readTokens()
    const refresh_token = process.env.SF_REFRESH_TOKEN || fileTokens?.refresh_token
    if (!refresh_token) return res.status(400).json({ error: 'No refresh token configured. Connect Salesforce first.' })

    // refresh access token
    const r = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({
        grant_type: 'refresh_token',
        client_id: SF_CLIENT_ID,
        client_secret: SF_CLIENT_SECRET,
        refresh_token
      })
    })
    if (!r.ok) {
      const text = await r.text()
      return res.status(500).json({ error: `Refresh failed: ${r.status} ${text}` })
    }
    const refreshed = await r.json() // { access_token, instance_url, ... }
    if (process.env.NODE_ENV !== 'production') writeTokens({ ...(fileTokens||{}), ...refreshed })

    const instance = refreshed.instance_url || process.env.SF_INSTANCE_URL?.replace(/\/$/, '')
    if (!instance) return res.status(400).json({ error: 'Missing instance_url' })

    // whoami
    const meResp = await fetch(`${instance}/services/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${refreshed.access_token}` }
    })
    if (!meResp.ok) {
      const text = await meResp.text()
      return res.status(500).json({ error: `userinfo failed: ${meResp.status} ${text}` })
    }
    const me = await meResp.json()
    res.json({ ok: true, me })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

export default router
