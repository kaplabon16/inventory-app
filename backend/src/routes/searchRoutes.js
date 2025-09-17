import { Router } from 'express'
import { prisma } from '../services/prisma.js'

const router = Router()

router.get('/', async (req, res) => {
  const q = (req.query.q || '').toString().trim()
  if (!q) return res.json({ inventories: [], items: [] })

  const like = { contains: q, mode: 'insensitive' }

  const numericPattern = /^-?\d+(\.\d+)?$/
  const isNumeric = numericPattern.test(q)
  const numericVal = isNumeric ? Number(q) : null

  const boolLookup = {
    true: true,
    false: false,
    yes: true,
    no: false,
    '1': true,
    '0': false
  }
  const lowerQ = q.toLowerCase()
  const boolVal = Object.prototype.hasOwnProperty.call(boolLookup, lowerQ) ? boolLookup[lowerQ] : null

  const itemOr = [
    { customId: like },
    { text1: like }, { text2: like }, { text3: like },
    { mtext1: like }, { mtext2: like }, { mtext3: like },
    { link1: like }, { link2: like }, { link3: like },
    { inventory: { title: like } },
    { inventory: { description: like } }
  ]

  if (isNumeric) {
    itemOr.push({ num1: numericVal }, { num2: numericVal }, { num3: numericVal })
  }

  if (boolVal !== null) {
    itemOr.push({ bool1: boolVal }, { bool2: boolVal }, { bool3: boolVal })
  }

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
        OR: itemOr
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        customId: true,
        inventoryId: true,
        createdAt: true,
        updatedAt: true,
        text1: true, text2: true, text3: true,
        mtext1: true, mtext2: true, mtext3: true,
        num1: true, num2: true, num3: true,
        link1: true, link2: true, link3: true,
        bool1: true, bool2: true, bool3: true,
        inventory: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })
  ])

  res.json({ inventories, items })
})

export default router
