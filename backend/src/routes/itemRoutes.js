import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const router = Router()

// GET /api/search?q=...
router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  if (!q) return res.json({ items: [] })
  try {
    const like = `%${q}%`
    const rows = await prisma.$queryRaw`
      SELECT i.id, i."inventoryId", i."customId",
             inv.title AS "invTitle",
             i.text1 AS t1, i.text2 AS t2, i.text3 AS t3
      FROM "Item" i
      JOIN "Inventory" inv ON inv.id = i."inventoryId"
      WHERE (
        to_tsvector('simple',
          coalesce(i."customId",'') || ' ' ||
          coalesce(i.text1,'')      || ' ' ||
          coalesce(i.text2,'')      || ' ' ||
          coalesce(i.text3,'')      || ' ' ||
          coalesce(inv.title,'')
        ) @@ websearch_to_tsquery('simple', ${q})
        OR lower(i."customId") LIKE lower(${like})
        OR lower(inv.title)    LIKE lower(${like})
        OR lower(coalesce(i.text1,'')) LIKE lower(${like})
        OR lower(coalesce(i.text2,'')) LIKE lower(${like})
        OR lower(coalesce(i.text3,'')) LIKE lower(${like})
      )
      ORDER BY i."createdAt" DESC
      LIMIT 100
    `
    res.json({ items: rows })
  } catch (e) {
    console.error(e); res.status(500).json({ error:'Search failed' })
  }
})
export default router
