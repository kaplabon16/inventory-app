// tools/generate-support-json-example.js
// Smoke test helper: uploads a sample support-ticket JSON to Dropbox using the
// same uploader as the backend route. Requires env vars used by backend uploader.

/* eslint-disable no-console */
const path = require('node:path')
const { pathToFileURL } = require('node:url')

async function main() {
  try {
    const modUrl = pathToFileURL(path.resolve(__dirname, '../backend/src/utils/storageUpload.js')).href
    const { uploadSupportJson } = await import(modUrl)

    const now = new Date().toISOString()
    const payload = {
      reported_by: { id: 'test-user-123', name: 'Test User', email: 'test@example.com' },
      inventory: { id: 'inv_demo_1', title: 'Demo Inventory' },
      link: 'https://example.com/app/inventories/inv_demo_1',
      priority: 'Average',
      summary: 'Test ticket from generate-support-json-example.js',
      created_at: now,
      id: `demo-${Date.now()}`,
    }

    console.log('[test] Uploading sample ticket JSON to Dropbox...')
    const uploaded = await uploadSupportJson({ filenamePrefix: 'support_ticket_test', json: payload })
    console.log('[test] Uploaded:', uploaded)
  } catch (e) {
    console.error('[test] Failed:', e?.message || e)
    process.exitCode = 1
  }
}

main()

