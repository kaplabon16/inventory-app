export function requireAdmin(req, res, next) {
  const roles = (req.user?.roles || []).map(r => r.toLowerCase())
  if (!roles.includes('admin')) {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}
