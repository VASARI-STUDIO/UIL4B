// What the user was looking at when something went wrong.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY (docs/PROPOSALS.md P-002, APPROVED)
// ─────────────────────────────────────────────────────────────────────────────
// The proposal: "When a tool misbehaves, a user's only options are to leave or
// to email. Most leave. We then learn nothing, and silent churn leaves no
// review — so the absence of complaints reads, wrongly, as satisfaction."
//
// There IS a feedback modal reachable from every page. What it does not do is
// record WHERE the user was. Every report arrives as free text with no route,
// no tool and no state, so acting on one means a round trip asking "which page
// were you on?" — and most people do not reply to that.
//
// The proposal names this as the mitigation for the obvious risk too: low
// quality volume is "mitigated by capturing context automatically so the user
// need not describe it".
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS DELIBERATELY NOT CAPTURED
// ─────────────────────────────────────────────────────────────────────────────
// No document content, no palette colours, no prompt text, no project names,
// no localStorage dump. A bug report is not consent to send someone's work, and
// a support inbox is a much weaker place to hold it than the user's own browser.
// Only what is needed to REPRODUCE: the route, the tool, the viewport, the plan
// tier and whether they were signed in.
//
// The query string is dropped for the same reason — the colour tools encode
// full palettes into `?c=`, so keeping it would smuggle the user's work back in
// through the URL.
//
// DOM-free: takes plain values so it can be tested directly.

const MAX_VALUE = 60

const clean = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_VALUE) : '')

/**
 * A compact, ordered set of facts about where the user was.
 *
 * Returns plain data; the caller decides how to attach it.
 */
export function buildReportContext({ pathname, tool, viewport, plan, signedIn, appVersion } = {}) {
  const out = {}
  // Route only — never the query string. See the note above.
  const route = clean(String(pathname || '').split('?')[0].split('#')[0]) || '/'
  out.route = route
  if (tool) out.tool = clean(tool)
  if (viewport?.width && viewport?.height) {
    out.viewport = `${Math.round(viewport.width)}x${Math.round(viewport.height)}`
  }
  if (plan) out.plan = clean(plan)
  if (typeof signedIn === 'boolean') out.signedIn = signedIn ? 'yes' : 'no'
  if (appVersion) out.build = clean(appVersion)
  return out
}

/**
 * Render the context as a block appended to the message.
 *
 * Folded into `message` on purpose: api/support.js destructures a fixed set of
 * fields and drops anything else, and /api is a Human Validation Zone. Carrying
 * this in an existing field means the proposal's "no new backend if the
 * existing support path can carry it" is literally true — no route change, no
 * rules change, nothing to review on the server.
 *
 * The delimiter is explicit so the admin inbox can tell the user's words from
 * ours, and so a future structured field can lift it back out cleanly.
 */
export function formatReportContext(context) {
  const entries = Object.entries(context || {}).filter(([, v]) => v !== '' && v != null)
  if (!entries.length) return ''
  const lines = entries.map(([k, v]) => `${k}: ${v}`).join('\n')
  return `\n\n--- captured automatically ---\n${lines}`
}

/**
 * The user's message with context attached.
 *
 * The message is truncated FIRST so the context always survives — a report that
 * loses its route because someone wrote a long description is the exact failure
 * this is meant to prevent. api/support.js rejects anything over 5000.
 */
export function withReportContext(message, context, limit = 5000) {
  const block = formatReportContext(context)
  const room = Math.max(0, limit - block.length)
  const body = String(message || '').slice(0, room)
  return `${body}${block}`
}
