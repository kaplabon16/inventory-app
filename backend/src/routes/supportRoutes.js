// backend/src/routes/supportRoutes.js
import { Router } from 'express'
import crypto from 'crypto'
import { requireAuth } from '../middleware/auth.js'
import { uploadSupportJson } from '../utils/storageUpload.js'
import { prisma } from '../services/prisma.js'

const router = Router()

// POST /api/support/ticket
// Body: { summary, priority, inventoryId?, link? }
// Response: { ok: true, uploaded: { provider, path, url }, ticket: payload }
router.post('/ticket', requireAuth, async (req, res) => {
  try {
    let { summary = '', priority = 'Average', inventoryId = '', link = '' } = req.body || {}
    summary = String(summary || '').trim()
    priority = String(priority || 'Average').trim()

    if (!summary) return res.status(400).json({ ok: false, error: 'SUMMARY_REQUIRED' })
    if (!['High', 'Average', 'Low'].includes(priority)) {
      return res.status(400).json({ ok: false, error: 'BAD_PRIORITY' })
    }

    // Optional inventory lookup
    let inventory = null
    if (inventoryId) {
      const inv = await prisma.inventory.findUnique({ where: { id: String(inventoryId) } })
      if (inv) inventory = { id: inv.id, title: inv.title }
    }

    // Build strict payload schema
    const ticketId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const createdAt = new Date().toISOString()
    const payload = {
      reported_by: { id: req.user.id, name: req.user.name, email: req.user.email },
      inventory: inventory,
      link: String(link || ''),
      priority,
      summary,
      created_at: createdAt,
      id: ticketId,
    }

    const uploaded = await uploadSupportJson({ filenamePrefix: 'support_ticket', json: payload })
    res.json({ ok: true, uploaded, ticket: payload })
  } catch (e) {
    console.error('[support ticket]', e)
    res.status(500).json({ ok: false, error: e?.message || 'UPLOAD_FAILED' })
  }
})

export default router
