import { Router } from 'express'
import { prisma } from '../services/prisma.js'

const router = Router()

const typeLabelToKey = (type) => {
  switch (type) {
    case 'TEXT': return 'text'
    case 'MTEXT': return 'mtext'
    case 'NUMBER': return 'num'
    case 'LINK': return 'link'
    case 'BOOL': return 'bool'
    case 'IMAGE': return 'image'
    default: return String(type || '').toLowerCase()
  }
}

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

  const inventoryIds = Array.from(new Set(items.map(item => item.inventoryId))).filter(Boolean)
  let fieldsByInventory = {}

  if (inventoryIds.length > 0) {
    const inventoryFields = await prisma.inventoryField.findMany({
      where: { inventoryId: { in: inventoryIds } },
      select: {
        inventoryId: true,
        type: true,
        slot: true,
        title: true,
        showInTable: true
      }
    })

    const baseFields = () => ({ text: [], mtext: [], num: [], link: [], bool: [], image: [] })

    inventoryFields.forEach(field => {
      const key = typeLabelToKey(field.type)
      if (!key) return
      if (!fieldsByInventory[field.inventoryId]) fieldsByInventory[field.inventoryId] = baseFields()
      const slots = fieldsByInventory[field.inventoryId][key]
      slots[field.slot - 1] = {
        title: field.title || '',
        showInTable: !!field.showInTable
      }
    })
  }

  const itemsWithFields = items.map(item => ({
    ...item,
    inventoryFields: fieldsByInventory[item.inventoryId] || null
  }))

  res.json({ inventories, items: itemsWithFields })
})

export default router
