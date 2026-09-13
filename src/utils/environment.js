// Is this the real site, or a copy of it?
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY (docs/PROPOSALS.md P-001, APPROVED)
// ─────────────────────────────────────────────────────────────────────────────
// Every environment — localhost, every Vercel preview deploy, every branch
// build — points at the SAME Firebase project, and the client writes shared
// per-day counters into `analytics-daily/{YYYY-MM-DD}`. So the admin dashboard's
// totals mixed real users with:
//
//   • the founder developing on localhost,
//   • every preview deploy opened to review a PR,
//   • the acceptance suite, which walks ~30 routes on every single CI run.
//
// That last one dominates. A number that moves when CI runs is not a
// measurement of anything, and P-001's whole argument is that instrumentation
// is what converts opinion into evidence. Aggregates that count our own robots
// do the opposite: they produce confident, wrong numbers.
//
// ─────────────────────────────────────────────────────────────────────────────
// FAIL-SAFE, AS THE PROPOSAL SPECIFIES
// ─────────────────────────────────────────────────────────────────────────────
// This ALLOWLISTS production rather than blocking known-bad hosts. An
// environment we do not recognise is not production — a new preview URL scheme,
// a staging domain, a local IP, someone running the build from a file server.
// Getting that backwards means silently re-poisoning the data, and nobody would
// notice because the failure mode is a plausible-looking number.
//
// DOM-free so it can be tested directly.
import { SITE_ORIGIN } from './routeMeta.js'

// The only hosts that are the real site, CANONICAL FIRST.
//
// The apex is the canonical host and the only one Vercel actually serves
// (measured 2026-09-13 — see SITE_ORIGIN in utils/routeMeta.js), so it is
// derived from that constant rather than spelled a second time here. `www`
// is KEPT as an accepted arrival host: this allowlist answers "is this
// visitor on the real site", not "what do we advertise", and if the www
// record is ever pointed at the deployment a visitor could legitimately
// arrive on it. Recognising a host we do not advertise costs nothing;
// failing to recognise one would silently drop real production analytics.
export const CANONICAL_HOST = new URL(SITE_ORIGIN).host
export const PRODUCTION_HOSTS = Object.freeze([CANONICAL_HOST, 'www.uil4b.com'])

/**
 * True only for a host we positively recognise as production.
 *
 * Deliberately exact-match. A `endsWith('uil4b.com')` check would accept
 * `uil4b.com.evil.example` and every `*-uil4b.vercel.app` preview, which is the
 * exact traffic this exists to exclude.
 */
export function isProductionHost(hostname) {
  if (typeof hostname !== 'string' || !hostname) return false
  return PRODUCTION_HOSTS.includes(hostname.trim().toLowerCase())
}

/**
 * Whether shared, cross-user analytics may be written from here.
 *
 * Reads `location` lazily so a test can pass one in and so importing this
 * module never touches the DOM.
 */
export function canWriteSharedAnalytics(loc) {
  try {
    const host = loc?.hostname ?? (typeof location !== 'undefined' ? location.hostname : null)
    return isProductionHost(host)
  } catch {
    // No location at all (SSR, a worker, a hardened sandbox) — unknown, so no.
    return false
  }
}

/**
 * A label for the current environment, for logging and the admin dashboard.
 * Everything that is not production says so plainly rather than being guessed
 * into a category it might not be.
 */
export function environmentLabel(loc) {
  const host = loc?.hostname ?? (typeof location !== 'undefined' ? location.hostname : '')
  if (isProductionHost(host)) return 'production'
  if (!host) return 'unknown'
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return 'local'
  if (host.endsWith('.vercel.app')) return 'preview'
  return 'unknown'
}
