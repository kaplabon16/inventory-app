import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../services/prisma.js'
import { isOwnerOrAdmin, canWriteInventory } from '../utils/validators.js'
import { v2 as cloudinary } from 'cloudinary'

const router = Router()

const hasCloud = !!process.env.CLOUDINARY_URL || (
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
)
if (!process.env.CLOUDINARY_URL && hasCloud) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

const UP = path.resolve('uploads')
if (!fs.existsSync(UP)) fs.mkdirSync(UP, { recursive: true })

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)) {
      return cb(new Error('Only image files are allowed'))
    }
    cb(null, true)
  }
})

router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const inventoryId = (req.query.inventoryId || req.body.inventoryId || '').toString().trim()
    if (!inventoryId) return res.status(400).json({ error: 'Missing inventoryId' })

    const [inv, access] = await Promise.all([
      prisma.inventory.findUnique({ where: { id: inventoryId } }),
      prisma.inventoryAccess.findMany({ where: { inventoryId } }),
    ])
    if (!inv) return res.status(404).json({ error: 'Inventory not found' })

    // ✅ allow anyone with write permission (owner/admin/public-write/access list)
    if (!canWriteInventory(req.user, inv, access)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!req.file) return res.status(400).json({ error: 'No file' })

    if (hasCloud) {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `inventory/${inventoryId}`, resource_type: 'image' },
        (err, result) => {
          if (err) {
            console.error('[cloudinary]', err)
            return res.status(500).json({ error: 'Upload failed' })
          }
          return res.json({ url: result.secure_url })
        }
      )
      stream.end(req.file.buffer)
      return
    }

    // fallback: local FS
    const ts = Date.now()
    const safe = (req.file.originalname || 'file').replace(/[^a-z0-9_.-]/gi, '_')
    const filename = `${ts}_${safe}`
    const filePath = path.join(UP, filename)
    fs.writeFileSync(filePath, req.file.buffer)
    const base = (process.env.PUBLIC_BASE || '').replace(/\/+$/, '')
    const rel = `/uploads/${filename}`
    const url = base ? `${base}${rel}` : rel
    res.json({ url })
  } catch (e) {
    console.error('[upload]', e)
    res.status(500).json({ error: 'Upload failed' })
  }
})

export default router
