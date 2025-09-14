// backend/src/routes/integrations/salesforceRoutes.js
import { Router } from 'express'
import fetch from 'node-fetch'
import crypto from 'crypto'
import { requireAuth } from '../../middleware/auth.js'
import { sfRequest } from '../../utils/sfClient.js'

const router = Router()

/**
 * Salesforce OAuth / PKCE flow + existing sync-self route.
 *
 * Endpoints added:
 *  GET  /oauth/start    -> redirects the signed-in user to Salesforce authorize (PKCE)
 *  GET  /oauth/callback -> callback that exchanges code for tokens and prints them for manual copy
 *
 * Existing route preserved:
 *  POST /sync-self      -> creates Account + Contact using sfRequest (requires env tokens)
 *
 * Notes:
 * - This file uses an in-memory pkceStore (Map). For production use, replace with Redis/DB/session-backed store.
 * - After a successful token exchange you'll get refresh_token + instance_url. Persist those securely (env, secrets manager or DB)
 *   and restart your backend so sfClient.js (which reads env vars) can use them.
 */

// Config
const SF_LOGIN_URL = (process.env.SF_LOGIN_URL || 'https://login.salesforce.com').replace(/\/$/, '')
const SF_CLIENT_ID = process.env.SF_CLIENT_ID
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET
// Allow explicit override or fall back to BACKEND_URL + callback path
const REDIRECT_URI = process.env.SF_REDIRECT_URI || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/integrations/salesforce/oauth/callback` : 'https://inventoryapp-app.up.railway.app/api/integrations/salesforce/oauth/callback')

// Simple in-memory store for PKCE: state -> { verifier, createdAt, userId }
// TTL & cleanup included. Suitable for dev/testing; use persistent store in production.
const pkceStore = new Map()
const PKCE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
function generateCodeVerifier() {
  return base64url(crypto.randomBytes(64))
}
function codeChallengeFromVerifier(verifier) {
  return base64url(crypto.createHash('sha256').update(verifier).digest())
}

// periodic cleanup of old states
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of pkceStore.entries()) {
    if (now - v.createdAt > PKCE_TTL_MS) pkceStore.delete(k)
  }
}, 60 * 1000)

/**
 * Start PKCE OAuth flow.
 * - requires the user to be authenticated in your app (requireAuth) so we can tie the resulting tokens to that user (optional).
 * - generates state + code_verifier, stores verifier server-side, redirects to Salesforce authorize endpoint with code_challenge.
 */
router.get('/oauth/start', requireAuth, (req, res) => {
  try {
    if (!SF_CLIENT_ID) return res.status(500).send('Server misconfigured: missing SF_CLIENT_ID')

    const state = crypto.randomBytes(16).toString('hex')
    const verifier = generateCodeVerifier()
    const challenge = codeChallengeFromVerifier(verifier)

    // store: tie to current user id (useful later if you want to persist tokens per-user)
    pkceStore.set(state, { verifier, createdAt: Date.now(), userId: req.user?.id || null })

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SF_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'api refresh_token',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    })

    const authUrl = `${SF_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`
    return res.redirect(authUrl)
  } catch (e) {
    console.error('[salesforce oauth start]', e)
    return res.status(500).send('Failed to start Salesforce OAuth')
  }
})

/**
 * OAuth callback. Exchanges code for tokens using the stored code_verifier.
 * On success it returns a small HTML page with the refresh_token and instance_url and instructions
 * to paste them into your server env (or persist them however you prefer).
 *
 * IMPORTANT: Persist refresh_token & instance_url securely, then set SF_REFRESH_TOKEN & SF_INSTANCE_URL (and SF_CLIENT_ID/SECRET)
 * in your server environment and restart the backend so that sfClient.js can use them.
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query || {}
    if (error) {
      console.error('[salesforce oauth cb] error:', error, error_description)
      return res.status(400).send(`<pre>OAuth error: ${String(error)} ${String(error_description || '')}</pre>`)
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'MISSING_CODE_OR_STATE' })
    }

    const rec = pkceStore.get(state)
    if (!rec) {
      return res.status(400).json({ error: 'INVALID_OR_EXPIRED_STATE' })
    }

    const code_verifier = rec.verifier
    // cleanup used state
    pkceStore.delete(state)

    // Exchange code for tokens
    const tokenUrl = `${SF_LOGIN_URL}/services/oauth2/token`
    const form = new URLSearchParams()
    form.set('grant_type', 'authorization_code')
    form.set('code', code)
    form.set('client_id', SF_CLIENT_ID)
    // include client_secret if present for web apps that have one; public clients omit it
    if (SF_CLIENT_SECRET) form.set('client_secret', SF_CLIENT_SECRET)
    form.set('redirect_uri', REDIRECT_URI)
    form.set('code_verifier', code_verifier)

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    })

    const txt = await tokenRes.text()
    if (!tokenRes.ok) {
      console.error('[salesforce token exchange] failed', tokenRes.status, txt)
      // Try to return the body to help debugging
      return res.status(500).send(`<pre>Token exchange failed (${tokenRes.status}):\n\n${txt}</pre>`)
    }

    const json = JSON.parse(txt)

    // json typically contains: access_token, refresh_token, instance_url, id, issued_at, signature, token_type
    const refreshToken = json.refresh_token
    const instanceUrl = json.instance_url

    // WARN: we do not persist tokens for you automatically. Persist securely!
    // Provide user-friendly HTML to copy tokens to server env or to instruct next steps.
    const html = `
      <html>
        <head><meta charset="utf-8"><title>Salesforce OAuth Complete</title></head>
        <body style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto, Arial;line-height:1.5;padding:24px;">
          <h2>Salesforce OAuth completed</h2>
          <p>Copy these values into your server environment (or persist to your secret store / DB) and then restart the backend.</p>

          <h3>Environment variables to set</h3>
          <pre style="background:#f4f4f4;padding:12px;border-radius:6px;">
SF_CLIENT_ID=${SF_CLIENT_ID || ''}
SF_CLIENT_SECRET=${SF_CLIENT_SECRET || ''}
SF_REFRESH_TOKEN=${refreshToken || '<none returned>'}
SF_INSTANCE_URL=${instanceUrl || '<none returned>'}
SF_LOGIN_URL=${SF_LOGIN_URL}
          </pre>

          <p><b>Notes:</b></p>
          <ul>
            <li>If <code>refresh_token</code> is missing, ensure your Connected App allows the <em>refresh_token</em> scope and the user granted offline access.</li>
            <li>For production usage persist these securely (secrets manager, database encrypted column, etc.).</li>
            <li>Once saved, restart your backend so <code>sfClient.js</code> (which reads process.env) can refresh access tokens and make API calls.</li>
          </ul>

          <h3>Raw response (for debugging)</h3>
          <pre style="background:#111;color:#cfc;padding:12px;border-radius:6px;white-space:pre-wrap;">${JSON.stringify(json, null, 2)}</pre>

          <p style="margin-top:16px;"><a href="/">Return to app</a></p>
        </body>
      </html>
    `
    return res.status(200).send(html)
  } catch (e) {
    console.error('[salesforce oauth callback error]', e)
    return res.status(500).send(`<pre>OAuth callback failed: ${String(e?.message || e)}</pre>`)
  }
})

/**
 * Existing sync-self route preserved.
 * Creates an Account and Contact in Salesforce using the sfRequest helper.
 * Requires that your server already has SF_CLIENT_ID, SF_CLIENT_SECRET (optional), SF_REFRESH_TOKEN and SF_INSTANCE_URL
 * configured so sfClient.js can refresh and produce an access token.
 */
router.post('/sync-self', requireAuth, async (req, res) => {
  try {
    const me = req.user
    const { company = me.name || 'Individual', phone = '', title = '' } = req.body || {}

    // 1) Create Account
    const account = await sfRequest('/sobjects/Account', {
      method: 'POST',
      body: { Name: company, Phone: phone }
    })

    // 2) Create Contact linked to the Account
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
    // if sfClient threw, it should contain helpful message; forward a concise response
    return res.status(500).json({ error: 'SF_SYNC_FAILED', message: e?.message || String(e) })
  }
})

export default router
