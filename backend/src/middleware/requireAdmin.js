export function requireAdmin(req, res, next) {
  if (!req.user?.roles?.includes('ADMIN')) {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}
