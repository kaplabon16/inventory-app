import { Router } from 'express'
import { prisma } from '../services/prisma.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { isOwnerOrAdmin, canWriteInventory } from '../utils/validators.js'
import { generateCustomId } from '../utils/customId.js'

const router = Router()
router.use(optionalAuth)

/* tiny helper */
const setNoStore = (res) => res.set('Cache-Control', 'no-store, max-age=0')

/* ---------------- LISTS ---------------- */

// Recent public inventories for home cards
router.get('/public-recent', async (req, res) => {
  setNoStore(res)
  const take = Math.min(Number(req.query.take || 10), 50)
  const list = await prisma.inventory.findMany({
    orderBy: { updatedAt: 'desc' },
    take,
    include: {
      _count: { select: { items: true } },
      owner: { select: { name: true } },
      category: { select: { name: true } }
    }
  })
  res.json(list.map(x => ({
    id: x.id,
    title: x.title,
    description: x.description?.slice(0, 140) || '',
    imageUrl: x.imageUrl || null,
    categoryName: x.category?.name || '-',
    ownerName: x.owner?.name || '-',
    itemsCount: x._count.items
  })))
})

// Popular by number of items
router.get('/popular', async (req, res) => {
  setNoStore(res)
  const take = Math.min(Number(req.query.take || 5), 50)
  const list = await prisma.inventory.findMany({
    orderBy: [{ items: { _count: 'desc' } }, { updatedAt: 'desc' }],
    take,
    include: {
      _count: { select: { items: true } },
      category: { select: { name: true } }
    }
  })
  res.json(list.map(x => ({
    id: x.id,
    title: x.title,
    categoryName: x.category?.name || '-',
    itemsCount: x._count.items
  })))
})

// Listing (supports mine=1 and canWrite=1)
router.get('/', optionalAuth, async (req, res) => {
  setNoStore(res)
  const mine = req.query.mine === '1'
  const canW = req.query.canWrite === '1'

  // profile lists
  if ((mine || canW) && !req.user) return res.json([])

  if (mine) {
    const list = await prisma.inventory.findMany({
      where: { ownerId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { items: true } }
      }
    })
    return res.json(list.map(x => ({
      id: x.id, title: x.title, itemsCount: x._count.items
    })))
  }

  if (canW) {
    const list = await prisma.inventory.findMany({
      where: {
        OR: [
          { ownerId: req.user.id },
          { publicWrite: true },
          { access: { some: { userId: req.user.id, canWrite: true } } }
        ]
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { items: true } }
      }
    })
    return res.json(list.map(x => ({
      id: x.id, title: x.title, itemsCount: x._count.items
    })))
  }

  // default: everything (condensed)
  const take = Math.min(Number(req.query.take || 100), 200)
  const list = await prisma.inventory.findMany({
    include: { _count: { select: { items: true } }, owner: { select: { name: true } }, category: true },
    orderBy: { updatedAt: 'desc' },
    take
  })
  res.json(list.map(x => ({
    id: x.id, title: x.title, categoryName: x.category.name, ownerName: x.owner.name, itemsCount: x._count.items
  })))
})

/* ---------------- CREATE ---------------- */

router.post('/', requireAuth, async (req, res) => {
  const { title, description, categoryId } = req.body || {}
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

/* ---------------- READ ONE (PUBLIC) ---------------- */

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

  const fieldsFlat = fields
    .map(f => ({
      group: f.type, slot: f.slot,
      title: f.title,
      order: f.displayOrder ?? 0
    }))
    .sort((a,b)=> a.order - b.order || (a.group+b.slot).localeCompare(b.group+b.slot))

  const items = await prisma.item.findMany({
    where: { inventoryId: inv.id },
    orderBy: { createdAt: 'desc' }, take: 100,
    select: {
      id: true, customId: true, createdAt: true, updatedAt: true,
      createdById: true,
      text1: true, text2: true, text3: true,
      num1: true, num2: true, num3: true,
      bool1: true, bool2: true, bool3: true,
      img1: true, img2: true, img3: true,
    }
  })

  const canEdit = !!(req.user?.id && (req.user.roles?.includes('ADMIN') || req.user.id === inv.ownerId))

  res.json({
    inventory: inv,
    canEdit,
    fields: {
      text: pack('TEXT'),
      mtext: pack('MTEXT'),
      num: pack('NUMBER'),
      link: pack('LINK'),
      bool: pack('BOOL'),
      image: pack('IMAGE'),
    },
    fieldsFlat,
    elements: elems,
    items
  })
})

/* ---------------- UPDATE / DELETE INVENTORY ---------------- */

router.put('/:id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })

  const { version, title, description, publicWrite, categoryId, imageUrl } = req.body || {}
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

/* ---------------- FIELDS ---------------- */

router.post('/:id/fields', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })

  const { fields = {}, order = [] } = req.body || {}

  const tx = []
  const upsert = (type, slot, { title, desc, show, displayOrder }) => prisma.inventoryField.upsert({
    where: { inventoryId_type_slot: { inventoryId: inv.id, type, slot } },
    update: { title, description: desc, showInTable: !!show, displayOrder: displayOrder ?? 0 },
    create: { inventoryId: inv.id, type, slot, title, description: desc, showInTable: !!show, displayOrder: displayOrder ?? 0 }
  })

  const groups = ['text','mtext','num','link','bool','image']
  const typeMap = { text: 'TEXT', mtext: 'MTEXT', num: 'NUMBER', link: 'LINK', bool: 'BOOL', image: 'IMAGE' }

  // compute display orders from the single flat "order" list
  const orderMap = {}
  order.forEach((x, idx) => {
    // x.group is enum name (TEXT/MTEXT/...), keep consistent with backend
    orderMap[`${x.group}-${x.slot}`] = idx
  })

  groups.forEach(group => {
    const type = typeMap[group]
    const arr = fields[group] || []
    arr.slice(0,3).forEach((cfg, idx) => {
      const key = `${type}-${idx+1}`
      const displayOrder = orderMap[key] ?? 9999
      tx.push(upsert(type, idx + 1, { ...cfg, displayOrder }))
    })
    for (let s = arr.length + 1; s <= 3; s++) {
      tx.push(prisma.inventoryField.deleteMany({ where: { inventoryId: inv.id, type, slot: s } }))
    }
  })

  await prisma.$transaction(tx)
  res.json({ ok: true, message: 'Saved field config' })
})

/* ---------------- CUSTOM ID ELEMENTS ---------------- */

router.post('/:id/custom-id', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })

  const elements = Array.isArray(req.body?.elements) ? req.body.elements : []
  const cleaned = elements
    .map((e, i) => ({
      order: Number(e.order ?? i + 1),
      type: String(e.type || 'FIXED').toUpperCase(),
      param: typeof e.param === 'string' ? e.param : null
    }))
    .filter(e => ['FIXED','RAND20','RAND32','RAND6','RAND9','GUID','DATE','SEQ'].includes(e.type))

  await prisma.$transaction([
    prisma.customIdElement.deleteMany({ where: { inventoryId: inv.id } }),
    ...(cleaned.length ? [prisma.customIdElement.createMany({
      data: cleaned.map(e => ({ inventoryId: inv.id, order: e.order, type: e.type, param: e.param || null })
      )
    })] : [])
  ])

  const saved = await prisma.customIdElement.findMany({ where: { inventoryId: inv.id }, orderBy: { order: 'asc' } })
  res.json({ ok: true, elements: saved })
})

/* ---------------- ITEMS ---------------- */

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

router.post('/:id/items/bulk-delete', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })
  const ids = (req.body?.ids || []).map(String).filter(Boolean)
  if (!ids.length) return res.json({ ok: true, deleted: 0 })
  const r = await prisma.item.deleteMany({ where: { id: { in: ids }, inventoryId: inv.id } })
  res.json({ ok: true, deleted: r.count })
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
  const fieldsFlat = fields
    .map(f => ({ group: f.type, slot: f.slot, title: f.title, order: f.displayOrder ?? 0 }))
    .sort((a,b)=> a.order - b.order || (a.group+b.slot).localeCompare(b.group+b.slot))

  res.json({
    item,
    fields: {
      text: pack('TEXT'), mtext: pack('MTEXT'), num: pack('NUMBER'),
      link: pack('LINK'), bool: pack('BOOL'), image: pack('IMAGE'),
    },
    fieldsFlat
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

/* ---- LIKE / UNLIKE ---- */
router.post('/:id/items/:itemId/like', requireAuth, async (req, res) => {
  const { inv } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })

  const item = await prisma.item.findUnique({ where: { id: req.params.itemId } })
  if (!item || item.inventoryId !== inv.id) return res.status(404).json({ error: 'Item not found' })

  // toggle
  const key = { itemId_userId: { itemId: item.id, userId: req.user.id } }
  const existing = await prisma.like.findUnique({ where: key }).catch(() => null)

  if (existing) {
    await prisma.like.delete({ where: key })
  } else {
    await prisma.like.create({ data: { itemId: item.id, userId: req.user.id } })
  }

  const count = await prisma.like.count({ where: { itemId: item.id } })
  res.json({ ok: true, liked: !existing, count })
})

/* ---------------- COMMENTS & ACCESS ---------------- */

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

router.get('/:id/access', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  const list = await prisma.inventoryAccess.findMany({
    where: { inventoryId: inv.id },
    include: { user: { select: { id: true, name: true, email: true } } }
  })
  res.json(list.map(x => ({ userId: x.userId, name: x.user.name, email: x.user.email, canWrite: x.canWrite })))
})

router.post('/:id/access', requireAuth, async (req, res) => {
  const inv = await prisma.inventory.findUnique({ where: { id: req.params.id } })
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!isOwnerOrAdmin(req.user, inv)) return res.status(403).json({ error: 'Forbidden' })
  const { userId, canWrite = true } = req.body || {}
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
  const { canWrite = false } = req.body || {}
  await prisma.inventoryAccess.update({
    where: { inventoryId_userId: { inventoryId: inv.id, userId: req.params.userId } },
    data: { canWrite: !!canWrite }
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

/* ---------------- STATS ---------------- */

router.get('/:id/stats', async (req, res) => {
  try {
    const id = req.params.id

    const count = await prisma.item.count({ where: { inventoryId: id } })

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

    const num = (x) => (x == null ? null : Number(x))

    res.json({
      count,
      num1: { min: num(nums?.num1_min), max: num(nums?.num1_max), avg: num(nums?.num1_avg), median: num(nums?.num1_med) },
      num2: { min: num(nums?.num2_min), max: num(nums?.num2_max), avg: num(nums?.num2_avg), median: num(nums?.num2_med) },
      num3: { min: num(nums?.num3_min), max: num(nums?.num3_max), avg: num(nums?.num3_avg), median: num(nums?.num3_med) },
      topText,
      timeline,
      contributors,
    })
  } catch (e) {
    console.error('[stats]', e)
    res.json({ count: 0, num1: {}, num2: {}, num3: {}, topText: [], timeline: [], contributors: [] })
  }
})

export default router
