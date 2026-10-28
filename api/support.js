import { adminDb } from './_lib/firebase-admin.js'
import { allowedOrigins } from './_lib/origins.js'
import { clientIp, consume } from './_lib/rateLimit.js'
import { mailFrom, REPLY_TO } from './_lib/mail.js'
import { waitUntil } from '@vercel/functions'

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

// A site-wide ceiling on notification emails to the founder, on top of the
// per-address limits above: many addresses together can still send a flood, and
// every email spends Resend quota and sending reputation. Over the ceiling the
// message is still stored and the sender still sees success, but no email goes.
export const MAIL_CAP = Object.freeze({ bucket: 'support-mail-global', key: 'all', limit: 30, windowMs: 60 * 60 * 1000 })

// One "the cap was reached" email an hour, so a spent cap is visible to the
// founder instead of silent. Counted separately and never against MAIL_CAP.
export const MAIL_CAP_NOTICE = Object.freeze({ bucket: 'support-mail-capnotice', key: 'all', limit: 1, windowMs: 60 * 60 * 1000 })

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Idempotency ──────────────────────────────────────────────────────────────
// A client may send `requestId`: a random token it generates once per message
// and reuses for every attempt at sending that message. It becomes the id of
// the stored document and is written with create(), which fails if the id
// already exists, so the same message is stored (and mirrored, and emailed) at
// most once however many times it arrives. Without a requestId the document
// gets an automatic id, as before.
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{16,64}$/

export function parseRequestId(value) {
  return typeof value === 'string' && REQUEST_ID_RE.test(value) ? value : null
}

function isAlreadyExists(err) {
  return err?.code === 6 || err?.code === 'already-exists' || /ALREADY_EXISTS/.test(String(err?.message || ''))
}

// Bounds each outbound call so one slow service cannot hold the invocation open.
const OUTBOUND_TIMEOUT_MS = 5000

// The notice sent when MAIL_CAP is spent. It never carries anything a visitor
// wrote. Resolves to whether Resend took it; never rejects.
async function sendCapNotice({ resendKey, notifyEmail }) {
  try {
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
      body: JSON.stringify({
        from: mailFrom(),
        reply_to: REPLY_TO,
        to: [notifyEmail],
        subject: '[UIL4B] Support email cap reached',
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <p style="font-size:14px;line-height:1.6;color:#333">The hourly cap of ${MAIL_CAP.limit} support notification emails was reached. Further messages this hour are held in the <code>feedback</code> collection and are not emailed.</p>
          </div>
        `,
      }),
    })
    return sent.ok
  } catch (err) {
    console.error('Cap notice email failed:', err.message)
    return false
  }
}

export default function handler(req, res) {
  return handleSupport(req, res)
}

// The handler body, with the database lookup and the after-response scheduler
// injectable for tests.
export async function handleSupport(req, res, { getDb = adminDb, defer = waitUntil } = {}) {
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
  const db = getDb()

  const ip = clientIp(req)
  for (const window of [BURST, HOURLY]) {
    const verdict = await consume(db, { bucket: 'support', key: `${ip}_${window.windowMs}`, ...window })
    if (!verdict.allowed) {
      res.setHeader('Retry-After', String(verdict.retryAfter))
      return res.status(429).json({
        // `contended` is a burst that could not be counted, not a spent allowance.
        error: verdict.contended
          ? 'The support form is busy. Try again in a few seconds — or email support directly.'
          : 'Too many messages from this connection. Try again shortly — or email support directly.',
        retryAfter: verdict.retryAfter,
      })
    }
  }

  // The message contract: exactly these five fields, everything else dropped.
  // tests/unit/report-context.test.js pins this line — the feedback modal folds
  // its captured context into `message` precisely so the contract never grows.
  // `requestId` is not message content; it is read on its own below.
  const { type, subject, message, email, source } = req.body || {}
  const validated = validateSupportBody({ type, subject, message, email, source })
  if (validated.error) {
    return res.status(400).json({ error: validated.error })
  }
  const { entry } = validated
  const requestId = parseRequestId(req.body?.requestId)

  // Whether the record landed in the database. It decides how the response is
  // sent below: a stored message is confirmed straight away, while an unstored
  // one is only confirmed if the email reaches someone.
  let stored = false
  try {
    if (requestId) await db.collection('feedback').doc(requestId).create(entry)
    else await db.collection('feedback').add(entry)
    stored = true
  } catch (err) {
    if (requestId && isAlreadyExists(err)) {
      // This message is already stored, and was mirrored and emailed by the
      // attempt that stored it. Confirm it without repeating either.
      return res.status(200).json({ ok: true, duplicate: true })
    }
    console.error('Firestore write failed:', err.message)
  }

  // The two notifications are independent of each other, so they run together
  // and each is bounded by OUTBOUND_TIMEOUT_MS. Neither one rejects: each
  // catches and logs its own failure.

  // Append to a Google Sheet via an Apps Script web app (optional).
  // Optional legacy mirror: set the server-only GOOGLE_SHEETS_WEBHOOK_URL and
  // GOOGLE_SHEETS_WEBHOOK_SECRET in Vercel to enable.
  const sheetsWebhook = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  const mirrored = sheetsWebhook ? (async () => {
    try {
      await fetch(sheetsWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
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
  })() : null

  const resendKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL

  // The cap applies only to a stored message. An unstored one has the email as
  // its only copy (see below), so that email is never held back.
  let mailAllowed = Boolean(resendKey && notifyEmail)
  let capNotice = null
  if (mailAllowed && stored) {
    const verdict = await consume(db, MAIL_CAP)
    if (!verdict.allowed) {
      mailAllowed = false
      if (verdict.contended) {
        // The counter could not be read or updated (an outage, contention, or a
        // missing salt in production): the allowance is not known to be spent,
        // so this is neither logged as the cap nor announced to the founder.
        console.warn('support: founder email skipped, the cap counter could not be used', { retryAfter: verdict.retryAfter })
      } else {
        console.warn('support: founder email skipped, site-wide hourly cap reached', { cap: MAIL_CAP.limit, retryAfter: verdict.retryAfter })
        // The cap itself must not hide that messages are arriving unseen, so the
        // founder gets one notice an hour. It is exempt from MAIL_CAP and holds
        // no user content.
        const notice = await consume(db, MAIL_CAP_NOTICE)
        if (notice.allowed) capNotice = sendCapNotice({ resendKey, notifyEmail })
      }
    }
  }

  const mailed = mailAllowed ? (async () => {
    try {
      const sent = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
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
      return sent.ok
    } catch (err) {
      console.error('Email send failed:', err.message)
      return false
    }
  })() : null

  const notifications = Promise.all([mirrored, mailed, capNotice])

  // A stored message is already safe, and the notifications are best-effort
  // extras, so the reply does not wait for them: they finish after the response
  // is sent, kept alive by the platform's after-response hook.
  if (stored) {
    defer(notifications)
    return res.status(200).json({ ok: true })
  }

  // Not stored: the email is the only copy, so wait for it. Every downstream is
  // optional except the record itself, so "delivered" means at least one of
  // them took it. A dropped message is never answered with a green tick.
  const [, emailed] = await notifications
  if (!emailed) {
    return res.status(502).json({ error: 'We could not record that message. Please try again shortly.' })
  }
  return res.status(200).json({ ok: true })
}
