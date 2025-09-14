// backend/src/routes/integrations/salesforceRoutes.js
import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { sfRequest } from '../../utils/sfClient.js'

const router = Router()

// POST /api/integrations/salesforce/sync-self
// Body: { company, phone, title } — creates Account + Contact linked to Account
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
    res.status(500).json({ error: 'SF_SYNC_FAILED', message: e.message })
  }
})

export default router
