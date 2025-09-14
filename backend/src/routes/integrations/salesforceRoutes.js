// backend/src/routes/integrations/salesforceRoutes.js
import { Router } from 'express'
import crypto from 'crypto'
import fetch from 'node-fetch'
import { requireAuth } from '../../middleware/auth.js'
import path from 'path'
import fs from 'fs'

const router = Router()

// env config (fallbacks)
const SF_LOGIN_URL = (process.env.SF_LOGIN_URL || 'https://login.salesforce.com').replace(/\/$/, '')
const CLIENT_ID = process.env.SF_CLIENT_ID
const CLIENT_SECRET = process.env.SF_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.SF_REDIRECT_URI || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/integrations/salesforce/oauth/callback` : 'https://inventoryapp-app.up.railway.app/api/integrations/salesforce/oauth/callback')

// Simple token store (demo). Replace with DB or secret manager in production.
const TOKEN_FILE = path.resolve('sf_tokens.json')
function readTokenStore() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return {}
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8') || '{}') || {}
  } catch (e) {
    return {}
  }
}
function saveTokenForUser(userId, payload) {
  const store = readTokenStore()
  store[userId] = { ...payload, savedAt: new Date().toISOString() }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(store, null, 2), 'utf8')
}

// helpers
function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function genVerifierAndChallenge() {
  const verifier = base64url(crypto.randomBytes(48))
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}
function genState() {
  return crypto.randomBytes(12).toString('hex')
}

// Public: start the OAuth PKCE flow
// GET /api/integrations/salesforce/oauth/start
// NOTE: requireAuth — this ties the resulting tokens to the currently logged-in user (cookie/session preserved)
router.get('/oauth/start', requireAuth, (req, res) => {
  try {
    if (!CLIENT_ID) return res.status(500).json({ error: 'SF_CLIENT_ID not configured' })

    const { verifier, challenge } = genVerifierAndChallenge()
    const state = genState()

    // Store verifier and state in secure, httpOnly cookies (short lived)
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes
      path: '/api/integrations/salesforce'
    }

    res.cookie('sf_pkce_verifier', verifier, cookieOpts)
    res.cookie('sf_oauth_state', state, cookieOpts)

    // Build authorize URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'api refresh_token',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    })

    const authUrl = `${SF_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`

    // Redirect the browser to Salesforce
    return res.redirect(authUrl)
  } catch (e) {
    console.error('[salesforce oauth/start]', e)
    return res.status(500).json({ error: 'SF_OAUTH_START_FAILED', message: e.message })
  }
})

// Callback to receive code from Salesforce and exchange it
// GET /api/integrations/salesforce/oauth/callback
router.get('/oauth/callback', requireAuth, async (req, res) => {
  try {
    const code = (req.query.code || '').toString()
    const returnedState = (req.query.state || '').toString()
    const cookieState = req.cookies?.sf_oauth_state
    const verifier = req.cookies?.sf_pkce_verifier

    if (!code) {
      return res.status(400).json({ error: 'MISSING_CODE' })
    }
    if (!returnedState || !cookieState || returnedState !== cookieState) {
      return res.status(400).json({ error: 'INVALID_OR_EXPIRED_STATE', message: 'State is missing, mismatched, or expired. Start the flow again.' })
    }
    if (!verifier) {
      return res.status(400).json({ error: 'MISSING_CODE_VERIFIER', message: 'PKCE verifier missing or expired. Start the flow again.' })
    }
    if (!CLIENT_ID) {
      return res.status(500).json({ error: 'SF_CLIENT_ID not configured' })
    }

    // Exchange authorization code for tokens
    const tokenUrl = `${SF_LOGIN_URL}/services/oauth2/token`
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    })
    // include client_secret if present (confidential client configured)
    if (CLIENT_SECRET) body.set('client_secret', CLIENT_SECRET)

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      console.error('[salesforce token exchange] status', tokenRes.status, text)
      // Clear cookies to avoid reuse of invalid state/verifier
      res.clearCookie('sf_pkce_verifier', { path: '/api/integrations/salesforce' })
      res.clearCookie('sf_oauth_state', { path: '/api/integrations/salesforce' })
      return res.status(500).json({ error: 'TOKEN_EXCHANGE_FAILED', status: tokenRes.status, body: text })
    }

    const tokenJson = await tokenRes.json()
    // tokenJson typically contains: access_token, refresh_token (if allowed), instance_url, id, issued_at, signature, etc.

    // Persist tokens for the current user (demo: write to sf_tokens.json)
    const userId = req.user?.id || 'anonymous'
    saveTokenForUser(userId, {
      access_token: tokenJson.access_token,
      refresh_token: tokenJson.refresh_token || null,
      instance_url: tokenJson.instance_url || null,
      scope: tokenJson.scope || null,
      id_token: tokenJson.id_token || null,
      raw: tokenJson
    })

    // wipe cookies used in the flow
    res.clearCookie('sf_pkce_verifier', { path: '/api/integrations/salesforce' })
    res.clearCookie('sf_oauth_state', { path: '/api/integrations/salesforce' })

    // Return a friendly HTML / JSON response
    // For browser convenience show a simple success page with instructions
    return res.send(`
      <html>
        <head><meta charset="utf-8"><title>Salesforce connected</title></head>
        <body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:720px;margin:40px;">
          <h2>Salesforce connected</h2>
          <p>Tokens were received and saved for user <strong>${userId}</strong>.</p>
          <p><b>Important:</b> A <code>refresh_token</code> will be present only if your Connected App and scope allow it. If a refresh token was returned it is stored to <code>sf_tokens.json</code> in your project root (demo only).</p>
          <pre style="background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto">${JSON.stringify({
            has_refresh_token: !!tokenJson.refresh_token,
            instance_url: tokenJson.instance_url
          }, null, 2)}</pre>
          <p>Close this tab and return to the app.</p>
        </body>
      </html>
    `)
  } catch (e) {
    console.error('[salesforce oauth/callback]', e)
    return res.status(500).json({ error: 'SF_OAUTH_CALLBACK_FAILED', message: e.message })
  }
})

/**
 * POST /api/integrations/salesforce/sync-self
 * (existing API kept for account/contact creation — uses sfClient.sfRequest)
 * NOTE: we keep your original sync-self route but it will expect a working SF_REFRESH_TOKEN
 * stored in environment or available to sfClient.
 */
import { sfRequest } from '../../utils/sfClient.js'
router.post('/sync-self', requireAuth, async (req, res) => {
  try {
    const me = req.user
    const { company = me.name || 'Individual', phone = '', title = '' } = req.body || {}

    const account = await sfRequest('/sobjects/Account', {
      method: 'POST',
      body: { Name: company, Phone: phone }
    })
    const contact = await sfRequest('/sobjects/Contact', {
      method: 'POST',
      body: {
        FirstName: me.name?.split(' ').slice(0, -1).join(' ') || me.name || '',
        LastName:  me.name?.split(' ').slice(-1).join(' ') || 'User',
        Email:     me.email,
        Title:     title || null,
        AccountId: account?.id
      }
    })

    res.json({ ok: true, accountId: account?.id, contactId: contact?.id })
  } catch (e) {
    console.error('[salesforce sync-self]', e)
    res.status(500).json({ error: 'SF_SYNC_FAILED', message: e.message })
  }
})

export default router
