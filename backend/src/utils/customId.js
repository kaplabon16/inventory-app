// src/utils/customId.js
import crypto from 'node:crypto'
import dayjs from 'dayjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helpers
function randHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase()
}
function randDigits(len) {
  // Produce exactly len digits (no leading space, can start with 0)
  let out = ''
  while (out.length < len) {
    out += (crypto.randomInt(0, 1_000_000_000) + '').padStart(9, '0')
  }
  return out.slice(0, len)
}
function randBitsBase32(bits) {
  // Generate >= bits random bits, encode base32-ish from hex
  const bytes = Math.ceil(bits / 8)
  const hex = randHex(bytes).toLowerCase()
  // Convert hex -> base32 (RFC 4648 alphabet) quickly via BigInt
  const b = BigInt('0x' + hex)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let out = ''
  let tmp = b
  if (tmp === 0n) return 'A'
  while (tmp > 0n) {
    const idx = Number(tmp % 32n)
    out = alphabet[idx] + out
    tmp = tmp / 32n
  }
  // ensure ~bits worth (not strictly required)
  return out
}

function formatDate(param) {
  const fmt = (param && String(param).trim()) || 'YYYYMMDD-HHmmss'
  return dayjs().format(fmt)
}

function padSeq(n, pattern) {
  // pattern like "001" -> pad length 3
  const len = /^\d+$/.test(pattern) ? pattern.length : 3
  return String(n).padStart(len, '0')
}

/**
 * Build a custom ID for an inventory based on its configured elements.
 * Fallback: FIXED "INV-" + RAND32 + SEQ "001"
 */
export async function generateCustomId(inventoryId) {
  // Load pattern
  const elements = await prisma.customIdElement.findMany({
    where: { inventoryId },
    orderBy: { order: 'asc' }
  })

  const elems = elements?.length
    ? elements
    : [
        { order: 1, type: 'FIXED', param: 'INV-' },
        { order: 2, type: 'RAND32', param: '' },
        { order: 3, type: 'SEQ', param: '001' }
      ]

  // Pre-calc seq number as (#items + 1)
  const count = await prisma.item.count({ where: { inventoryId } })
  const nextSeq = count + 1

  const parts = []

  for (const e of elems) {
    const type = (e.type || '').toUpperCase()
    const p = e.param || ''

    switch (type) {
      case 'FIXED':
        parts.push(String(p))
        break
      case 'RAND20':
        // ~20 random bits -> short base32 token
        parts.push(randBitsBase32(20))
        break
      case 'RAND32':
        // 32 bits -> 4 bytes -> 8 hex
        parts.push(randHex(4))
        break
      case 'RAND6':
        parts.push(randDigits(6))
        break
      case 'RAND9':
        parts.push(randDigits(9))
        break
      case 'GUID':
        parts.push(crypto.randomUUID().toUpperCase())
        break
      case 'DATE':
        parts.push(formatDate(p))
        break
      case 'SEQ':
        parts.push(padSeq(nextSeq, p || '001'))
        break
      default:
        // Unknown type: ignore safely
        break
    }
  }

  return parts.join('')
}
