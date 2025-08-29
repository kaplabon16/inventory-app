import jwt from 'jsonwebtoken'

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' })
}

export function optionalAuth(req, _res, next) {
  try {
    const token =
      (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7)) ||
      req.cookies?.token
    if (!token) return next()
    const user = jwt.verify(token, process.env.JWT_SECRET)
    req.user = user
  } catch { /* ignore invalid */ }
  next()
}

export function requireAuth(req, res, next) {
  try {
    const token =
      (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.slice(7)) ||
      req.cookies?.token
    if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' })
    const user = jwt.verify(token, process.env.JWT_SECRET)
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }
}
