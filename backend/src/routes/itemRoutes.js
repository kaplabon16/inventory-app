import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'
import { canWriteInventory } from '../utils/validators.js'
import { generateCustomId } from '../utils/customId.js'
const prisma = new PrismaClient()
const router = Router({ mergeParams: true })

// Create new item (custom ID auto-generated)
router.post('/inventories/:id/items', requireAuth, async (req,res)=>{
  const inv = await prisma.inventory.findUnique({ where:{ id:req.params.id }, include: { access:true }})
  if (!inv) return res.status(404).json({ error:'Not found' })
  if (!canWriteInventory(req.user, inv, inv.access)) return res.status(403).json({ error:'Forbidden' })
  let customId = await generateCustomId(inv.id)
  try {
    const item = await prisma.item.create({
      data: { inventoryId: inv.id, createdById: req.user.id, customId }
    })
    res.json(item)
  } catch (e) {
    // collision -> let user edit manually
    const item = await prisma.item.create({
      data: { inventoryId: inv.id, createdById: req.user.id, customId: `${customId}-X` }
    })
    res.json(item)
  }
})

// Bulk delete
router.post('/inventories/:id/items/bulk-delete', requireAuth, async (req,res)=>{
  const inv = await prisma.inventory.findUnique({ where:{ id:req.params.id }, include:{ access:true }})
  if (!inv) return res.status(404).json({ error:'Not found' })
  if (!canWriteInventory(req.user, inv, inv.access)) return res.status(403).json({ error:'Forbidden' })
  const { ids=[] } = req.body
  await prisma.item.deleteMany({ where: { id: { in: ids }, inventoryId: inv.id }})
  res.json({ ok:true })
})

// Read one item with fields config
router.get('/inventories/:id/items/:itemId', async (req,res)=>{
  const item = await prisma.item.findUnique({ where:{ id:req.params.itemId }})
  if (!item) return res.status(404).json({ error:'Not found' })
  const fields = await prisma.inventoryField.findMany({ where:{ inventoryId: req.params.id }})
  const pack = (type) => [1,2,3].map(slot=>{
    const x=fields.find(f=>f.type===type&&f.slot===slot)
    return { title: x?.title || '', desc: x?.description || '', show: !!x?.showInTable }
  })
  res.json({ item, fields:{
    text:pack('TEXT'), mtext:pack('MTEXT'), num:pack('NUMBER'), link:pack('LINK'), bool:pack('BOOL')
  }})
})

// Update item (with optimistic lock)
router.put('/inventories/:id/items/:itemId', requireAuth, async (req,res)=>{
  const inv = await prisma.inventory.findUnique({ where:{ id:req.params.id }, include:{ access:true }})
  if (!inv) return res.status(404).json({ error:'Not found' })
  if (!canWriteInventory(req.user, inv, inv.access)) return res.status(403).json({ error:'Forbidden' })
  const data = { ...req.body }
  delete data.id; delete data.inventoryId; delete data.createdById; delete data.createdAt; delete data.updatedAt
  try {
    const updated = await prisma.item.update({
      where: { id: req.params.itemId },
      data: { ...data, version: { increment: 1 } }
    })
    res.json(updated)
  } catch (e) {
    res.status(400).json({ error:'Update failed' })
  }
})

// Delete item
router.delete('/inventories/:id/items/:itemId', requireAuth, async (req,res)=>{
  const inv = await prisma.inventory.findUnique({ where:{ id:req.params.id }, include:{ access:true }})
  if (!inv) return res.status(404).json({ error:'Not found' })
  if (!canWriteInventory(req.user, inv, inv.access)) return res.status(403).json({ error:'Forbidden' })
  await prisma.item.delete({ where: { id: req.params.itemId }})
  res.json({ ok:true })
})

export default router
