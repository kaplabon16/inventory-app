import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAuth } from '../middleware/auth.js'

const prisma = new PrismaClient()
const router = Router()

// Toggle like and return current count
router.post('/inventories/:id/items/:itemId/like', requireAuth, async (req, res) => {
  const { itemId } = req.params
  const me = req.user.id

  const existing = await prisma.like.findFirst({ where: { itemId, userId: me } })
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } })
  } else {
    await prisma.like.create({ data: { itemId, userId: me } })
  }
  const count = await prisma.like.count({ where: { itemId } })
  res.json({ ok: true, count })
})

export default router
