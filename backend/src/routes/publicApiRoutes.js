// backend/src/routes/publicApiRoutes.js
import { Router } from 'express'
import { prisma } from '../services/prisma.js'

const router = Router()

/**
 * GET /api/public/inventory-aggregate?token=...
 * Supports token via query or Authorization: Bearer <token>
 * Returns aggregated stats for an inventory identified by a valid API token.
 */
router.get('/public/inventory-aggregate', async (req, res) => {
  try {
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
    const token = (req.query.token || bearer || '').toString().trim()
    if (!token) return res.status(400).json({ ok: false, error: 'TOKEN_REQUIRED' })

    const apiTok = await prisma.inventoryApiToken.findUnique({ where: { token } })
    if (!apiTok) return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' })

    const id = apiTok.inventoryId
    const inv = await prisma.inventory.findUnique({
      where: { id },
      select: { id: true, title: true, description: true }
    })

    const count = await prisma.item.count({ where: { inventoryId: id } })
    const likes = await prisma.like.count({ where: { item: { inventoryId: id } } })

    const [nums] = await prisma.$queryRaw`
      SELECT
        AVG(num1) AS num1_avg, MIN(num1) AS num1_min, MAX(num1) AS num1_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num1) AS num1_med,
        AVG(num2) AS num2_avg, MIN(num2) AS num2_min, MAX(num2) AS num2_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num2) AS num2_med,
        AVG(num3) AS num3_avg, MIN(num3) AS num3_min, MAX(num3) AS num3_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num3) AS num3_med
      FROM "Item" WHERE "inventoryId" = ${id}
    `

    // Popular text values across all text fields
    const topText = await prisma.$queryRaw`
      WITH t AS (
        SELECT lower(trim(text1)) AS v FROM "Item" WHERE "inventoryId"=${id} AND text1 IS NOT NULL AND trim(text1) <> ''
        UNION ALL
        SELECT lower(trim(text2)) FROM "Item" WHERE "inventoryId"=${id} AND text2 IS NOT NULL AND trim(text2) <> ''
        UNION ALL
        SELECT lower(trim(text3)) FROM "Item" WHERE "inventoryId"=${id} AND text3 IS NOT NULL AND trim(text3) <> ''
      )
      SELECT v, COUNT(*) as c FROM t GROUP BY v ORDER BY c DESC, v ASC LIMIT 5
    `

    // Field definitions
    const fieldsRaw = await prisma.inventoryField.findMany({
      where: { inventoryId: id },
      orderBy: [{ displayOrder: 'asc' }],
      select: { id: true, type: true, slot: true, title: true, description: true }
    })
    const typeMap = { NUMBER: 'number', TEXT: 'text', MTEXT: 'text', LINK: 'link', BOOL: 'bool', IMAGE: 'image' }
    const fields = fieldsRaw.map(f => ({
      fieldId: f.id,
      title: f.title || `${f.type} ${f.slot}`,
      type: typeMap[f.type] || f.type.toLowerCase(),
      slot: f.slot,
      group: f.type,
      description: f.description || null,
    }))

    const num = (x) => (x == null ? null : Number(x))
    const payload = {
      ok: true,
      inventoryId: id,
      title: inv?.title || '',
      itemsCount: count,
      generatedAt: new Date().toISOString(),
      fields,
      // legacy keys for compatibility
      count,
      likes,
      numbers: {
        num1: { min: num(nums?.num1_min), median: num(nums?.num1_med), avg: num(nums?.num1_avg), max: num(nums?.num1_max) },
        num2: { min: num(nums?.num2_min), median: num(nums?.num2_med), avg: num(nums?.num2_avg), max: num(nums?.num2_max) },
        num3: { min: num(nums?.num3_min), median: num(nums?.num3_med), avg: num(nums?.num3_avg), max: num(nums?.num3_max) },
      },
      // Odoo-addon friendly shape
      inventory: { id, title: inv?.title || '', description: inv?.description || '' },
      aggregates: {
        numbers: {
          num1: { min: num(nums?.num1_min), median: num(nums?.num1_med), avg: num(nums?.num1_avg), max: num(nums?.num1_max) },
          num2: { min: num(nums?.num2_min), median: num(nums?.num2_med), avg: num(nums?.num2_avg), max: num(nums?.num2_max) },
          num3: { min: num(nums?.num3_min), median: num(nums?.num3_med), avg: num(nums?.num3_avg), max: num(nums?.num3_max) },
        },
        popularText: (topText || []).map(r => ({ value: r.v, count: Number(r.c) })),
      },
    }

    res.json(payload)
  } catch (e) {
    console.error('[public inventory-aggregate]', e)
    res.status(500).json({ ok: false, error: 'SERVER_ERROR' })
  }
})

export default router
