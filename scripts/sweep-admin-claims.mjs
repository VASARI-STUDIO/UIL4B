// One-off sweep: clear the `admin` custom claim from every account that is not
// on the ADMIN_EMAILS allowlist, and revoke that account's refresh tokens.
//
// Why a script as well as the check in api/verify-admin.js: the route clears a
// stale claim when its owner next calls it, and a removed administrator may
// never call it again, while Firestore and Storage rules keep trusting the claim.
//
// DRY RUN BY DEFAULT. It lists what it would change and writes nothing. Pass
// `--apply` to make the changes.
//
//   node --env-file=.env.local scripts/sweep-admin-claims.mjs            # dry run
//   node --env-file=.env.local scripts/sweep-admin-claims.mjs --apply    # clear + revoke
//
// The env file needs FIREBASE_SERVICE_ACCOUNT_KEY and ADMIN_EMAILS, the same
// two the API routes read. This script reads them and never prints them.
//
// An account counts as an administrator by the same rule the routes use: a
// Firebase-verified email that is on the allowlist. Every claim other than
// `admin` is kept. With an empty allowlist the script refuses to run, because
// that is almost certainly a missing variable and would strip every
// administrator.

import { pathToFileURL } from 'node:url'
import { getApp } from 'firebase-admin/app'
import { adminAuth, credentialProblem } from '../api/_lib/firebase-admin.js'
import { adminEmails, isAdminEmail } from '../api/_lib/adminEmails.js'

/** Same rule as api/verify-admin.js. */
export const isCurrentAdmin = (user) => !!user.email && user.emailVerified === true && isAdminEmail(user.email)

/**
 * Walk every account. Returns `{ scanned, stale, cleared, failed }` where
 * `stale` lists the accounts holding the claim without being on the allowlist,
 * `cleared` those actually changed (always empty unless `apply`), and `failed`
 * the `{ uid, error }` of each account whose change threw.
 *
 * Each account is its own try/catch, so one failure does not abort the run. A
 * failed account keeps its claim unless only the second step failed, and a
 * second run picks it up again.
 *
 * `auth` is the Admin Auth instance; `log` receives one line per stale account.
 */
export async function sweepAdminClaims(auth, { apply = false, isAdmin = isCurrentAdmin, log = () => {} } = {}) {
  const stale = []
  const cleared = []
  const failed = []
  let scanned = 0
  let pageToken
  do {
    const page = await auth.listUsers(1000, pageToken)
    for (const user of page.users) {
      scanned += 1
      if (user.customClaims?.admin !== true || isAdmin(user)) continue
      stale.push({ uid: user.uid, email: user.email || '' })
      log(`${apply ? 'clearing' : 'would clear'}: ${user.uid} ${user.email || '(no email)'}`)
      if (!apply) continue
      try {
        // Revoke FIRST: a failure between the two calls then leaves the claim
        // in place, so the account is still found as stale on the next run.
        await auth.revokeRefreshTokens(user.uid)
        const { admin: _removed, ...kept } = user.customClaims
        await auth.setCustomUserClaims(user.uid, kept)
        cleared.push(user.uid)
      } catch (err) {
        failed.push({ uid: user.uid, error: err?.message || String(err) })
      }
    }
    pageToken = page.pageToken
  } while (pageToken)
  return { scanned, stale, cleared, failed }
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (adminEmails().length === 0) {
    console.error('ADMIN_EMAILS is empty or unset. Refusing to run: every administrator would look stale.')
    process.exit(1)
  }
  const problem = credentialProblem()
  if (problem) {
    console.error('Firebase credentials are not usable:', problem)
    process.exit(1)
  }
  // Which Firebase project the key points at, printed before anything is
  // changed, so a wrong key (staging, an old project) is seen first. The id is
  // not a secret.
  console.log(`Firebase project: ${getApp().options.projectId || '(unknown)'}`)
  console.log(apply ? 'APPLY: claims will be cleared and tokens revoked.' : 'DRY RUN: nothing will be changed. Pass --apply to make the changes.')
  const { scanned, stale, cleared, failed } = await sweepAdminClaims(adminAuth(), { apply, log: (line) => console.log(line) })
  console.log(`${scanned} accounts scanned, ${stale.length} stale admin claim(s) found, ${cleared.length} cleared, ${failed.length} failed.`)
  if (failed.length > 0) {
    for (const f of failed) console.error(`failed: ${f.uid} ${f.error}`)
    console.error('Run the sweep again to retry the failed accounts.')
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('sweep failed:', err?.message || err)
    process.exit(1)
  })
}
