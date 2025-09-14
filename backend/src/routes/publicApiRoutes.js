// backend/src/routes/publicApiRoutes.js
import { Router } from 'express'
import crypto from 'crypto'
import { prisma } from '../services/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { isOwnerOrAdmin } from '../utils/validators.js'

const router = Router()

// POST /api/inventories/:id/api-token  (owner/admin) => creates a new token
router.post('/inventories/:id/api-token', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })

  const token = crypto.randomBytes(24).toString('hex')
  // optionally invalidate previous tokens for this inventory
  await prisma.inventoryApiToken.deleteMany({ where: { inventoryId: inv.id } })
  const rec = await prisma.inventoryApiToken.create({
    data: { inventoryId: inv.id, token }
  })
  res.json({ ok: true, token: rec.token })
})

// GET /api/public/inventory-aggregate?token=...
router.get('/public/inventory-aggregate', async (req, res) => {
  try {
    const token = (req.query.token || '').toString().trim()
    if (!token) return res.status(400).json({ error: 'TOKEN_REQUIRED' })

    const it = await prisma.inventoryApiToken.findUnique({ where: { token }, include: { inventory: true } })
    if (!it) return res.status(404).json({ error: 'INVALID_TOKEN' })

    const id = it.inventoryId
    const inv = it.inventory

    // Fields meta
    const fields = await prisma.inventoryField.findMany({ where: { inventoryId: id } })
    const fieldDefs = fields.map(f => ({ title: f.title, type: f.type, slot: f.slot }))

    // Numeric aggregates
    const [nums] = await prisma.$queryRaw`
      SELECT
        AVG(num1) AS num1_avg, MIN(num1) AS num1_min, MAX(num1) AS num1_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num1) AS num1_med,
        AVG(num2) AS num2_avg, MIN(num2) AS num2_min, MAX(num2) AS num2_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num2) AS num2_med,
        AVG(num3) AS num3_avg, MIN(num3) AS num3_min, MAX(num3) AS num3_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num3) AS num3_med
      FROM "Item" WHERE "inventoryId" = ${id}
    `
    const num = (x) => (x == null ? null : Number(x))

    // Popular text values (top 5)
    const popular = await prisma.$queryRaw`
      WITH t AS (
        SELECT lower(trim(text1)) AS v FROM "Item" WHERE "inventoryId"=${id} AND text1 IS NOT NULL AND trim(text1) <> ''
        UNION ALL
        SELECT lower(trim(text2)) FROM "Item" WHERE "inventoryId"=${id} AND text2 IS NOT NULL AND trim(text2) <> ''
        UNION ALL
        SELECT lower(trim(text3)) FROM "Item" WHERE "inventoryId"=${id} AND text3 IS NOT NULL AND trim(text3) <> ''
      )
      SELECT v, COUNT(*) as c FROM t GROUP BY v ORDER BY c DESC, v ASC LIMIT 5
    `

    res.json({
      inventory: { id: inv.id, title: inv.title, description: inv.description },
      fields: fieldDefs,
      aggregates: {
        numbers: {
          num1: { min: num(nums?.num1_min), median: num(nums?.num1_med), avg: num(nums?.num1_avg), max: num(nums?.num1_max) },
          num2: { min: num(nums?.num2_min), median: num(nums?.num2_med), avg: num(nums?.num2_avg), max: num(nums?.num2_max) },
          num3: { min: num(nums?.num3_min), median: num(nums?.num3_med), avg: num(nums?.num3_avg), max: num(nums?.num3_max) },
        },
        popularText: (popular || []).map(r => ({ value: r.v, count: Number(r.c) })),
      }
    })
  } catch (e) {
    console.error('[public inventory-aggregate]', e)
    res.status(500).json({ error: 'AGG_FAILED' })
  }
})

export default router
