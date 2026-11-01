// Email the site owner when community submissions arrive, and let an administrator
// choose how often. Files in /api/_lib are not deployed as routes; api/support.js
// dispatches the two request types handled here (`community-submission` and
// `admin-settings`) so the 12-function budget stays untouched.
//
// Submissions are written straight to Firestore by the browser, so there is no
// server step to hang an email on. Instead the browser tells this route about a
// submission it has just made, and the route checks that claim against the
// stored document before counting it:
//
//   - the document exists, is `pending`, and belongs to the caller's uid;
//   - it was created in the last few minutes (an old document cannot be replayed);
//   - it has not been counted before (`notifiedAt` is set in the same
//     transaction that counts it, so a retry or a race counts it once).
//
// The counter and the settings live in one server-only document,
// `admin-settings/community-notify`. firestore.rules names no `admin-settings`
// path and has no wildcard match, so only the Admin SDK can read or write it.
//
// Everything that decides something is a pure function above the handler, so it
// is testable under `node --test` without Firestore or the network.

import { adminAuth, adminDb } from './firebase-admin.js'
import { isAdminEmail } from './adminEmails.js'
import { clientIp, consume } from './rateLimit.js'
import { mailFrom, REPLY_TO } from './mail.js'
import { DEFAULT_ORIGIN } from './origins.js'

export const NOTIFY_TYPES = Object.freeze(['community-submission', 'admin-settings'])

export const SETTINGS_COLLECTION = 'admin-settings'
export const SETTINGS_DOC = 'community-notify'

// The two collections a browser publishes to (src/utils/communityQueueApi.js).
export const NOTIFY_COLLECTIONS = Object.freeze(['community-submissions', 'community-prompts'])

// A submission is only counted if it is this new, so a stored document cannot be
// replayed into the counter long after the fact. A small allowance covers a
// clock that runs slightly ahead.
export const FRESH_MS = 10 * 60 * 1000
export const FUTURE_SKEW_MS = 2 * 60 * 1000

export const EVERY_N_MIN = 1
export const EVERY_N_MAX = 100

// How many waiting items are kept for the email body. The count itself is not
// capped; only the listing is.
export const PENDING_KEEP = 20

const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/
const HOUR_MS = 60 * 60 * 1000

// Limits. The browser's own post limits (a gap between posts and a daily cap) sit
// in front of this, so these only need to stop a script. Each has its own bucket,
// separate from the support form's, so a flood of submissions cannot use up the
// support allowance or the reverse.
export const IP_LIMIT = Object.freeze({ bucket: 'community-notify-ip', limit: 60, windowMs: HOUR_MS })
export const UID_LIMIT = Object.freeze({ bucket: 'community-notify-uid', limit: 20, windowMs: HOUR_MS })
export const ADMIN_UID_LIMIT = Object.freeze({ bucket: 'admin-settings-uid', limit: 120, windowMs: HOUR_MS })
// Site-wide ceiling on these emails. Over it, nothing is lost: the waiting items
// are put back and go out in the next email once the window rolls.
export const MAIL_CAP = Object.freeze({ bucket: 'community-notify-mail', key: 'all', limit: 6, windowMs: HOUR_MS })

const OUTBOUND_TIMEOUT_MS = 5000

// ── Pure helpers ─────────────────────────────────────────────────────────────

const oneLine = (text) => String(text).replace(/[\r\n\u{2028}\u{2029}]+/gu, ' ')

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A single trimmed line of at most `max` characters, or '' for anything that is not text. */
function clip(value, max) {
  return typeof value === 'string' ? oneLine(value).trim().slice(0, max) : ''
}

/** `{ collection, id }` from a request body, or null when either is not acceptable. */
export function parseNotifyBody(body) {
  if (!body || typeof body !== 'object') return null
  const { collection, id } = body
  if (typeof collection !== 'string' || !NOTIFY_COLLECTIONS.includes(collection)) return null
  if (typeof id !== 'string' || !DOC_ID_RE.test(id)) return null
  return { collection, id }
}

/**
 * When a stored post was made, in milliseconds. The server-stamped `submittedAt`
 * wins when the document has one; the browser-supplied `createdAt` is the
 * fallback. NaN when neither can be read.
 */
export function postedAtMs(data) {
  const stamp = data?.submittedAt
  if (stamp && typeof stamp.toMillis === 'function') return stamp.toMillis()
  if (stamp != null) return NaN
  return typeof data?.createdAt === 'string' ? Date.parse(data.createdAt) : NaN
}

/** True when the post was made within the last FRESH_MS (and not meaningfully in the future). */
export function isFresh(data, nowMs) {
  const at = postedAtMs(data)
  if (!Number.isFinite(at)) return false
  const age = nowMs - at
  return age <= FRESH_MS && age >= -FUTURE_SKEW_MS
}

/** The fields of one post kept for the email, cleaned and clipped. */
export function describePost(collection, data) {
  const isPrompt = collection === 'community-prompts'
  return {
    collection,
    kind: isPrompt ? 'prompt' : (clip(data?.kind, 24) || 'submission'),
    name: clip(isPrompt ? data?.title : data?.name, 80),
    authorName: clip(data?.authorName, 60),
    createdAt: clip(data?.createdAt, 40),
  }
}

/** The stored settings with every field coerced to something valid. */
export function readSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const everyN = Number.isInteger(src.everyN) && src.everyN >= EVERY_N_MIN && src.everyN <= EVERY_N_MAX ? src.everyN : 1
  const sinceLast = Number.isInteger(src.sinceLast) && src.sinceLast > 0 ? src.sinceLast : 0
  const pending = (Array.isArray(src.pending) ? src.pending : [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      collection: NOTIFY_COLLECTIONS.includes(item.collection) ? item.collection : 'community-submissions',
      kind: clip(item.kind, 24) || 'submission',
      name: clip(item.name, 80),
      authorName: clip(item.authorName, 60),
      createdAt: clip(item.createdAt, 40),
    }))
    .slice(-PENDING_KEEP)
  return { enabled: src.enabled !== false, everyN, sinceLast, pending }
}

/**
 * Count one more post. Returns the settings to store and, when the count has
 * reached the threshold, what to email (`send`) — in which case the stored count
 * and list are already reset.
 */
export function planCount(settings, item) {
  const s = readSettings(settings)
  const sinceLast = s.sinceLast + 1
  const pending = [...s.pending, item].slice(-PENDING_KEEP)
  if (sinceLast >= s.everyN) {
    return { next: { ...s, sinceLast: 0, pending: [] }, send: { total: sinceLast, items: pending } }
  }
  return { next: { ...s, sinceLast, pending }, send: null }
}

/** The settings with an email that did not go out put back, so it goes in the next one. */
export function planRestore(settings, send) {
  const s = readSettings(settings)
  return {
    ...s,
    sinceLast: s.sinceLast + send.total,
    pending: [...send.items, ...s.pending].slice(-PENDING_KEEP),
  }
}

/** `{ value: { enabled, everyN } }` or `{ error }` for an admin settings change. */
export function validateSettingsInput(body) {
  const { enabled, everyN } = body && typeof body === 'object' ? body : {}
  if (typeof enabled !== 'boolean') return { error: 'enabled must be true or false' }
  if (typeof everyN !== 'number' || !Number.isInteger(everyN) || everyN < EVERY_N_MIN || everyN > EVERY_N_MAX) {
    return { error: `everyN must be a whole number from ${EVERY_N_MIN} to ${EVERY_N_MAX}` }
  }
  return { value: { enabled, everyN } }
}

/** What the admin page is shown: the three settings, nothing else from the document. */
export function publicSettings(raw) {
  const { enabled, everyN, sinceLast } = readSettings(raw)
  return { enabled, everyN, sinceLast }
}

/**
 * The email: `{ subject, html }`. The subject carries only a number; everything a
 * visitor wrote appears in the body, escaped.
 */
export function buildDigest({ total, items }) {
  const count = Math.max(1, Number.isInteger(total) ? total : items.length)
  const subject = `[UIL4B community] ${count} new ${count === 1 ? 'submission' : 'submissions'} waiting`
  const rows = items.map((item) => {
    const where = item.collection === 'community-prompts' ? 'Prompts tab' : 'Community tab'
    const when = item.createdAt ? item.createdAt.slice(0, 16).replace('T', ' ') : ''
    return `
      <li style="margin:0 0 10px;padding:0">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:4px;background:#eef;color:#55e">${escHtml(item.kind)}</span>
        <strong style="font-size:14px"> ${escHtml(item.name || 'Untitled')}</strong>
        <div style="font-size:12px;color:#666;margin-top:2px">by ${escHtml(item.authorName || 'Unknown')}${when ? ` · ${escHtml(when)} UTC` : ''} · ${where}</div>
      </li>`
  }).join('')
  const more = count > items.length ? `<p style="font-size:12px;color:#666">and ${count - items.length} more.</p>` : ''
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#f8f8f6;border:1px solid #e5e5e0;border-radius:12px;padding:24px;margin-bottom:16px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 12px">${count} new ${count === 1 ? 'submission' : 'submissions'} waiting for review</h2>
        <ul style="list-style:none;margin:0 0 12px;padding:0">${rows}</ul>
        ${more}
        <p style="font-size:14px;margin:12px 0 0"><a href="${DEFAULT_ORIGIN}/admin">Open the admin page</a></p>
      </div>
      <p style="font-size:11px;color:#aaa;text-align:center">You can change how often this email is sent in the admin settings.</p>
    </div>`
  return { subject, html }
}

// ── Database steps ───────────────────────────────────────────────────────────

const settingsRef = (db) => db.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC)

/**
 * Check one claimed post and, if it qualifies, count it — all in one
 * transaction, so it is counted once however many times it is claimed.
 * Resolves `{ counted: false }` for anything that does not qualify (the caller
 * is told nothing about why), or `{ counted: true, send }`.
 */
export async function recordSubmission(db, { collection, id, uid, nowMs = Date.now() }) {
  return db.runTransaction(async (tx) => {
    const postRef = db.collection(collection).doc(id)
    const post = await tx.get(postRef)
    if (!post.exists) return { counted: false }
    const data = post.data() || {}
    if (data.authorUid !== uid || data.status !== 'pending') return { counted: false }
    if (data.notifiedAt != null || !isFresh(data, nowMs)) return { counted: false }

    const stored = await tx.get(settingsRef(db))
    const settings = readSettings(stored.exists ? stored.data() : null)
    if (!settings.enabled) return { counted: false }

    const { next, send } = planCount(settings, describePost(collection, data))
    tx.update(postRef, { notifiedAt: new Date(nowMs).toISOString() })
    tx.set(settingsRef(db), { ...next, updatedAt: new Date(nowMs).toISOString() })
    return { counted: true, send }
  })
}

/** Put an email that did not go out back on the counter. Never rejects. */
export async function restoreUnsent(db, send) {
  try {
    await db.runTransaction(async (tx) => {
      const stored = await tx.get(settingsRef(db))
      tx.set(settingsRef(db), planRestore(stored.exists ? stored.data() : null, send))
    })
  } catch (err) {
    console.error('community-notify: could not put unsent items back', err?.message)
  }
}

/** Read the settings (defaults when none are stored). */
export async function loadSettings(db) {
  const stored = await settingsRef(db).get()
  return stored.exists ? stored.data() : null
}

/** Save an administrator's change to the two settings, keeping the running count. */
export async function saveSettings(db, { enabled, everyN }, uid, nowMs = Date.now()) {
  return db.runTransaction(async (tx) => {
    const stored = await tx.get(settingsRef(db))
    const next = { ...readSettings(stored.exists ? stored.data() : null), enabled, everyN }
    tx.set(settingsRef(db), { ...next, updatedAt: new Date(nowMs).toISOString(), updatedBy: uid })
    return next
  })
}

// ── Sending ──────────────────────────────────────────────────────────────────

/**
 * Send one digest email. Resolves true when Resend took it; on a refusal by the
 * cap, a failed send or a thrown error it puts the items back and resolves false.
 * Never rejects.
 */
export async function sendDigest(db, { resendKey, notifyEmail, send }) {
  try {
    const verdict = await consume(db, MAIL_CAP)
    if (!verdict.allowed) {
      console.warn('community-notify: email held back, hourly cap reached or counter unavailable')
      await restoreUnsent(db, send)
      return false
    }
    const { subject, html } = buildDigest(send)
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(OUTBOUND_TIMEOUT_MS),
      body: JSON.stringify({ from: mailFrom(), reply_to: REPLY_TO, to: [notifyEmail], subject, html }),
    })
    if (!sent.ok) {
      console.error('community-notify: email was refused by the provider', sent.status)
      await restoreUnsent(db, send)
      return false
    }
    return true
  } catch (err) {
    console.error('community-notify: email send failed', err?.message)
    await restoreUnsent(db, send)
    return false
  }
}

// ── Request handling ─────────────────────────────────────────────────────────

const GENERIC_ERROR = 'Something went wrong. Try again shortly.'

function tooMany(res, verdict) {
  res.setHeader('Retry-After', String(verdict.retryAfter))
  return res.status(429).json({ error: 'Too many requests. Try again shortly.', retryAfter: verdict.retryAfter })
}

/**
 * Handle a `community-submission` or `admin-settings` request. The caller has
 * already dealt with CORS, the method and OPTIONS.
 *
 * `getDb`, `verifyToken` and `defer` are injectable for tests. `verifyToken` is
 * called as `(idToken, checkRevoked)`.
 */
export async function handleCommunityNotify(req, res, {
  getDb = adminDb,
  verifyToken = (token, checkRevoked) => adminAuth().verifyIdToken(token, checkRevoked),
  defer = (promise) => { promise.catch(() => {}) },
  now = Date.now,
} = {}) {
  try {
    const db = getDb()
    const type = req.body?.type

    const ipVerdict = await consume(db, { ...IP_LIMIT, key: clientIp(req) })
    if (!ipVerdict.allowed) return tooMany(res, ipVerdict)

    const header = req.headers?.authorization
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Sign in first.' })
    }
    let decoded
    try {
      decoded = await verifyToken(header.slice(7), true)
    } catch {
      return res.status(401).json({ error: 'Sign in first.' })
    }
    if (typeof decoded?.uid !== 'string' || !decoded.uid) return res.status(401).json({ error: 'Sign in first.' })

    if (type === 'admin-settings') return await handleAdminSettings(req, res, db, decoded)
    return await handleSubmission(req, res, db, decoded, { defer, now })
  } catch (err) {
    console.error('community-notify: request failed', err?.message)
    return res.status(500).json({ error: GENERIC_ERROR })
  }
}

async function handleSubmission(req, res, db, decoded, { defer, now }) {
  const target = parseNotifyBody(req.body)
  if (!target) return res.status(400).json({ error: 'Not a valid request.' })

  const verdict = await consume(db, { ...UID_LIMIT, key: decoded.uid })
  if (!verdict.allowed) return tooMany(res, verdict)

  // Nothing is counted (and so nothing lost) while there is nowhere to send it.
  const resendKey = process.env.RESEND_API_KEY
  const notifyEmail = process.env.SUPPORT_NOTIFY_EMAIL
  if (!resendKey || !notifyEmail) return res.status(200).json({ ok: true })

  const outcome = await recordSubmission(db, { ...target, uid: decoded.uid, nowMs: now() })
  if (outcome.send) defer(sendDigest(db, { resendKey, notifyEmail, send: outcome.send }))

  // The same answer whether or not the post was counted, so the response says
  // nothing about documents the caller does not own.
  return res.status(200).json({ ok: true })
}

async function handleAdminSettings(req, res, db, decoded) {
  // An administrator is a verified email on the ADMIN_EMAILS allowlist — the
  // same test api/verify-admin.js applies. A moderator is not enough.
  if (decoded.email_verified !== true || !isAdminEmail(decoded.email)) {
    return res.status(403).json({ error: 'Only an administrator can change this.' })
  }
  const verdict = await consume(db, { ...ADMIN_UID_LIMIT, key: decoded.uid })
  if (!verdict.allowed) return tooMany(res, verdict)

  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.SUPPORT_NOTIFY_EMAIL)
  const action = req.body?.action

  if (action === 'get') {
    return res.status(200).json({ ok: true, ...publicSettings(await loadSettings(db)), emailConfigured })
  }
  if (action === 'set') {
    const checked = validateSettingsInput(req.body)
    if (checked.error) return res.status(400).json({ error: checked.error })
    const saved = await saveSettings(db, checked.value, decoded.uid)
    return res.status(200).json({ ok: true, ...publicSettings(saved), emailConfigured })
  }
  return res.status(400).json({ error: 'Unknown action.' })
}
