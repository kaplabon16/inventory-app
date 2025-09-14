import { Router } from 'express'
import { prisma } from '../services/prisma.js'

const router = Router()

router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  if (!q) return res.json({ inventories: [], items: [] })

  const like = { contains: q, mode: 'insensitive' }

  const [inventories, items] = await Promise.all([
    prisma.inventory.findMany({
      where: { OR: [{ title: like }, { description: like }] },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        categoryId: true,
        updatedAt: true
      }
    }),
    prisma.item.findMany({
      where: {
        OR: [
          { text1: like }, { text2: like }, { text3: like },
          { mtext1: like }, { mtext2: like }, { mtext3: like },
          { link1: like }, { link2: like }, { link3: like }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        customId: true,
        inventoryId: true,
        createdAt: true
      }
    })
  ])

  res.json({ inventories, items })
})

export default router
