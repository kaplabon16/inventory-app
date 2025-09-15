# Backend

Environment
- SUPPORT_UPLOAD_PROVIDER=dropbox
- DROPBOX_APP_KEY=... (used by Dropbox OAuth2 refresh)
- DROPBOX_APP_SECRET=... (used by Dropbox OAuth2 refresh)
- DROPBOX_REFRESH_TOKEN=... (long-lived refresh token)
- ADMIN_EMAILS=admin@example.com,ops@example.com (used to include admins in ticket payload when available)
- Optionally document as SUPPORT_ADMIN_EMAILS in Power Automate docs; code currently reads ADMIN_EMAILS.

Support ticket JSON uploader (Dropbox)
- The uploader writes JSON files under `/SupportTickets/<YYYY>/<MM>/support_ticket-<timestamp>.json` in Dropbox.
- Returned object: `{ provider: 'dropbox', path, url }` where `url` is a public shared link when available.

Test script
- Run: `node tools/generate-support-json-example.js`
- Requirements: set `SUPPORT_UPLOAD_PROVIDER=dropbox` and Dropbox env vars above.
- Expected: script prints the uploaded `{ provider, path, url }` and you can open the link in a browser.

Power Automate
- See `docs/power_automate.md` for a ready-to-use flow that watches the Dropbox folder, parses the JSON payload, and sends notifications.

