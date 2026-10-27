// GET /api/ai?usage=1 — what THIS account has used of today's AI allowance.
//
// Hosted inside api/ai.js (no new function: tests/unit/account-deletion.test.js
// pins the count). The real count lives in Firestore `daily-usage/{uid}_{day}`
// and `daily-usage/{uid}_m{month}`, which firestore.rules default-denies to every
// client, so the browser could only ever guess from its own localStorage. This
// is the read path that was missing: token in, this account's numbers out.
//
// Contract:
//   no/invalid token   401, no numbers
//   signed in          200 { day, plan, used, limit, remaining, monthUsed, monthLimit, tools }
//                      `used` and friends are the BUSIEST daily tool's figures, the same
//                      shape a POST /api/ai response carries as `usage`, so
//                      aiQuota.reconcile() can take either.
//   always             Cache-Control: private, no-store; Vary: Authorization
//
// The day and the month are keyed on UTC, which is what the metering code in
// ai.js writes (Vercel runs in UTC, and these helpers make that explicit rather
// than an accident of the host). `deps` is injected so the unit test can fake the
// token, the user document and the usage documents.

import { planForUser, dailyLimitFor, monthlyLimitFor } from './plans.js'

/** The tools whose allowance is daily; the Brand Starter is metered another way. */
export const USAGE_TOOLS = Object.freeze(['alt-text', 'prompts-ai'])

const pad = (n) => String(n).padStart(2, '0')

/** The UTC day bucket, `daysAgo` back: YYYY-MM-DD. */
export function usageDayKey(now = new Date(), daysAgo = 0) {
  const d = new Date(now.getTime())
  if (daysAgo) d.setUTCDate(d.getUTCDate() - daysAgo)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** The UTC month bucket id: m + YYYY-MM, which can never collide with a day id. */
export function usageMonthKey(now = new Date()) {
  return `m${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`
}

const count = (n) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0)

/**
 * @param req   needs headers.authorization
 * @param res   a Vercel/Express-style response
 * @param deps  { verifyIdToken(token) -> decoded, readUser(uid) -> user doc data,
 *                readUsage(docIds[]) -> array of doc data (or {}) in the same order, now? }
 */
export async function serveUsage(req, res, { verifyIdToken, readUser, readUsage, now = new Date() }) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')

  const header = req.headers?.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' })

  let decoded
  try {
    decoded = await verifyIdToken(header.slice(7))
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' })
  }
  const uid = decoded?.uid
  if (!uid) return res.status(401).json({ error: 'Invalid or expired session' })

  const day = usageDayKey(now)
  try {
    const user = (await readUser(uid)) || {}
    const plan = planForUser({
      subscription: user.subscription || null,
      lifetimeEntitlement: user.lifetimeEntitlement || null,
      // Only a Firebase-verified email may claim an admin entitlement.
      email: decoded.email_verified ? decoded.email : null,
    })
    const [dayDoc, monthDoc] = await readUsage([`${uid}_${day}`, `${uid}_${usageMonthKey(now)}`])

    const tools = {}
    for (const id of USAGE_TOOLS) {
      const used = count(dayDoc?.[id])
      const limit = dailyLimitFor(plan, id)
      tools[id] = {
        used,
        limit,
        remaining: Math.max(0, limit - used),
        monthUsed: count(monthDoc?.[id]),
        monthLimit: monthlyLimitFor(plan, id),
      }
    }
    // The busiest tool is the one that tells someone how close they are to a refusal.
    const busiest = USAGE_TOOLS.reduce((a, b) => (tools[b].used > tools[a].used ? b : a))
    return res.status(200).json({ day, plan: plan.id, ...tools[busiest], tools })
  } catch (err) {
    console.error('usage: could not read the account usage', { error: err?.message, code: err?.code })
    return res.status(500).json({ error: 'Could not read your usage' })
  }
}
