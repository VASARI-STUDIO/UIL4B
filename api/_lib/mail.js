// Who the product's outbound mail comes from, and who a reply reaches.
//
// Files in /api/_lib are underscore-prefixed and NOT deployed as routes, so this
// adds nothing to the 12-function budget (which is full — see APP_CONDITION).
//
// ── THE PROBLEM THIS SOLVES ──────────────────────────────────────────────────
//
// api/support.js and api/ai.js each hard-coded `UIL4B <onboarding@resend.dev>`.
// That is Resend's SANDBOX sender: it is not uil4b.com, it cannot be branded,
// and Resend will only deliver it to the account owner's own address. Two copies
// of one fact, in two files, neither of which could be changed without a deploy.
//
// ── WHY THE DEFAULT IS STILL THE SANDBOX ─────────────────────────────────────
//
// The founder created admin@uil4b.com on 2026-09-14, and a mailbox is not a
// verified sending domain. Until SPF, DKIM and a return path exist on uil4b.com
// (docs/OWNER-ACTIONS.md §4.10 — that register is local-only since 2026-09-16
// and is not in this repository; see .gitignore for the decision and the
// reason), Resend REFUSES to send as admin@uil4b.com — the API
// returns an error and the mail is simply lost. Hard-coding the new address
// today would therefore silently break the founder's own feedback notifications,
// which currently work.
//
// So the sender is an env var with the sandbox as its fallback: nothing changes
// until MAIL_FROM is set in Vercel, and on the day the domain verifies, one
// dashboard field switches every outbound message with no deploy.
//
// ── WHAT DOES CHANGE TODAY ───────────────────────────────────────────────────
//
// `reply_to` is admin@uil4b.com NOW, and it needs no verified domain — it is a
// header on a message sent by someone else, not a claim to be that someone. So
// from this commit, hitting reply on any notification reaches the real mailbox
// instead of a Resend sandbox address that accepts nothing.

import { cleanKey } from './env.js'

/** The mailbox a human should reach by hitting reply. */
export const REPLY_TO = 'admin@uil4b.com'

/** Resend's sandbox sender — deliverable only to the account owner. */
const SANDBOX_FROM = 'UIL4B <onboarding@resend.dev>'

/**
 * The From header for outbound mail.
 *
 * Set `MAIL_FROM` in Vercel to `UIL4B <admin@uil4b.com>` once uil4b.com is a
 * verified sending domain in Resend. Until then this returns the sandbox, which
 * is what the product has always sent and what actually arrives.
 *
 * Run through cleanKey() for the same reason every other env var here is: a
 * value pasted into a dashboard arrives with wrapping quotes or a trailing
 * newline often enough to be worth handling, and a newline inside a From header
 * is a malformed request rather than a bad address.
 */
export function mailFrom(env = process.env) {
  return cleanKey(env.MAIL_FROM) || SANDBOX_FROM
}

/**
 * True once the sender has been pointed at a real uil4b.com address, which is
 * the only way this code can tell that the domain work in §4.10 is done.
 * Reported by the diagnostic so the founder can see it from the admin page
 * rather than by reading a dashboard.
 */
export function sendingDomainConfigured(env = process.env) {
  return /@uil4b\.com>?\s*$/i.test(mailFrom(env))
}
