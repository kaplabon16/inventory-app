import { Router } from 'express'
import { prisma } from '../services/prisma.js'
import { requireAuthOptional } from '../middleware/auth.js'

const router = Router()

// List categories (optional helper endpoint the UI may call)
router.get('/categories', async (_req, res) => {
  const cats = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  }).catch(() => [])
  res.json(cats)
})

/**
 * GET /api/inventories
 * Supports:
 *  - ?take=10&skip=0
 *  - ?mine=1            -> only inventories I own
 *  - ?canWrite=1        -> inventories I can edit (owner or have write access)
 *  - default (no flags) -> public + mine + canWrite (union)
 * Always returns 200 with [] when empty (never 404).
 */
router.get('/', requireAuthOptional, async (req, res) => {
  const userId = req.user?.id || null

  // pagination
  let take = Number(req.query.take ?? 10)
  let skip = Number(req.query.skip ?? 0)
  if (!Number.isFinite(take) || take <= 0 || take > 100) take = 10
  if (!Number.isFinite(skip) || skip < 0) skip = 0

  const mine = req.query.mine === '1' || req.query.mine === 'true'
  const canWrite = req.query.canWrite === '1' || req.query.canWrite === 'true'

  // where clause
  let where

  if (mine && userId) {
    where = { ownerId: userId }
  } else if (canWrite && userId) {
    // owner OR explicit write access
    where = {
      OR: [
        { ownerId: userId },
        { accesses: { some: { userId, canWrite: true } } }
      ]
    }
  } else {
    // default: public plus mine/canWrite if logged in
    where = {
      OR: [
        { isPublic: true },
        ...(userId ? [{ ownerId: userId }] : []),
        ...(userId ? [{ accesses: { some: { userId } } }] : [])
      ]
    }
  }

  const [rows, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      take,
      skip,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
        category: { select: { id: true, name: true } },
        tags: { select: { name: true } }
      }
    }),
    prisma.inventory.count({ where })
  ])

  // shape to what the UI expects
  const data = rows.map(r => ({
    id: r.id,
    title: r.title,
    owner: r.owner ? (r.owner.name || r.owner.email) : '—',
    ownerId: r.owner?.id ?? null,
    category: r.category?.name ?? null,
    tags: r.tags.map(t => t.name),
    items: r._count.items,
    updatedAt: r.updatedAt
  }))

  res.json({ data, total, take, skip })
})

// (Optional) single record fetch used by detail page
router.get('/:id', requireAuthOptional, async (req, res) => {
  const { id } = req.params
  const inv = await prisma.inventory.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { items: true } },
      category: { select: { id: true, name: true } },
      fields: true,
      tags: { select: { name: true } }
    }
  })
  if (!inv) return res.status(404).json({ error: 'Inventory not found' })

  // basic read-permission guard: public OR mine OR has access
  if (
    !inv.isPublic &&
    req.user?.id !== inv.ownerId &&
    !(await prisma.inventoryAccess.findFirst({ where: { inventoryId: id, userId: req.user?.id } }))
  ) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.json(inv)
})

export default router
