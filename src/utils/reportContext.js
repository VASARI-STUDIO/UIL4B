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
 * Every fact this app is willing to attach to a report, in the order it is
 * shown and sent — with the words the USER sees for it.
 *
 * This list is the privacy contract in one place. It is what the disclosure
 * panel renders, what the remove-toggles operate on, and what the appended
 * block is ordered by. A field that is not here cannot reach the store, and a
 * field added here shows up in the user's face automatically — the two cannot
 * drift apart, which is the whole point of them being one list.
 *
 * `label` is plain language on purpose: "Window size", not "viewport". Someone
 * deciding whether to send this should not have to be a developer to know what
 * they are agreeing to.
 */
export const CONTEXT_FIELDS = [
  { key: 'route', label: 'Page you were on' },
  { key: 'tool', label: 'Tool' },
  { key: 'element', label: 'Element you pointed at' },
  { key: 'viewport', label: 'Window size' },
  { key: 'theme', label: 'Theme' },
  { key: 'motion', label: 'Reduced motion' },
  { key: 'plan', label: 'Plan' },
  { key: 'signedIn', label: 'Signed in' },
  { key: 'build', label: 'App version' },
]

const FIELD_ORDER = CONTEXT_FIELDS.map(f => f.key)

/**
 * A compact, ordered set of facts about where the user was.
 *
 * Returns plain data; the caller decides how to attach it.
 *
 * Note what is absent and stays absent: no user agent string, no screen
 * resolution, no timezone, no language, no session or device id. Those are the
 * fields that turn a support note into a fingerprint, and none of them help
 * anyone reproduce a layout bug.
 */
export function buildReportContext({
  pathname, tool, viewport, plan, signedIn, appVersion,
  element, theme, reducedMotion, pixelRatio,
} = {}) {
  const out = {}
  // Route only — never the query string. See the note above.
  const route = clean(String(pathname || '').split('?')[0].split('#')[0]) || '/'
  out.route = route
  if (tool) out.tool = clean(tool)
  // Already reduced to a short selector by elementSignature, which is where
  // the redaction lives. Cleaned again here because this function is the last
  // thing between any caller and the store.
  if (element) out.element = clean(element)
  if (viewport?.width && viewport?.height) {
    // Device pixel ratio rides along with the size because it is the same
    // question — "what was this laid out on" — and a 2x display is a genuine
    // cause of rendering bugs. It is one row so it is one decision to remove.
    const dpr = Number(pixelRatio)
    const scale = Number.isFinite(dpr) && dpr > 0 && Math.abs(dpr - 1) > 0.01
      ? ` @${Math.round(dpr * 100) / 100}x`
      : ''
    out.viewport = `${Math.round(viewport.width)}x${Math.round(viewport.height)}${scale}`
  }
  if (theme) out.theme = clean(theme)
  // Sent even when off: "reduced motion: no" is what rules the setting OUT as
  // a cause, and a field that only appears sometimes is one a triager learns
  // to distrust.
  if (typeof reducedMotion === 'boolean') out.motion = reducedMotion ? 'reduced' : 'full'
  if (plan) out.plan = clean(plan)
  if (typeof signedIn === 'boolean') out.signedIn = signedIn ? 'yes' : 'no'
  if (appVersion) out.build = clean(appVersion)
  return out
}

/**
 * The context minus whatever the user switched off.
 *
 * Removal is real: the dropped keys never reach `withReportContext`, so they
 * are not in the request body, not in localStorage, and not in the store. This
 * is deliberately not a "hidden from the display" flag — a control that only
 * appears to remove something is worse than no control.
 */
export function omitContext(context, removed) {
  const drop = new Set(Array.isArray(removed) ? removed : [])
  const out = {}
  for (const [k, v] of Object.entries(context || {})) {
    if (!drop.has(k)) out[k] = v
  }
  return out
}

/**
 * The captured facts as label/value rows for the disclosure panel — in the
 * canonical order, skipping anything not captured on this report.
 */
export function contextRows(context) {
  return CONTEXT_FIELDS
    .filter(f => context?.[f.key] !== undefined && context?.[f.key] !== '' && context?.[f.key] !== null)
    .map(f => ({ ...f, value: String(context[f.key]) }))
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
  // Canonical order, not insertion order, so two reports of the same bug read
  // identically in the inbox and can be eyeballed side by side. Anything not in
  // the field list sorts last rather than being dropped — silently swallowing
  // an unknown key would hide a wiring mistake.
  const rank = (k) => { const i = FIELD_ORDER.indexOf(k); return i < 0 ? FIELD_ORDER.length : i }
  const lines = entries
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([k, v]) => `${k}: ${v}`).join('\n')
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
