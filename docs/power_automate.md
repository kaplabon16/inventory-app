# Power Automate: Support Ticket Flow (Dropbox)

This guide sets up a Power Automate cloud flow that reacts to support-ticket JSON files uploaded by the backend uploader or the test script.

Prerequisites
- Dropbox account with a folder: `/SupportTickets` (subfolders per YYYY/MM are created automatically).
- Backend env: `SUPPORT_UPLOAD_PROVIDER=dropbox` and Dropbox credentials (`DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN`).
- Optional: Distribution list for notifications (e.g., support@company.com).

Flow steps
- Trigger: When a file is created (Dropbox)
  - Folder: `/SupportTickets` (include subfolders)
- Action: Get file content
- Action: Parse JSON
  - Use the schema below (matches backend payload):

```
{
  "type": "object",
  "properties": {
    "reported_by": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "email": { "type": "string" }
      },
      "required": ["id","name","email"]
    },
    "inventory": {
      "type": ["object", "null"],
      "properties": {
        "id": { "type": "string" },
        "title": { "type": "string" }
      }
    },
    "link": { "type": "string" },
    "priority": { "type": "string" },
    "summary": { "type": "string" },
    "created_at": { "type": "string" },
    "id": { "type": "string" }
  },
  "required": ["reported_by","priority","summary","created_at","id"]
}
```

- Action: Send email (Outlook)
  - To: your support list (e.g., SUPPORT_ADMIN_EMAILS)
  - Subject: `Support ticket: @{body('Parse_JSON')?['priority']} — @{body('Parse_JSON')?['summary']}`
  - Body: include fields like reporter email, inventory title, link, created_at.
- Action: Send me a mobile notification
  - Text: `Support ticket (@{body('Parse_JSON')?['priority']}): @{body('Parse_JSON')?['summary']}`

Sample payload
```
{
  "reported_by": { "id": "u_123", "name": "Jane Doe", "email": "jane@example.com" },
  "inventory": { "id": "inv_abc", "title": "Field Equipment" },
  "link": "https://your-app.example.com/inventories/inv_abc",
  "priority": "High",
  "summary": "Broken cable on device XYZ",
  "created_at": "2024-09-01T12:34:56.789Z",
  "id": "ticket-20240901-xyz"
}
```

Testing
- Run `node tools/generate-support-json-example.js` to upload a sample JSON file to Dropbox.
- Verify the flow run succeeded, check email delivery, and receive the mobile notification.

Troubleshooting
- If the flow doesn’t trigger, confirm the Dropbox connector watches the correct parent folder and includes subfolders.
- Ensure the JSON content is not empty and matches the schema (update the schema if you add fields).
- For public links, the uploader attempts to create/reuse a shared link; if `url` is null, you can still fetch the file via Dropbox in the flow.

