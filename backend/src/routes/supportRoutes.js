// backend/src/routes/supportRoutes.js
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { uploadSupportJson } from '../utils/storageUpload.js'
import { prisma } from '../services/prisma.js'

const router = Router()

// POST /api/support/ticket
// Body: { summary, priority, inventoryId, link }
router.post('/ticket', requireAuth, async (req, res) => {
  try {
    const { summary = '', priority = 'Average', inventoryId = '', link = '' } = req.body || {}
    if (!summary) return res.status(400).json({ error: 'SUMMARY_REQUIRED' })
    if (!['High','Average','Low'].includes(priority)) return res.status(400).json({ error: 'BAD_PRIORITY' })

    let inventoryTitle = ''
    if (inventoryId) {
      const inv = await prisma.inventory.findUnique({ where: { id: inventoryId } })
      if (inv) inventoryTitle = inv.title
    }

    // Admin emails: from env first, else all users with ADMIN role
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)

    if (adminEmails.length === 0) {
      const admins = await prisma.user.findMany({ where: { roles: { has: 'ADMIN' } }, select: { email: true } })
      admins.forEach(a => adminEmails.push(a.email))
    }

    const payload = {
      reportedBy: { id: req.user.id, name: req.user.name, email: req.user.email },
      inventory: inventoryTitle,
      link,
      priority,
      summary,
      admins: adminEmails
    }

    const uploaded = await uploadSupportJson({ filenamePrefix: 'support_ticket', json: payload })
    res.json({ ok: true, uploaded })
  } catch (e) {
    console.error('[support ticket]', e)
    res.status(500).json({ error: 'UPLOAD_FAILED', message: e.message })
  }
})

export default router
