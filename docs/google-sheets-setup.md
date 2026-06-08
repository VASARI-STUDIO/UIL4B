# Collecting feedback in Google Sheets

Every feedback/support submission is already saved to Firestore and is visible in
the in-app **Admin dashboard** (`/admin`). This guide adds an optional live mirror
of every submission into a Google Sheet you own, so you can sort, filter, and share
it like any spreadsheet.

There are two ways to get feedback into Sheets:

- **Live sync (recommended)** — every new submission is appended to your sheet
  automatically. One-time setup below.
- **Manual export** — click **Export CSV** in the Admin dashboard and import the
  file into Sheets (`File → Import`). No setup required; good as a fallback.

---

## Live sync setup (~5 minutes)

### 1. Create the sheet
1. Go to <https://sheets.new> and name it e.g. **UIL4B Feedback**.
2. In row 1, add these headers (column order matters):

   | A | B | C | D | E | F | G |
   |---|---|---|---|---|---|---|
   | createdAt | type | status | subject | message | email | source |

### 2. Add the Apps Script
1. In the sheet: **Extensions → Apps Script**.
2. Delete the placeholder and paste:

   ```js
   // Shared secret — must match GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel.
   const SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING'

   function doPost(e) {
     try {
       const body = JSON.parse(e.postData.contents || '{}')
       if (SECRET && body.secret !== SECRET) {
         return ContentService.createTextOutput('forbidden').setStatusCode?.(403) ||
                ContentService.createTextOutput('forbidden')
       }
       const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
       sheet.appendRow([
         body.createdAt || new Date().toISOString(),
         body.type || '',
         body.status || '',
         body.subject || '',
         body.message || '',
         body.email || '',
         body.source || '',
       ])
       return ContentService.createTextOutput('ok')
     } catch (err) {
       return ContentService.createTextOutput('error: ' + err.message)
     }
   }
   ```

3. Replace `CHANGE_ME_TO_A_LONG_RANDOM_STRING` with a long random string and keep it handy.

### 3. Deploy as a web app
1. **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. **Deploy**, authorise, and copy the **Web app URL** (ends in `/exec`).

### 4. Add the env vars in Vercel
In your Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `GOOGLE_SHEETS_WEBHOOK_URL` | the `/exec` URL from step 3 |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | the same random string from step 2 |

Redeploy. From then on, every submission is appended to your sheet in real time,
in addition to Firestore and the in-app Admin dashboard.

---

## Notes
- The shared secret stops random people from writing to your sheet. If you ever
  rotate it, update both the Apps Script and the Vercel env var.
- The Apps Script appends to the **first** sheet/tab in the spreadsheet.
- Existing submissions (made before live sync was enabled) are not back-filled —
  use **Export CSV** in Admin for a full historical dump.
