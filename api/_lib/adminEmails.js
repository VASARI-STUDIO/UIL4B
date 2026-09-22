// WHO COUNTS AS AN ADMINISTRATOR — the one definition, read from the server
// environment. Files in /api/_lib are underscore-prefixed and NOT deployed as
// routes, so this adds nothing to the 12-function budget.
//
// ── WHY THIS IS NOT A LITERAL ANY MORE ──────────────────────────────────────
//
// This was `export const ADMIN_EMAILS = ['<the founder's personal gmail>']`,
// written out twice — in api/_lib/admin.js and again in api/_lib/plans.js — and
// a third time as a string comparison in firestore.rules. The reasoning
// recorded at the time was that api/_lib is never bundled and never reaches a
// browser. That was true, and it was the wrong question. This repository became
// PUBLIC on 2026-09-16, and a plaintext address in tracked source is published
// to everybody whether or not a browser ever fetches it.
//
// tests/unit/owner-email-not-public.test.js already guards the BUNDLE, for the
// same defect measured in the same address a week earlier. Going public
// re-opened it one layer down, in source, where that test does not look.
//
// What was published is one line naming the single account whose compromise
// yields site-wide admin AND the full user list (api/verify-admin.js answers
// `includeUsers` to anybody who passes this check). The address grants nothing
// by itself. It is a step, and it was a step this repository handed over for
// free, with the target named.
//
// ── IT FAILS CLOSED, AND THAT IS THE WHOLE POINT ────────────────────────────
//
// An unset or empty ADMIN_EMAILS grants admin to NOBODY. Never to everybody.
// That falls out of `[].includes(x) === false` and needs no special case — so
// the thing to never write here is one: a `if (!list.length) return true`
// "development convenience", or a `|| 'someone@example.com'` fallback of the
// kind api/_lib/rateLimit.js carried for its salt, would turn a missing
// deployment variable into site-wide admin for the first person to ask.
// tests/unit/admin-allowlist.test.js asserts the empty case directly.
//
// THE DEPLOYMENT CONSEQUENCE IS DELIBERATE: until ADMIN_EMAILS is set in Vercel,
// /admin and /api/verify-admin recognise nobody. The founder must set it. That
// is a locked door with the key elsewhere, which is the correct failure; the
// alternative is a door that opens for anyone when the key is missing.
//
// ── WHY IT IS READ ON EVERY CALL ────────────────────────────────────────────
//
// A serverless instance's environment is fixed for its whole life, so a
// module-level constant would be just as correct in production and is what the
// first draft of this did. It is a function because the tests need both states
// — configured and empty — in one process, and a test that has to defeat the
// ESM module cache to ask "does an unset variable grant admin?" is a test
// nobody will write. The parse is a split and two maps over a string that is
// almost always one address long.
//
// ── THE CLIENT DOES NOT READ THIS ───────────────────────────────────────────
//
// src/utils/constants.js decides what to RENDER from a SHA-256 digest of the
// address and cannot read an env var without inlining the plaintext back into
// the bundle (its header gives that argument in full). So the two lists are now
// independent: this one is authority, that one is a menu item. If the founder
// sets ADMIN_EMAILS to an address whose digest is not in ADMIN_EMAIL_DIGESTS,
// the server grants and the nav hides — and tests/unit/owner-email-not-public.js
// says so out loud where it can no longer check.

/**
 * The configured allowlist: lowercase, trimmed, empty entries dropped.
 * `ADMIN_EMAILS` is a comma-separated list — one address is the normal case.
 */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Is this address an administrator?
 *
 * This answers the allowlist question ONLY. Every caller must still require a
 * Firebase-VERIFIED email — without it, anyone who signs up claiming the admin
 * address, an address they cannot receive mail at, passes the allowlist.
 * api/_lib/admin.js, api/verify-admin.js and api/setup-stripe.js each check
 * `email_verified` alongside this call, and that pairing is load-bearing.
 */
export function isAdminEmail(email) {
  if (typeof email !== 'string') return false
  const address = email.trim().toLowerCase()
  if (!address) return false
  return adminEmails().includes(address)
}
