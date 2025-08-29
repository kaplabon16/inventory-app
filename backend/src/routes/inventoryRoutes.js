import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { isOwnerOrAdmin, canWriteInventory } from '../utils/validators.js'
import { generateCustomId } from '../utils/customId.js'

const prisma = new PrismaClient()
const router = Router()

// Soft-attach user for public endpoints that can benefit from it
router.use(optionalAuth)

/* --------------------------------
 * LISTS
 * -------------------------------- */

// Recent public inventories for the home "cards"
router.get('/public-recent', async (_req, res) => {
  const list = await prisma.inventory.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 8,
    include: {
      _count: { select: { items: true } },
      owner: { select: { name: true } },
      category: { select: { name: true } },
      tags: { include: { tag: true } }
    }
  })
  res.json(list.map(x => ({
    id: x.id,
    title: x.title,
    description: x.description?.slice(0, 160) || '',
    categoryName: x.category?.name || 'Other',
    ownerName: x.owner?.name || '—',
    itemsCount: x._count.items,
    imageUrl: x.imageUrl || null,
    tags: (x.tags || []).map(t => t.tag.name),
    updatedAt: x.updatedAt
  })))
})

// Generic list (supports ?mine=1 and ?canWrite=1)
router.get('/', async (req, res) => {
  const { mine, canWrite } = req.query
  const userId = req.user?.id

  if (mine) {
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const list = await prisma.inventory.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: 'desc' }
    })
    return res.json(list.map(x => ({ id: x.id, title: x.title, itemsCount: x._count.items })))
  }

  if (canWrite) {
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const acc = await prisma.inventoryAccess.findMany({ where: { userId, canWrite: true } })
    const invs = await prisma.inventory.findMany({
      where: { id: { in: acc.map(a => a.inventoryId) } },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: 'desc' }
    })
    return res.json(invs.map(x => ({ id: x.id, title: x.title, itemsCount: x._count.items })))
  }

  const list = await prisma.inventory.findMany({
    include: { _count: { select: { items: true } }, owner: { select: { name: true } }, category: true },
    orderBy: { updatedAt: 'desc' }
  })
  res.json(list.map(x => ({
    id: x.id, title: x.title, categoryName: x.category.name, ownerName: x.owner.name, itemsCount: x._count.items
  })))
})

/* --------------------------------
 * CREATE / READ / UPDATE / DELETE
 * -------------------------------- */

router.post('/', requireAuth, async (req, res) => {
  const { title, description, categoryId } = req.body
  const cat = await prisma.category.findUnique({ where: { id: Number(categoryId || 0) } })
  const defaultCat = await prisma.category.findFirst({ where: { name: 'Other' } })
  const inv = await prisma.inventory.create({
    data: {
      title: (title || 'New Inventory').trim() || 'New Inventory',
      description: description || '',
      ownerId: req.user.id,
      categoryId: cat?.id || defaultCat?.id || 1
    }
  })
  res.json(inv)
})

router.get('/:id', async (req, res) => {
  const inv = await prisma.inventory.findUnique({
    where: { id: req.params.id },
    include: { category: true, owner: { select: { id: true } } }
  })
  if (!inv) return res.status(404).json({ error: 'Not found' })

  const fields = await prisma.inventoryField.findMany({ where: { inventoryId: inv.id } })
  const elems = await prisma.customIdElement.findMany({ where: { inventoryId: inv.id }, orderBy: { order: 'asc' } })

  const pack = (type) => [1, 2, 3].map(slot => {
    const x = fields.find(f => f.type === type && f.slot === slot)
    return { title: x?.title || '', desc: x?.description || '', show: !!x?.showInTable }
  })

  // Items + like counts in ONE roundtrip
  const items = await prisma.item.findMany({
    where: { inventoryId: inv.id },
    orderBy: { createdAt: 'desc' }, take: 100,
    select: {
      id: true, customId: true, createdAt: true, updatedAt: true,
      createdById: true,
      text1: true, text2: true, text3: true,
      num1: true, num2: true, num3: true,
      bool1: true, bool2: true, bool3: true,
    }
  })
  const likeAgg = await prisma.like.groupBy({
    by: ['itemId'],
    _count: { itemId: true },
    where: { item: { inventoryId: inv.id } }
  })
  const likeMap = new Map(likeAgg.map(r => [r.itemId, r._count.itemId]))
  const itemsWithLikes = items.map(it => ({ ...it, likesCount: likeMap.get(it.id) || 0 }))

  const canEdit = !!(req.user?.id && (req.user.roles?.includes('ADMIN') || req.user.id === inv.ownerId))

  res.json({
    inventory: inv,
    canEdit,
    fields: { text: pack('TEXT'), mtext: pack('MTEXT'), num: pack('NUMBER'), link: pack('LINK'), bool: pack('BOOL') },
    elements: elems,
    items: itemsWithLikes
  })
})

router.put('/:id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })

  const { version, title, description, publicWrite, categoryId, imageUrl } = req.body
  const v = Number.isFinite(+version) ? +version : inv.version
  const data = {
    title: typeof title === 'string' ? title : inv.title,
    description: typeof description === 'string' ? description : inv.description,
    publicWrite: !!publicWrite,
    imageUrl: typeof imageUrl === 'string' ? imageUrl : inv.imageUrl
  }

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: Number(categoryId) } })
    if (cat) data.categoryId = cat.id
  }

  const result = await prisma.inventory.updateMany({
    where: { id: inv.id, version: v },
    data: { ...data, version: { increment: 1 } }
  })
  if (result.count === 0) return res.status(409).json({ error: 'Version conflict' })
  const updated = await prisma.inventory.findUnique({ where: { id: inv.id } })
  res.json(updated)
})

router.delete('/:id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  await prisma.inventory.delete({ where: { id: inv.id } })
  res.json({ ok: true })
})

/* --------------------------------
 * FIELDS (designer)
 * -------------------------------- */

router.post('/:id/fields', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  const { fields } = req.body

  const tx = []

  // Upsert by slot; slot==index+1. Dragging simply changes array order.
  const upsert = (type, slot, { title, desc, show }) => prisma.inventoryField.upsert({
    where: { inventoryId_type_slot: { inventoryId: inv.id, type, slot } },
    update: { title, description: desc, showInTable: !!show },
    create: { inventoryId: inv.id, type, slot, title, description: desc, showInTable: !!show }
  })

  ;['text', 'mtext', 'num', 'link', 'bool'].forEach(group => {
    const type = { text: 'TEXT', mtext: 'MTEXT', num: 'NUMBER', link: 'LINK', bool: 'BOOL' }[group]
    fields[group].forEach((cfg, idx) => tx.push(upsert(type, idx + 1, cfg)))
  })

  await prisma.$transaction(tx)
  res.json({ ok: true, message: 'Saved field config' })
})

/* --------------------------------
 * CUSTOM ID
 * -------------------------------- */

router.post('/:id/custom-id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  const { elements = [] } = req.body
  await prisma.customIdElement.deleteMany({ where: { inventoryId: inv.id } })
  if (elements.length) {
    await prisma.customIdElement.createMany({
      data: elements.map(e => ({ inventoryId: inv.id, order: e.order, type: e.type, param: e.param || null }))
    })
  }
  res.json({ ok: true, message: 'Saved ID pattern' })
})

/* --------------------------------
 * ITEMS (CRUD subset here)
 * -------------------------------- */

async function getInvWithAccess(id) {
  const [inv, access] = await Promise.all([
    prisma.inventory.findUnique({ where: { id } }),
    prisma.inventoryAccess.findMany({ where: { inventoryId: id } })
  ])
  return { inv, access }
}

router.post('/:id/items', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })

  const customId = await generateCustomId(inv.id)
  const item = await prisma.item.create({
    data: { inventoryId: inv.id, customId, createdById: req.user.id }
  })
  res.json(item)
})

router.get('/:id/items/:itemId', requireAuth, async (req, res) => {
  const { inv } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const item = await prisma.item.findUnique({
    where: { id: req.params.itemId },
    include: { _count: { select: { likes: true } } }
  })
  if (!item || item.inventoryId !== inv.id) return res.status(404).json({ error: 'Item not found' })

  const fields = await prisma.inventoryField.findMany({ where: { inventoryId: inv.id } })
  const pack = (type) => [1, 2, 3].map(slot => {
    const x = fields.find(f => f.type === type && f.slot === slot)
    return { title: x?.title || '', desc: x?.description || '', show: !!x?.showInTable }
  })

  // Whether current user liked
  const liked = req.user
    ? !!(await prisma.like.findUnique({ where: { itemId_userId: { itemId: item.id, userId: req.user.id } } }))
    : false

  res.json({
    item,
    liked,
    fields: { text: pack('TEXT'), mtext: pack('MTEXT'), num: pack('NUMBER'), link: pack('LINK'), bool: pack('BOOL') }
  })
})

router.put('/:id/items/:itemId', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })

  const data = (({ customId, ...rest }) => ({ ...rest, customId: customId || undefined }))(req.body || {})
  const updated = await prisma.item.update({ where: { id: req.params.itemId }, data })
  res.json(updated)
})

router.delete('/:id/items/:itemId', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })

  await prisma.item.delete({ where: { id: req.params.itemId } })
  res.json({ ok: true })
})

router.post('/:id/items/bulk-delete', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })
  const { ids = [] } = req.body || {}
  if (!Array.isArray(ids) || !ids.length) return res.json({ ok: true, deleted: 0 })
  const r = await prisma.item.deleteMany({ where: { id: { in: ids }, inventoryId: inv.id } })
  res.json({ ok: true, deleted: r.count })
})

/* --------------------------------
 * COMMENTS (any authed user)
 * -------------------------------- */

router.get('/:id/comments', async (req, res) => {
  const list = await prisma.comment.findMany({
    where: { inventoryId: req.params.id },
    include: { user: true },
    orderBy: { createdAt: 'asc' }, take: 100
  })
  res.json(list.map(c => ({ id: c.id, userName: c.user.name, body: c.body })))
})

router.post('/:id/comments', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const c = await prisma.comment.create({
    data: { inventoryId: inv.id, userId: req.user.id, body: req.body.body || '' }
  })
  res.json(c)
})

/* --------------------------------
 * ACCESS (owner/admin only)  **FIXES 404s**
 * -------------------------------- */

router.get('/:id/access', async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const rows = await prisma.inventoryAccess.findMany({
    where: { inventoryId: inv.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { userId: 'asc' }
  })
  res.json(rows.map(r => ({
    userId: r.userId,
    name: r.user?.name || '',
    email: r.user?.email || '',
    canWrite: !!r.canWrite
  })))
})

router.post('/:id/access', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  const userId = (req.body?.userId || '').trim()
  const canWrite = !!req.body?.canWrite
  if (!userId) return res.status(400).json({ error: 'userId required' })

  await prisma.inventoryAccess.upsert({
    where: { inventoryId_userId: { inventoryId: inv.id, userId } },
    update: { canWrite },
    create: { inventoryId: inv.id, userId, canWrite }
  })
  res.json({ ok: true })
})

router.put('/:id/access/:userId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  await prisma.inventoryAccess.update({
    where: { inventoryId_userId: { inventoryId: inv.id, userId: req.params.userId } },
    data: { canWrite: !!req.body?.canWrite }
  })
  res.json({ ok: true })
})

router.delete('/:id/access/:userId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  await prisma.inventoryAccess.delete({
    where: { inventoryId_userId: { inventoryId: inv.id, userId: req.params.userId } }
  })
  res.json({ ok: true })
})

/* --------------------------------
 * LIKES  (any logged-in user; one per item)
 * -------------------------------- */

router.get('/:id/items/:itemId/likes', async (req, res) => {
  const itemId = req.params.itemId
  const [count, liked] = await Promise.all([
    prisma.like.count({ where: { itemId } }),
    req.user ? prisma.like.findUnique({ where: { itemId_userId: { itemId, userId: req.user.id } } }) : null
  ])
  res.json({ count, liked: !!liked })
})

// Toggle via POST (idempotent)
router.post('/:id/items/:itemId/like', requireAuth, async (req, res) => {
  const itemId = req.params.itemId
  const key = { itemId_userId: { itemId, userId: req.user.id } }
  const exists = await prisma.like.findUnique({ where: key })
  if (exists) {
    await prisma.like.delete({ where: key })
  } else {
    await prisma.like.create({ data: { itemId, userId: req.user.id } })
  }
  const count = await prisma.like.count({ where: { itemId } })
  res.json({ count, liked: !exists })
})

// Explicit unlike (optional)
router.delete('/:id/items/:itemId/like', requireAuth, async (req, res) => {
  const itemId = req.params.itemId
  const key = { itemId_userId: { itemId, userId: req.user.id } }
  try { await prisma.like.delete({ where: key }) } catch {}
  const count = await prisma.like.count({ where: { itemId } })
  res.json({ count, liked: false })
})

/* --------------------------------
 * STATS (read-only, with field names)
 * -------------------------------- */

router.get('/:id/stats', async (req, res) => {
  const id = req.params.id

  const [count, likeTotal] = await Promise.all([
    prisma.item.count({ where: { inventoryId: id } }),
    prisma.like.count({ where: { item: { inventoryId: id } } })
  ])

  const numberFields = await prisma.inventoryField.findMany({
    where: { inventoryId: id, type: 'NUMBER' },
    orderBy: { slot: 'asc' }
  })

  const [nums] = await prisma.$queryRaw`
    SELECT
      AVG(num1) AS num1_avg, MIN(num1) AS num1_min, MAX(num1) AS num1_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num1) AS num1_med,
      AVG(num2) AS num2_avg, MIN(num2) AS num2_min, MAX(num2) AS num2_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num2) AS num2_med,
      AVG(num3) AS num3_avg, MIN(num3) AS num3_min, MAX(num3) AS num3_max, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num3) AS num3_med
    FROM "Item" WHERE "inventoryId" = ${id}
  `

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

  const timeline = await prisma.$queryRaw`
    SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*) AS count
    FROM "Item" WHERE "inventoryId"=${id}
    GROUP BY 1 ORDER BY 1 ASC
  `

  const contributors = await prisma.$queryRaw`
    SELECT u.name, u.email, COUNT(i.id) AS count
    FROM "Item" i
    JOIN "User" u ON u.id = i."createdById"
    WHERE i."inventoryId"=${id}
    GROUP BY u.name, u.email
    ORDER BY count DESC, u.name ASC
    LIMIT 5
  `

  // Map numeric stats to field titles
  const numStats = [1, 2, 3].map(n => {
    const f = numberFields.find(ff => ff.slot === n)
    return {
      key: `num${n}`,
      title: f?.title || `Number ${n}`,
      min: nums?.[`num${n}_min`] ?? null,
      max: nums?.[`num${n}_max`] ?? null,
      avg: nums?.[`num${n}_avg`] ?? null,
      median: nums?.[`num${n}_med`] ?? null
    }
  })

  res.json({
    count,
    likesTotal: likeTotal,
    numberFields: numStats,
    topText,
    timeline,
    contributors,
  })
})

export default router
