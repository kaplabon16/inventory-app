
import { Router } from 'express'
import crypto from 'crypto'
import fetch from 'node-fetch'
import { requireAuth } from '../../middleware/auth.js'
import { getSfClientFor } from '../../utils/sfClient.js'
import { saveTokenForUser } from '../../utils/sfStore.js'

const router = Router()

const SF_LOGIN_URL = (process.env.SF_LOGIN_URL || 'https://login.salesforce.com').replace(/\/$/, '')
const CLIENT_ID = process.env.SF_CLIENT_ID
const CLIENT_SECRET = process.env.SF_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.SF_REDIRECT_URI
  || (process.env.BACKEND_URL
      ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/integrations/salesforce/oauth/callback`
      : 'https://inventoryapp-app.up.railway.app/api/integrations/salesforce/oauth/callback')


const flowStore = new Map()
const FLOW_TTL_MS = 5 * 60 * 1000
const base64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const genVerifierAndChallenge = () => {
  const verifier = base64url(crypto.randomBytes(48))
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}
const genState = () => crypto.randomBytes(16).toString('hex')
function storeFlow(state, obj) { flowStore.set(state, { ...obj, expiresAt: Date.now() + FLOW_TTL_MS }) }
function getAndRemoveFlow(state) {
  const v = flowStore.get(state); if (!v) return null
  if (Date.now() > v.expiresAt) { flowStore.delete(state); return null }
  flowStore.delete(state); return v
}
setInterval(() => { const now = Date.now(); for (const [k, v] of flowStore) if (v.expiresAt < now) flowStore.delete(k) }, 60_000)


router.get('/oauth/start', requireAuth, (req, res) => {
  if (!CLIENT_ID) return res.status(500).json({ error: 'SF_CLIENT_ID not configured' })
  const { verifier, challenge } = genVerifierAndChallenge()
  const state = genState()
  storeFlow(state, { userId: req.user.id, verifier })
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'api refresh_token offline_access',
    prompt: 'consent',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  })
  res.redirect(`${SF_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`)
})


router.get('/oauth/callback', async (req, res) => {
  try {
    const code = String(req.query.code || '')
    const returnedState = String(req.query.state || '')
    if (!code || !returnedState) return res.status(400).send('Invalid OAuth response')

    const flow = getAndRemoveFlow(returnedState)
    if (!flow?.verifier || !flow?.userId) return res.status(400).send('State expired. Start again.')

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code_verifier: flow.verifier,
    })
    if (CLIENT_SECRET) form.set('client_secret', CLIENT_SECRET)

    const tokenRes = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      console.error('[SF token exchange]', tokenRes.status, text)
      return res.status(500).send('Token exchange failed')
    }

    const json = await tokenRes.json()

    saveTokenForUser(flow.userId, {
      access_token: json.access_token,
      refresh_token: json.refresh_token || null,   // may be null if app policy disallows
      instance_url: json.instance_url || null,
      scope: json.scope || null,
      id_token: json.id_token || null,
      raw: json,
    })

    res.send(`
      <html><body style="font-family:system-ui;max-width:720px;margin:40px">
      <h2>Salesforce connected</h2>
      <p>Linked to user <b>${flow.userId}</b>.</p>
      <pre>${JSON.stringify({ has_refresh_token: !!json.refresh_token, instance_url: json.instance_url }, null, 2)}</pre>
      <p>You can close this tab.</p>
      </body></html>
    `)
  } catch (e) {
    console.error('[SF oauth/callback]', e)
    res.status(500).send('Salesforce OAuth callback failed')
  }
})


router.post('/sync-self', requireAuth, async (req, res) => {
  try {
    const me = req.user
    const { company = me.name || 'Individual', phone = '', title = '' } = req.body || {}
    const sf = getSfClientFor(me.id)

    const account = await sf.sfRequest('/sobjects/Account', {
      method: 'POST',
      body: { Name: company, Phone: phone }
    })
    const contact = await sf.sfRequest('/sobjects/Contact', {
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
