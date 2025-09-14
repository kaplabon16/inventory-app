// backend/src/routes/publicApiRoutes.js
import { Router } from 'express'
import { prisma } from '../services/prisma.js'

const router = Router()

/**
 * GET /api/public/inventory-aggregate?token=...
 * Returns lightweight aggregated stats for an inventory identified by a valid API token.
 */
router.get('/public/inventory-aggregate', async (req, res) => {
  try {
    const token = (req.query.token || '').toString().trim()
    if (!token) return res.status(400).json({ error: 'TOKEN_REQUIRED' })

    const apiTok = await prisma.inventoryApiToken.findUnique({ where: { token } })
    if (!apiTok) return res.status(401).json({ error: 'INVALID_TOKEN' })

    const id = apiTok.inventoryId

    const count = await prisma.item.count({ where: { inventoryId: id } })
    const likes = await prisma.like.count({ where: { item: { inventoryId: id } } })

    const [nums] = await prisma.$queryRaw`
      SELECT
        AVG(num1) AS num1_avg, MIN(num1) AS num1_min, MAX(num1) AS num1_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num1) AS num1_med,
        AVG(num2) AS num2_avg, MIN(num2) AS num2_min, MAX(num2) AS num2_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num2) AS num2_med,
        AVG(num3) AS num3_avg, MIN(num3) AS num3_min, MAX(num3) AS num3_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num3) AS num3_med
      FROM "Item" WHERE "inventoryId" = ${id}
    `

    const num = (x) => (x == null ? null : Number(x))

    res.json({
      ok: true,
      inventoryId: id,
      count,
      likes,
      numbers: {
        num1: { min: num(nums?.num1_min), median: num(nums?.num1_med), avg: num(nums?.num1_avg), max: num(nums?.num1_max) },
        num2: { min: num(nums?.num2_min), median: num(nums?.num2_med), avg: num(nums?.num2_avg), max: num(nums?.num2_max) },
        num3: { min: num(nums?.num3_min), median: num(nums?.num3_med), avg: num(nums?.num3_avg), max: num(nums?.num3_max) },
      },
      // Keep the payload tight for external consumers; add more if needed.
    })
  } catch (e) {
    console.error('[public inventory-aggregate]', e)
    res.status(500).json({ error: 'SERVER_ERROR' })
  }
})

export default router
