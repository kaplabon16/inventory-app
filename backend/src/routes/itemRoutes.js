// backend/src/routes/itemRoutes.js
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const router = Router()

/**
 * Back-compat search endpoint:
 *   GET /api/items?q=term
 * Same result shape as /api/search:
 *   { items: [{ id, inventoryId, customId, invTitle, t1, t2, t3 }, ...] }
 *
 * If you don’t need this duplication, you can delete this file
 * and remove its mount in index.js.
 */
router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  if (!q) return res.json({ items: [] })

  try {
    const like = `%${q}%`
    // Parameterized raw SQL (safe): Postgres full-text search + LIKE fallback
    const rows = await prisma.$queryRaw`
      SELECT i.id,
             i."inventoryId",
             i."customId",
             inv.title AS "invTitle",
             i.text1 AS t1,
             i.text2 AS t2,
             i.text3 AS t3
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
    console.error('ITEMS_SEARCH_ERR', e)
    res.status(500).json({ error: 'Search failed' })
  }
})

/**
 * Optional helper:
 * GET /api/items/:id  → fetch a single item (read-only)
 * Not used by your current frontend, but harmless & handy.
 */
router.get('/:id', async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: { inventory: { select: { id: true, title: true } } }
    })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json(item)
  } catch (e) {
    res.status(500).json({ error: 'Failed to load item' })
  }
})

export default router
