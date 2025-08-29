import { Router } from 'express'
import { prisma } from '../services/prisma.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { isOwnerOrAdmin, canWriteInventory } from '../utils/validators.js'
import { generateCustomId } from '../utils/customId.js'

const router = Router()
router.use(optionalAuth)

// list
router.get('/', async (req, res) => {
  const { mine, canWrite } = req.query
  const userId = req.user?.id

  if (mine) {
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const list = await prisma.inventory.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { items: true } } }
    })
    return res.json(list.map(x => ({ id: x.id, title: x.title, itemsCount: x._count.items })))
  }

  if (canWrite) {
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const acc = await prisma.inventoryAccess.findMany({ where: { userId, canWrite: true } })
    const invs = await prisma.inventory.findMany({
      where: { id: { in: acc.map(a => a.inventoryId) } },
      include: { _count: { select: { items: true } } }
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

// create
router.post('/', requireAuth, async (req, res) => {
  const { title, description, categoryId } = req.body
  const cat = await prisma.category.findUnique({ where: { id: Number(categoryId || 0) } })
  const fallback = await prisma.category.findFirst({ where: { name: 'Other' } })
  const inv = await prisma.inventory.create({
    data: {
      title: title || 'New Inventory',
      description: description || '',
      ownerId: req.user.id,
      categoryId: cat?.id || fallback?.id || 1
    }
  })
  res.json(inv)
})

// get one
router.get('/:id', async (req, res) => {
  const inv = await prisma.inventory.findUnique({
    where: { id: req.params.id },
    include: { category: true, owner: { select: { id: true } } }
  })
  if (!inv) return res.status(404).json({ error: 'Not found' })

  const fields = await prisma.inventoryField.findMany({ where: { inventoryId: inv.id } })
  const elems  = await prisma.customIdElement.findMany({ where: { inventoryId: inv.id }, orderBy: { order: 'asc' } })
  const pack = (type) => [1,2,3].map(slot => {
    const x = fields.find(f => f.type === type && f.slot === slot)
    return { title: x?.title || '', desc: x?.description || '', show: !!x?.showInTable }
  })
  const items = await prisma.item.findMany({ where: { inventoryId: inv.id }, orderBy: { createdAt: 'desc' }, take: 100 })

  const canEdit = !!(req.user?.id && (req.user.roles?.includes('ADMIN') || req.user.id === inv.ownerId))
  res.json({
    inventory: inv,
    canEdit,
    fields: { text: pack('TEXT'), mtext: pack('MTEXT'), num: pack('NUMBER'), link: pack('LINK'), bool: pack('BOOL') },
    elements: elems,
    items
  })
})

// update inventory
router.put('/:id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })

  const { version, title, description, publicWrite, categoryId } = req.body
  const v = Number(version ?? inv.version)
  const data = { title, description, publicWrite }

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: Number(categoryId) } })
    if (cat) data.categoryId = cat.id
  }

  const result = await prisma.inventory.updateMany({
    where: { id: inv.id, version: v },
    data: { ...data, version: { increment: 1 }, updatedAt: new Date() }
  })
  if (result.count === 0) return res.status(409).json({ error: 'Version conflict' })
  const updated = await prisma.inventory.findUnique({ where: { id: inv.id } })
  res.json(updated)
})

// delete inventory
router.delete('/:id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  await prisma.inventory.delete({ where: { id: inv.id } })
  res.json({ ok: true })
})

// save fields
router.post('/:id/fields', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  const { fields } = req.body
  const tx = []
  const upsert = (type, slot, { title, desc, show }) => prisma.inventoryField.upsert({
    where: { inventoryId_type_slot: { inventoryId: inv.id, type, slot } },
    update: { title, description: desc, showInTable: !!show },
    create: { inventoryId: inv.id, type, slot, title, description: desc, showInTable: !!show }
  })
  ;['text','mtext','num','link','bool'].forEach(group => {
    const type = { text: 'TEXT', mtext: 'MTEXT', num: 'NUMBER', link: 'LINK', bool: 'BOOL' }[group]
    fields[group].forEach((cfg, idx) => tx.push(upsert(type, idx+1, cfg)))
  })
  await prisma.$transaction(tx)
  res.json({ ok: true })
})

// save custom-id elements
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
  res.json({ ok: true })
})

// create item
router.post('/:id/items', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const access = await prisma.inventoryAccess.findMany({ where: { inventoryId: inv.id } })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })

  let customId = await generateCustomId(inv.id)
  if (!customId) customId = `ID-${Math.random().toString(36).slice(2,8).toUpperCase()}` // safe fallback

  const item = await prisma.item.create({
    data: { inventoryId: inv.id, customId, createdById: req.user.id }
  })
  res.json(item)
})

// get item + fields
router.get('/:id/items/:itemId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const item = await prisma.item.findUnique({ where: { id: req.params.itemId } })
  if (!item || item.inventoryId !== inv.id) return res.status(404).json({ error: 'Item not found' })

  const fields = await prisma.inventoryField.findMany({ where: { inventoryId: inv.id } })
  const pack = (type) => [1, 2, 3].map(slot => {
    const x = fields.find(f => f.type === type && f.slot === slot)
    return { title: x?.title || '', desc: x?.description || '', show: !!x?.showInTable }
  })

  res.json({
    item,
    fields: { text: pack('TEXT'), mtext: pack('MTEXT'), num: pack('NUMBER'), link: pack('LINK'), bool: pack('BOOL') }
  })
})

// update item
router.put('/:id/items/:itemId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const access = await prisma.inventoryAccess.findMany({ where: { inventoryId: inv.id } })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })

  const data = (({ customId, ...rest }) => ({ ...rest, customId: customId || undefined }))(req.body || {})
  const updated = await prisma.item.update({ where: { id: req.params.itemId }, data })
  res.json(updated)
})

// delete items (single & bulk) left as-is above…

// access routes left as-is above…

// comments routes left as-is above…

// STATS (upgraded)
router.get('/:id/stats', async (req, res) => {
  const id = req.params.id

  const count = await prisma.item.count({ where: { inventoryId: id } })
  const likesTotal = await prisma.like.count({
    where: { item: { inventoryId: id } }
  })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      AVG(num1) AS num1_avg, MIN(num1) AS num1_min, MAX(num1) AS num1_max,
      AVG(num2) AS num2_avg, MIN(num2) AS num2_min, MAX(num2) AS num2_max,
      AVG(num3) AS num3_avg, MIN(num3) AS num3_min, MAX(num3) AS num3_max
    FROM "Item" WHERE "inventoryId" = $1
  `, id)

  const median = await prisma.$queryRawUnsafe(`
    WITH s AS (
      SELECT num1 FROM "Item" WHERE "inventoryId"=$1 AND num1 IS NOT NULL ORDER BY num1
    )
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num1) AS num1_med FROM s
  `, id)
  const median2 = await prisma.$queryRawUnsafe(`
    WITH s AS (
      SELECT num2 FROM "Item" WHERE "inventoryId"=$1 AND num2 IS NOT NULL ORDER BY num2
    )
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num2) AS num2_med FROM s
  `, id)
  const median3 = await prisma.$queryRawUnsafe(`
    WITH s AS (
      SELECT num3 FROM "Item" WHERE "inventoryId"=$1 AND num3 IS NOT NULL ORDER BY num3
    )
    SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num3) AS num3_med FROM s
  `, id)

  const topText = await prisma.$queryRawUnsafe(`
    WITH t AS (
      SELECT lower(trim(text1)) AS v FROM "Item" WHERE "inventoryId"=$1 AND text1 IS NOT NULL AND trim(text1) <> ''
      UNION ALL
      SELECT lower(trim(text2)) FROM "Item" WHERE "inventoryId"=$1 AND text2 IS NOT NULL AND trim(text2) <> ''
      UNION ALL
      SELECT lower(trim(text3)) FROM "Item" WHERE "inventoryId"=$1 AND text3 IS NOT NULL AND trim(text3) <> ''
    )
    SELECT v, COUNT(*) as c FROM t GROUP BY v ORDER BY c DESC LIMIT 10
  `, id)

  const timeline = await prisma.$queryRawUnsafe(`
    SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS ym, COUNT(*)::int AS c
    FROM "Item" WHERE "inventoryId"=$1
    GROUP BY 1 ORDER BY 1
  `, id)

  const contributors = await prisma.$queryRawUnsafe(`
    SELECT u.name AS name, COUNT(*)::int AS c
    FROM "Item" i
    JOIN "User" u ON u.id = i."createdById"
    WHERE i."inventoryId"=$1
    GROUP BY u.name
    ORDER BY c DESC
    LIMIT 10
  `, id)

  const aggs = rows?.[0] || {}
  res.json({
    count, likesTotal,
    num1: { avg: aggs.num1_avg, min: aggs.num1_min, max: aggs.num1_max, median: median?.[0]?.num1_med ?? null },
    num2: { avg: aggs.num2_avg, min: aggs.num2_min, max: aggs.num2_max, median: median2?.[0]?.num2_med ?? null },
    num3: { avg: aggs.num3_avg, min: aggs.num3_min, max: aggs.num3_max, median: median3?.[0]?.num3_med ?? null },
    topText, timeline, contributors
  })
})

export default router
