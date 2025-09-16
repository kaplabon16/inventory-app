
import fs from 'fs'
import path from 'path'

const TOKEN_FILE = path.resolve('sf_tokens.json')

function readStore() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return {}
    const raw = fs.readFileSync(TOKEN_FILE, 'utf8')
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function writeStore(obj) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(obj, null, 2), 'utf8')
}

export function getTokenForUser(userId) {
  const store = readStore()
  return store[userId] || null
}

export function saveTokenForUser(userId, payload) {
  const store = readStore()
  store[userId] = { ...payload, savedAt: new Date().toISOString() }
  writeStore(store)
}
