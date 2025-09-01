// backend/src/routes/inventoryRoutes.js
import { Router } from 'express'
import { prisma } from '../services/prisma.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { isOwnerOrAdmin, canWriteInventory } from '../utils/validators.js'
import { generateCustomId } from '../utils/customId.js'

const router = Router()
router.use(optionalAuth)

const setNoStore = (res) => res.set('Cache-Control', 'no-store, max-age=0')

/* ---------------- LISTS ---------------- */

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

router.get('/', optionalAuth, async (req, res) => {
  setNoStore(res)
  const mine = req.query.mine === '1'
  const canW = req.query.canWrite === '1'

  if ((mine || canW) && !req.user) return res.json([])

  if (mine) {
    const list = await prisma.inventory.findMany({
      where: { ownerId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } }
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
      include: { _count: { select: { items: true } } }
    })
    return res.json(list.map(x => ({
      id: x.id, title: x.title, itemsCount: x._count.items
    })))
  }

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

function typeLabelToKey(t) {
  switch (t) {
    case 'TEXT': return 'text'
    case 'MTEXT': return 'mtext'
    case 'NUMBER': return 'num'
    case 'LINK': return 'link'
    case 'BOOL': return 'bool'
    case 'IMAGE': return 'image'
    default: return String(t || '').toLowerCase()
  }
}

router.get('/:id', async (req, res) => {
  const inv = await prisma.inventory.findUnique({
    where: { id: req.params.id },
    include: { category: true, owner: { select: { id: true } } }
  })
  if (!inv) return res.status(404).json({ error: 'Not found' })

  const [fields, elems, access] = await Promise.all([
    prisma.inventoryField.findMany({ where: { inventoryId: inv.id } }),
    prisma.customIdElement.findMany({ where: { inventoryId: inv.id }, orderBy: { order: 'asc' } }),
    prisma.inventoryAccess.findMany({ where: { inventoryId: inv.id } }),
  ])

  const grouped = { text: [], mtext: [], num: [], link: [], bool: [], image: [] }
  fields.sort((a, b) => a.slot - b.slot).forEach(f => {
    const key = typeLabelToKey(f.type)
    if (grouped[key]) {
      grouped[key].push({
        title: f.title || '',
        desc: f.description || '',
        show: !!f.showInTable
      })
    }
  })

  const typeOrder = { TEXT: 1, MTEXT: 2, NUMBER: 3, LINK: 4, BOOL: 5, IMAGE: 6 }
  const fieldsFlat = fields
    .map(f => ({
      group: f.type,
      slot: f.slot,
      title: f.title,
      order: f.displayOrder ?? 0
    }))
    .sort((a, b) => (a.order - b.order) || (typeOrder[a.group] - typeOrder[b.group]) || (a.slot - b.slot))

  const items = await prisma.item.findMany({
    where: { inventoryId: inv.id },
    orderBy: { createdAt: 'desc' }, take: 100,
    select: {
      id: true, customId: true, createdAt: true, updatedAt: true,
      createdById: true,
      text1: true, text2: true, text3: true,
      mtext1: true, mtext2: true, mtext3: true,
      num1: true, num2: true, num3: true,
      link1: true, link2: true, link3: true,
      bool1: true, bool2: true, bool3: true,
      img1: true, img2: true, img3: true,
    }
  })

  const canEdit = !!(req.user?.id && (req.user.roles?.includes('ADMIN') || req.user.id === inv.ownerId))
  const canWrite = !!(req.user?.id && canWriteInventory(req.user, inv, access))

  res.json({
    inventory: inv,
    canEdit,
    canWrite,
    fields: grouped,
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

  const access = await prisma.inventoryAccess.findMany({ where: { inventoryId: inv.id } })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })

  const { fields = {}, order = [] } = req.body || {}
  const groups = ['text','mtext','num','link','bool','image']
  const typeMap = { text: 'TEXT', mtext: 'MTEXT', num: 'NUMBER', link: 'LINK', bool: 'BOOL', image: 'IMAGE' }

  const orderMap = {}
  order.forEach((x, idx) => {
    const type = typeof x.group === 'string' ? x.group.toUpperCase() : ''
    orderMap[`${type}-${x.slot}`] = idx
  })

  const tx = []
  groups.forEach(group => {
    const type = typeMap[group]
    const arr = Array.isArray(fields[group]) ? fields[group] : []
    arr.forEach((cfg, i) => {
      const slot = i + 1
      const key = `${type}-${slot}`
      const displayOrder = orderMap[key] ?? 9999
      tx.push(prisma.inventoryField.upsert({
        where: { inventoryId_type_slot: { inventoryId: inv.id, type, slot } },
        update: { title: cfg.title || '', description: cfg.desc || '', showInTable: !!cfg.show, displayOrder },
        create: { inventoryId: inv.id, type, slot, title: cfg.title || '', description: cfg.desc || '', showInTable: !!cfg.show, displayOrder }
      }))
    })
    tx.push(prisma.inventoryField.deleteMany({
      where: { inventoryId: inv.id, type, slot: { gt: arr.length } }
    }))
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
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })

  const item = await prisma.item.findUnique({
    where: { id: req.params.itemId },
    include: { _count: { select: { likes: true } } }
  })
  if (!item || item.inventoryId !== inv.id) return res.status(404).json({ error: 'Item not found' })

  const fields = await prisma.inventoryField.findMany({ where: { inventoryId: inv.id } })
  const typeOrder = { TEXT: 1, MTEXT: 2, NUMBER: 3, LINK: 4, BOOL: 5, IMAGE: 6 }
  const fieldsFlat = fields
    .map(f => ({ group: f.type, slot: f.slot, title: f.title, order: f.displayOrder ?? 0 }))
    .sort((a, b) => (a.order - b.order) || (typeOrder[a.group] - typeOrder[b.group]) || (a.slot - b.slot))

  const grouped = { text: [], mtext: [], num: [], link: [], bool: [], image: [] }
  fields.sort((a,b)=>a.slot-b.slot).forEach(f=>{
    grouped[typeLabelToKey(f.type)].push({
      title: f.title || '', desc: f.description || '', show: !!f.showInTable
    })
  })

  const canWrite = !!(req.user?.id && canWriteInventory(req.user, inv, access))

  res.json({
    item,
    fields: grouped,
    fieldsFlat,
    canWrite,
  })
})

/* -------------- IMPORTANT FIX: sanitize item updates -------------- */
router.put('/:id/items/:itemId', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })

  const allow = new Set([
    'customId',
    'text1','text2','text3',
    'mtext1','mtext2','mtext3',
    'num1','num2','num3',
    'link1','link2','link3',
    'bool1','bool2','bool3',
    'img1','img2','img3'
  ])

  const body = req.body || {}

  const clean = {}
  for (const k of Object.keys(body)) {
    if (!allow.has(k)) continue
    if (k.startsWith('num')) {
      const v = body[k]
      const n = (v === '' || v === null || v === undefined) ? null : Number(v)
      clean[k] = Number.isFinite(n) ? n : null
    } else if (k.startsWith('bool')) {
      const v = body[k]
      clean[k] = (v === true || v === false) ? v : (!!v ? true : false)
    } else if (k.startsWith('text') || k.startsWith('mtext') || k.startsWith('link') || k.startsWith('img') || k === 'customId') {
      const v = body[k]
      clean[k] = (v === undefined) ? undefined : (v === null ? null : String(v))
    }
  }

  try {
    const updated = await prisma.item.update({ where: { id: req.params.itemId }, data: clean })
    res.json(updated)
  } catch (e) {
    console.error('[item update]', e)
    res.status(400).json({ error: 'Update failed' })
  }
})

router.delete('/:id/items/:itemId', requireAuth, async (req, res) => {
  const { inv, access } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })
  if (!canWriteInventory(req.user, inv, access)) return res.status(403).json({ error: 'Forbidden' })

  await prisma.item.delete({ where: { id: req.params.itemId } })
  res.json({ ok: true })
})

/* ---------------- LIKE / COMMENTS / ACCESS ---------------- */

router.post('/:id/items/:itemId/like', requireAuth, async (req, res) => {
  const { inv } = await getInvWithAccess(req.params.id)
  if (!inv) return res.status(404).json({ error: 'Not found' })

  const item = await prisma.item.findUnique({ where: { id: req.params.itemId } })
  if (!item || item.inventoryId !== inv.id) return res.status(404).json({ error: 'Item not found' })

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

    // total items
    const count = await prisma.item.count({ where: { inventoryId: id } })

    // total likes across items in this inventory
    const [{ likes_total = 0 } = {}] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS likes_total
      FROM "Like" l
      JOIN "Item" i ON i.id = l."itemId"
      WHERE i."inventoryId" = ${id}
    `

    // numeric stats (min/max/avg/median) for num1..num3; median via percentile_cont
    const [nums] = await prisma.$queryRaw`
      SELECT
        COUNT(num1) AS num1_n,
        MIN(num1) AS num1_min, MAX(num1) AS num1_max, AVG(num1) AS num1_avg,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num1) AS num1_med,

        COUNT(num2) AS num2_n,
        MIN(num2) AS num2_min, MAX(num2) AS num2_max, AVG(num2) AS num2_avg,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num2) AS num2_med,

        COUNT(num3) AS num3_n,
        MIN(num3) AS num3_min, MAX(num3) AS num3_max, AVG(num3) AS num3_avg,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY num3) AS num3_med
      FROM "Item"
      WHERE "inventoryId" = ${id}
    `

    // top N (5) string values across TEXT and MTEXT fields
    const topStrings = await prisma.$queryRaw`
      WITH t AS (
        SELECT lower(trim(text1)) AS v FROM "Item" WHERE "inventoryId"=${id} AND text1 IS NOT NULL AND trim(text1) <> ''
        UNION ALL
        SELECT lower(trim(text2)) FROM "Item" WHERE "inventoryId"=${id} AND text2 IS NOT NULL AND trim(text2) <> ''
        UNION ALL
        SELECT lower(trim(text3)) FROM "Item" WHERE "inventoryId"=${id} AND text3 IS NOT NULL AND trim(text3) <> ''
        UNION ALL
        SELECT lower(trim(mtext1)) FROM "Item" WHERE "inventoryId"=${id} AND mtext1 IS NOT NULL AND trim(mtext1) <> ''
        UNION ALL
        SELECT lower(trim(mtext2)) FROM "Item" WHERE "inventoryId"=${id} AND mtext2 IS NOT NULL AND trim(mtext2) <> ''
        UNION ALL
        SELECT lower(trim(mtext3)) FROM "Item" WHERE "inventoryId"=${id} AND mtext3 IS NOT NULL AND trim(mtext3) <> ''
      )
      SELECT v, COUNT(*)::int as c
      FROM t
      GROUP BY v
      ORDER BY c DESC, v ASC
      LIMIT 5
    `

    // monthly timeline (YYYY-MM)
    const timeline = await prisma.$queryRaw`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM "Item" WHERE "inventoryId"=${id}
      GROUP BY 1 ORDER BY 1 ASC
    `

    // top contributors
    const contributors = await prisma.$queryRaw`
      SELECT u.name, u.email, COUNT(i.id)::int AS count
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
      likes: Number(likes_total || 0),
      num1: { n: Number(nums?.num1_n || 0), min: num(nums?.num1_min), max: num(nums?.num1_max), avg: num(nums?.num1_avg), median: num(nums?.num1_med) },
      num2: { n: Number(nums?.num2_n || 0), min: num(nums?.num2_min), max: num(nums?.num2_max), avg: num(nums?.num2_avg), median: num(nums?.num2_med) },
      num3: { n: Number(nums?.num3_n || 0), min: num(nums?.num3_min), max: num(nums?.num3_max), avg: num(nums?.num3_avg), median: num(nums?.num3_med) },
      stringsTop: topStrings,
      timeline,
      contributors,
    })
  } catch (e) {
    console.error('[stats]', e)
    res.json({
      count: 0,
      likes: 0,
      num1: { n: 0 }, num2: { n: 0 }, num3: { n: 0 },
      stringsTop: [],
      timeline: [],
      contributors: []
    })
  }
})

export default router
