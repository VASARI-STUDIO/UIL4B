// One-off backfill: give every community submission and prompt that was posted
// before the limits rules a `submittedAt`, copied from its client-written
// `createdAt`.
//
// Why: once docs/design/queue-limits-rules.patch is applied the reviewers'
// queues are ordered on `submittedAt` (src/utils/communityLimits.js,
// queueOrderField). Firestore leaves a document out of an orderBy on a field it
// does not have, so every item already waiting would vanish from the queue.
// Run this after the indexes are deployed and before the patch is applied, and
// run it once more with --write --all-statuses after the patch is live: anything
// posted between the first run and the deploy has no submittedAt. The run is
// idempotent, since a document that already has the field is left alone.
//
// DRY RUN BY DEFAULT. It lists what it would set and writes nothing. Pass
// `--write` to make the changes.
//
//   node --env-file=.env.local scripts/backfill-submitted-at.mjs                    # dry run
//   node --env-file=.env.local scripts/backfill-submitted-at.mjs --write            # pending items
//   node --env-file=.env.local scripts/backfill-submitted-at.mjs --write --all-statuses
//
// Only pending items by default, which is what the review queue shows first.
// `--all-statuses` also covers approved, rejected and withdrawn items, which the
// Approved and Rejected tabs of the queue and the Prompts tab list in the same
// order; leave it off only if those tabs may lose their old items.
//
// The env file needs FIREBASE_SERVICE_ACCOUNT_KEY, the same one the API routes
// read. This script reads it and never prints it.
//
// `createdAt` is a string the sender chose, so it is not trusted past this
// point: one that does not parse gets the time of the run and is logged, one
// dated in the future is capped at the time of the run, so a spammer's
// 9999-12-31 does not sit at the top of the queue for good, and one dated before
// 2000 is raised to 2000-01-01, which Timestamp.fromDate can always store. Each write only goes through if the
// document is unchanged since it was read, so a reviewer's decision made during
// the run is never overwritten. Run it again to pick up anything that failed.

import { pathToFileURL } from 'node:url'

export const COLLECTIONS = ['community-submissions', 'community-prompts']
const PAGE = 300
const EARLIEST_MS = Date.UTC(2000, 0, 1)

/**
 * The time a `createdAt` value stands for, or null when it is not one. Strings
 * are the shape the client writes; a stored timestamp is accepted too.
 */
export function parseCreatedAt(value) {
  if (typeof value === 'string') {
    if (!value.trim()) return null
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? null : new Date(ms)
  }
  if (value && typeof value.toDate === 'function') {
    const d = value.toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/** Documents of one collection, a page at a time, in document-id order. */
async function* pages(collection, statuses) {
  for (const status of statuses) {
    let last
    for (;;) {
      let q = collection
      if (status) q = q.where('status', '==', status)
      q = q.orderBy('__name__').limit(PAGE)
      if (last) q = q.startAfter(last)
      const snap = await q.get()
      if (snap.docs.length === 0) break
      yield snap.docs
      last = snap.docs[snap.docs.length - 1]
      if (snap.docs.length < PAGE) break
    }
  }
}

/**
 * Walk the community collections and set `submittedAt` on each document that
 * lacks it. Returns `{ scanned, missing, updated, clamped, defaulted, failed }`:
 * `missing` counts documents without the field, `updated` those actually written
 * (always 0 unless `write`), `clamped` those whose createdAt was in the future
 * or before 2000, `defaulted` the `{ collection, id, reason }` of each one
 * with no usable createdAt, which took the time of the run, and `failed` the `{ collection, id, error }` of each write that threw.
 *
 * Each document is its own try/catch, so one failure does not abort the run.
 *
 * `db` is the Admin Firestore instance; `toStamp` turns a Date into the value
 * stored (Timestamp.fromDate); `log` receives one line per document.
 */
export async function backfillSubmittedAt(db, {
  write = false,
  allStatuses = false,
  toStamp = (date) => date,
  now = () => Date.now(),
  log = () => {},
} = {}) {
  const out = { scanned: 0, missing: 0, updated: 0, clamped: 0, defaulted: [], failed: [] }
  const statuses = allStatuses ? [null] : ['pending']
  const runAt = now()
  for (const name of COLLECTIONS) {
    for await (const docs of pages(db.collection(name), statuses)) {
      for (const snap of docs) {
        out.scanned += 1
        const data = snap.data() || {}
        if (data.submittedAt !== undefined && data.submittedAt !== null) continue
        out.missing += 1
        let when = parseCreatedAt(data.createdAt)
        if (!when) {
          const reason = data.createdAt === undefined ? 'no createdAt' : 'createdAt does not parse'
          out.defaulted.push({ collection: name, id: snap.id, reason })
          log(`defaulted to the run time: ${name}/${snap.id} (${reason})`)
          when = new Date(runAt)
        } else if (when.getTime() > runAt) {
          when = new Date(runAt)
          out.clamped += 1
        } else if (when.getTime() < EARLIEST_MS) {
          when = new Date(EARLIEST_MS)
          out.clamped += 1
        }
        log(`${write ? 'setting' : 'would set'}: ${name}/${snap.id} submittedAt ${when.toISOString()}`)
        if (!write) continue
        try {
          await snap.ref.update({ submittedAt: toStamp(when) }, { lastUpdateTime: snap.updateTime })
          out.updated += 1
        } catch (err) {
          out.failed.push({ collection: name, id: snap.id, error: err?.message || String(err) })
        }
      }
    }
  }
  return out
}

async function main() {
  const write = process.argv.includes('--write')
  const allStatuses = process.argv.includes('--all-statuses')
  const [{ getApp }, { Timestamp }, { adminDb, credentialProblem }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/firestore'),
    import('../api/_lib/firebase-admin.js'),
  ])
  const problem = credentialProblem()
  if (problem) {
    console.error('Firebase credentials are not usable:', problem)
    process.exit(1)
  }
  // Which Firebase project the key points at, printed before anything is
  // changed, so a wrong key (staging, an old project) is seen first. The id is
  // not a secret.
  console.log(`Firebase project: ${getApp().options.projectId || '(unknown)'}`)
  console.log(write ? 'WRITE: submittedAt will be set.' : 'DRY RUN: nothing will be changed. Pass --write to make the changes.')
  console.log(allStatuses ? 'Covering every status.' : 'Covering pending items only. Pass --all-statuses for the rest.')
  const out = await backfillSubmittedAt(adminDb(), {
    write,
    allStatuses,
    toStamp: (date) => Timestamp.fromDate(date),
    log: (line) => console.log(line),
  })
  console.log(`${out.scanned} scanned, ${out.missing} without submittedAt, ${out.updated} set, ${out.clamped} future- or far-past-dated and capped, ${out.defaulted.length} defaulted to the run time, ${out.failed.length} failed.`)
  if (out.defaulted.length > 0) {
    console.error('The defaulted items (listed above) have no usable createdAt and sit in the queue at the time of this run.')
  }
  if (out.failed.length > 0) {
    for (const f of out.failed) console.error(`failed: ${f.collection}/${f.id} ${f.error}`)
    console.error('Run the backfill again to retry the failed items.')
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('backfill failed:', err?.message || err)
    process.exit(1)
  })
}
