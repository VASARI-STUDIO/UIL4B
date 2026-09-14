import { adminDb } from './_lib/firebase-admin.js'
import { allowedOrigins } from './_lib/origins.js'
import { clientIp, consume } from './_lib/rateLimit.js'
import { mailFrom, REPLY_TO } from './_lib/mail.js'

// THE BOOTSTRAP IS SHARED, NOT COPIED. This file used to carry its own
// initializeApp(): a bare JSON.parse of FIREBASE_SERVICE_ACCOUNT_KEY inside a
// catch that fell back to no credential, and a hard-coded projectId of 'uil4b'.
// Both diverged from api/_lib/firebase-admin.js, which every other route uses,
// and both were MEASURED before this was changed (2026-09-06 engineering
// review, probe against the real module with a generated service account):
//
//   • A base64-encoded key — the form _lib documents as the SAFER one to store,
//     because a raw paste mangles the PEM line breaks — failed JSON.parse here,
//     fell into the catch, and this route booted on ApplicationDefaultCredential
//     with no service account at all, while _lib read the same value fine.
//   • The explicit projectId overrode the service account's own project_id, so
//     with VITE_FIREBASE_PROJECT_ID unset in the function environment this
//     route addressed project 'uil4b' while _lib addressed 'uil4b-357c5'.
//
// Either way the Firestore write failed, `stored` stayed false, and a bug
// report reached anyone only if the optional Resend email happened to be
// configured. One bootstrap, one set of encodings, one project id.

const VALID_TYPES = ['bug', 'feature', 'general', 'help']
const VALID_SOURCES = ['feedback-form', 'inline', 'email']

export const MESSAGE_MAX = 5000
export const SUBJECT_MAX = 200
export const EMAIL_MAX = 254
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate and shape one submission. Pure, so the rules are testable under
 * `node --test` without Firestore in the room (tests/unit/support-validation.test.js).
 * Returns `{ error }` for a 400, or `{ entry }` — the document to store.
 *
 * Every field is TYPE-CHECKED before it is measured. The old code called
 * `message.length` and `message.trim()` on whatever arrived: `{"message":["x"]}`
 * passes `!message`, then `.trim()` throws a TypeError out of the handler, which
 * Vercel reports as a 500 and logs as a crash — reachable unauthenticated, on
 * demand, from the one endpoint that takes no session. A malformed body is a
 * 400, never an exception.
 */
export function validateSupportBody(body, now = new Date()) {
  const { type, subject, message, email, source } = body && typeof body === 'object' ? body : {}

  if (typeof message !== 'string' || !message.trim()) {
    return { error: 'Message is required' }
  }
  if (message.length > MESSAGE_MAX) {
    return { error: `Message must be under ${MESSAGE_MAX} characters` }
  }
  if (subject != null && typeof subject !== 'string') {
    return { error: 'Subject must be text' }
  }
  if (subject && subject.length > SUBJECT_MAX) {
    return { error: `Subject must be under ${SUBJECT_MAX} characters` }
  }
  if (email != null && email !== '' && (typeof email !== 'string' || email.length > EMAIL_MAX || !EMAIL_RE.test(email))) {
    return { error: 'Invalid email format' }
  }

  const safeType = VALID_TYPES.includes(type) ? type : 'general'
  const safeSource = VALID_SOURCES.includes(source) ? source : 'feedback-form'
  const stamp = now.toISOString()

  return {
    entry: {
      type: safeType,
      subject: (subject || '').trim().slice(0, SUBJECT_MAX) || `[${safeType}] Submission`,
      message: message.trim().slice(0, MESSAGE_MAX),
      email: (email || '').trim().slice(0, EMAIL_MAX),
      source: safeSource,
      status: 'new',
      adminNotes: '',
      createdAt: stamp,
      updatedAt: stamp,
    },
  }
}

// ── Abuse limits ─────────────────────────────────────────────────────────────
// This endpoint takes no authentication — deliberately, because the people most
// likely to need it are the ones who cannot sign in — and it fans one anonymous
// POST out to a Firestore write, an optional Google Sheets webhook and an
// outbound Resend email. That is three metered services per request, reachable
// by anyone, in a loop.
//
// Two windows, because they catch different things. The burst window stops a
// script hammering the form; the hourly window stops a slow drip that stays
// under the burst limit all day. Both are per-IP.
const BURST = { limit: 3, windowMs: 60 * 1000 }
const HOURLY = { limit: 15, windowMs: 60 * 60 * 1000 }

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  // `Access-Control-Allow-Origin: *` invited every page on the internet to POST
  // here from a visitor's browser. The allowlist is the same one the Stripe
  // flows use. Note what this does and does not buy: CORS is a browser
  // protection, so it stops a hostile page using someone else's browser as the
  // sender — it does nothing against curl. The rate limit below is what covers
  // that, and the two are not interchangeable.
  const origin = req.headers.origin
  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Resolved here rather than at module scope so a credential problem surfaces
  // as a logged failure on the request that hit it, not as an import-time
  // crash that takes the whole route down with an opaque FUNCTION_INVOCATION_FAILED.
  const db = adminDb()

  const ip = clientIp(req)
  for (const window of [BURST, HOURLY]) {
    const verdict = await consume(db, { bucket: 'support', key: `${ip}_${window.windowMs}`, ...window })
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfter))
      return res.status(429).json({
        error: 'Too many messages from this connection. Try again shortly — or email support directly.',
        retryAfter: verdict.retryAfter,
      })
    }
  }

  // The server contract: exactly these five fields, everything else dropped.
  // tests/unit/report-context.test.js pins this line — the feedback modal folds
  // its captured context into `message` precisely so the contract never grows.
  const { type, subject, message, email, source } = req.body || {}
  const validated = validateSupportBody({ type, subject, message, email, source })
  if (validated.error) {
    return res.status(400).json({ error: validated.error })
  }
  const { entry } = validated

  // Whether the message actually landed anywhere. A failed Firestore write used
  // to be logged and then answered with `{ ok: true }` — the user was told their
  // bug report had been received when it had been dropped. The response at the
  // end is now conditional on this.
  let stored = false
  try {
    await db.collection('feedback').add(entry)
    stored = true
  } catch (err) {
    console.error('Firestore write failed:', err.message)
  }

  // Append to a Google Sheet via an Apps Script web app (optional).
  // Optional legacy mirror: set the server-only GOOGLE_SHEETS_WEBHOOK_URL and
  // GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel to enable.
  const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (sheetsWebhook) {
    try {
      await fetch(sheetsWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || '',
          createdAt: entry.createdAt,
          type: entry.type,
          status: entry.status,
          subject: entry.subject,
          message: entry.message,
          email: entry.email,
          source: entry.source,
        }),
      })
    } catch (err) {
      console.error('Google Sheets append failed:', err.message)
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL

  let emailed = false
  if (resendKey && notifyEmail) {
    try {
      const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: mailFrom(),
          // A reply reaches the real mailbox even while `from` is still the
          // Resend sandbox, because reply_to needs no verified domain.
          reply_to: REPLY_TO,
          to: [notifyEmail],
          subject: `[UIL4B ${entry.type}] ${entry.subject}`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
              <div style="background:#f8f8f6;border:1px solid #e5e5e0;border-radius:12px;padding:24px;margin-bottom:16px">
                <div style="display:flex;gap:8px;margin-bottom:12px">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:4px;background:#eef;color:#55e">${escHtml(entry.type)}</span>
                  <span style="font-size:11px;color:#888">${escHtml(entry.source)}</span>
                </div>
                <h2 style="font-size:18px;font-weight:700;margin:0 0 8px">${escHtml(entry.subject)}</h2>
                <p style="font-size:14px;line-height:1.6;color:#333;white-space:pre-wrap">${escHtml(entry.message)}</p>
                ${entry.email ? `<p style="font-size:12px;color:#666;margin-top:12px">From: <strong>${escHtml(entry.email)}</strong></p>` : ''}
              </div>
              <p style="font-size:11px;color:#aaa;text-align:center">UIL4B Support · ${new Date().toISOString().slice(0, 16)}</p>
            </div>
          `,
        }),
      })
      emailed = sent.ok
    } catch (err) {
      console.error('Email send failed:', err.message)
    }
  }

  // Every downstream is optional except the record itself, so "delivered" means
  // at least one of them took it. Nothing else in this handler is allowed to
  // turn a dropped message into a green tick.
  if (!stored && !emailed) {
    return res.status(502).json({ error: 'We could not record that message. Please try again shortly.' })
  }
  return res.status(200).json({ ok: true })
}
