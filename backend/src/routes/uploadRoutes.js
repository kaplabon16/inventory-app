import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'

const router = Router()

const UP = path.resolve('uploads')
if (!fs.existsSync(UP)) fs.mkdirSync(UP, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UP),
  filename: (_req, file, cb) => {
    const ts = Date.now()
    const safe = file.originalname.replace(/[^a-z0-9_.-]/gi, '_')
    cb(null, `${ts}_${safe}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)) {
      return cb(new Error('Only image files are allowed'))
    }
    cb(null, true)
  }
})

router.post('/', upload.single('file'), (req, res) => {
  const base = (process.env.PUBLIC_BASE || '').replace(/\/+$/, '')
  // When hosted on Railway, the public base is the same as API origin.
  const filePath = `/uploads/${req.file.filename}`
  const url = base ? `${base}${filePath}` : filePath
  res.json({ url })
})

export default router

