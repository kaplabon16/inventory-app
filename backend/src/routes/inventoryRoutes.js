import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { isOwnerOrAdmin, canWriteInventory } from '../utils/validators.js'
import { generateCustomId } from '../utils/customId.js'

const prisma = new PrismaClient()
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

// create
router.post('/', requireAuth, async (req, res) => {
  const { title, description, categoryId } = req.body
  const cat = await prisma.category.findUnique({ where: { id: Number(categoryId || 0) } })
  const defaultCat = await prisma.category.findFirst({ where: { name: 'Other' } })
  const inv = await prisma.inventory.create({
    data: {
      title: title || 'New Inventory',
      description: description || '',
      ownerId: req.user.id,
      categoryId: cat?.id || defaultCat?.id || 1
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
  const elems = await prisma.customIdElement.findMany({ where: { inventoryId: inv.id }, orderBy: { order: 'asc' } })
  const pack = (type) => [1,2,3].map(slot => {
    const x = fields.find(f => f.type === type && f.slot === slot)
    return { title: x?.title || '', desc: x?.description || '', show: !!x?.showInTable }
  })

  const items = await prisma.item.findMany({
    where: { inventoryId: inv.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { likes: true } }
    }
  })

  const canEdit = req.user?.id && (req.user.roles?.includes('ADMIN') || req.user.id === inv.ownerId)
  res.json({
    inventory: inv,
    canEdit: !!canEdit,
    fields: { text: pack('TEXT'), mtext: pack('MTEXT'), num: pack('NUMBER'), link: pack('LINK'), bool: pack('BOOL') },
    elements: elems,
    items
  })
})

// update inventory (manual save only now)
router.put('/:id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })

  const { version, title, description, publicWrite, categoryId } = req.body || {}
  const v = Number(version ?? inv.version)
  const data = {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(publicWrite !== undefined ? { publicWrite } : {}),
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
    const type = { text:'TEXT', mtext:'MTEXT', num:'NUMBER', link:'LINK', bool:'BOOL' }[group]
    fields[group].forEach((cfg, idx) => tx.push(upsert(type, idx+1, cfg)))
  })
  await prisma.$transaction(tx)
  res.json({ ok: true })
})

// custom id elements
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

// items CRUD
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
  const item = await prisma.item.create({ data: { inventoryId: inv.id, customId, createdById: req.user.id } })
  res.json(item)
})

router.get('/:id/items/:itemId', requireAuth, async (req, res) => {
  const { inv } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const item = await prisma.item.findUnique({
    where: { id: req.params.itemId },
    include: { _count: { select: { likes: true } }, createdBy: { select:{ name:true } } }
  })
  if (!item || item.inventoryId !== inv.id) return res.status(404).json({ error: 'Item not found' })

  const fields = await prisma.inventoryField.findMany({ where: { inventoryId: inv.id } })
  const pack = (type) => [1,2,3].map(slot => {
    const x = fields.find(f => f.type === type && f.slot === slot)
    return { title: x?.title || '', desc: x?.description || '', show: !!x?.showInTable }
  })

  res.json({
    item,
    fields: { text: pack('TEXT'), mtext: pack('MTEXT'), num: pack('NUMBER'), link: pack('LINK'), bool: pack('BOOL') }
  })
})

router.put('/:id/items/:itemId', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })
  const { customId, ...rest } = req.body || {}
  const updated = await prisma.item.update({ where: { id: req.params.itemId }, data: { ...rest, customId: customId || undefined } })
  res.json(updated)
})

router.delete('/:id/items/:itemId', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })
  await prisma.item.delete({ where: { id: req.params.itemId } })
  res.json({ ok: true })
})

// bulk delete
router.post('/:id/items/bulk-delete', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })
  const { ids = [] } = req.body || {}
  if (!Array.isArray(ids) || !ids.length) return res.json({ ok: true, deleted: 0 })
  const r = await prisma.item.deleteMany({ where: { id: { in: ids }, inventoryId: inv.id } })
  res.json({ ok: true, deleted: r.count })
})

// like/unlike toggle
router.post('/:id/items/:itemId/like', requireAuth, async (req, res) => {
  const item = await prisma.item.findUnique({ where: { id: req.params.itemId } })
  if (!item || item.inventoryId !== req.params.id) return res.status(404).json({ error: 'Item not found' })

  const key = { itemId_userId: { itemId: item.id, userId: req.user.id } }
  const existing = await prisma.like.findUnique({ where: key })
  if (existing) {
    await prisma.like.delete({ where: key })
  } else {
    await prisma.like.create({ data: { itemId: item.id, userId: req.user.id } })
  }
  const count = await prisma.like.count({ where: { itemId: item.id } })
  res.json({ liked: !existing, count })
})

// access, comments (unchanged)
router.get('/:id/access', requireAuth, async (req, res) => {
  const list = await prisma.inventoryAccess.findMany({ where: { inventoryId: req.params.id }, include: { user: true } })
  res.json(list.map(x => ({ userId: x.userId, name: x.user.name, email: x.user.email, canWrite: x.canWrite })))
})

router.post('/:id/access', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  const { userId, canWrite } = req.body
  await prisma.inventoryAccess.upsert({
    where: { inventoryId_userId: { inventoryId: inv.id, userId } },
    update: { canWrite: !!canWrite },
    create: { inventoryId: inv.id, userId, canWrite: !!canWrite }
  })
  res.json({ ok: true })
})

router.put('/:id/access/:userId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  await prisma.inventoryAccess.update({
    where: { inventoryId_userId: { inventoryId: inv.id, userId: req.params.userId } },
    data: { canWrite: !!req.body.canWrite }
  })
  res.json({ ok: true })
})

router.delete('/:id/access/:userId', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  await prisma.inventoryAccess.delete({ where: { inventoryId_userId: { inventoryId: inv.id, userId: req.params.userId } } })
  res.json({ ok: true })
})

router.get('/:id/comments', async (req, res) => {
  const list = await prisma.comment.findMany({
    where: { inventoryId: req.params.id },
    include: { user: true },
    orderBy: { createdAt: 'desc' }, take: 100
  })
  res.json(list.map(c => ({ id: c.id, userName: c.user.name, body: c.body })))
})

router.post('/:id/comments', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  const c = await prisma.comment.create({ data: { inventoryId: inv.id, userId: req.user.id, body: req.body.body || '' } })
  res.json(c)
})

// ---- STATS (rich) ----
router.get('/:id/stats', async (req, res) => {
  const id = req.params.id

  const [count, likesTotal] = await Promise.all([
    prisma.item.count({ where: { inventoryId: id } }),
    prisma.like.count({ where: { item: { inventoryId: id } } }),
  ])

  // numeric min/max/avg/median via SQL
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      AVG(num1) AS num1_avg, MIN(num1) AS num1_min, MAX(num1) AS num1_max,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num1) AS num1_med,
      AVG(num2) AS num2_avg, MIN(num2) AS num2_min, MAX(num2) AS num2_max,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num2) AS num2_med,
      AVG(num3) AS num3_avg, MIN(num3) AS num3_min, MAX(num3) AS num3_max,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num3) AS num3_med
    FROM "Item" WHERE "inventoryId" = $1
  `, id)
  const aggs = rows?.[0] || {}

  // top strings across text1..3
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

  // timeline by month
  const timeline = await prisma.$queryRawUnsafe(`
    SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS ym, COUNT(*) AS c
    FROM "Item" WHERE "inventoryId"=$1
    GROUP BY 1 ORDER BY 1
  `, id)

  // top creators
  const topCreators = await prisma.$queryRawUnsafe(`
    SELECT u.name AS name, COUNT(*) AS c
    FROM "Item" i JOIN "User" u ON u.id = i."createdById"
    WHERE i."inventoryId"=$1
    GROUP BY u.name
    ORDER BY c DESC
    LIMIT 10
  `, id)

  res.json({ count, likesTotal, ...aggs, topText, timeline, topCreators })
})

export default router
