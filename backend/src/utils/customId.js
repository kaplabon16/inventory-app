import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

function randHex(bits) {
  const max = 2 ** bits
  return Math.floor(Math.random() * max).toString(16).toUpperCase()
}
function randDigits(n) {
  return String(Math.floor(Math.random() * (10 ** n))).padStart(n, '0')
}

export async function nextSequence(inventoryId, fmt = '0001') {
  const res = await prisma.$transaction(async (tx) => {
    let seq = await tx.sequence.findUnique({ where: { inventoryId } })
    if (!seq) seq = await tx.sequence.create({ data: { inventoryId, value: 0 } })
    const next = seq.value + 1
    await tx.sequence.update({ where: { inventoryId }, data: { value: next } })
    return next
  })
  return String(res).padStart(fmt.length, '0')
}

export async function generateCustomId(inventoryId) {
  const elems = await prisma.customIdElement.findMany({
    where: { inventoryId },
    orderBy: { order: 'asc' }
  })
  const parts = []
  for (const el of elems) {
    switch (el.type) {
      case 'FIXED': parts.push(el.param || ''); break
      case 'RAND20': parts.push(randHex(20)); break
      case 'RAND32': parts.push(randHex(32)); break
      case 'RAND6': parts.push(randDigits(6)); break
      case 'RAND9': parts.push(randDigits(9)); break
      case 'GUID': parts.push(randomUUID().toUpperCase()); break
      case 'DATE': parts.push(dayjs().format(el.param || 'YYYY')); break
      case 'SEQ': parts.push(await nextSequence(inventoryId, el.param || '0001')); break
      default: break
    }
  }
  return parts.join('')
}
