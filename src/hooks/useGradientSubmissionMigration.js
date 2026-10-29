import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  migrateGradientSubmissions, countLegacyGradientSubmissions,
  readMigrationDismissed, writeMigrationDismissed,
} from '../utils/gradientSubmissions'
import { listMySubmissions, publishToQueueOnce } from '../utils/communityQueueApi'
import { POST_LIMIT_RULE } from '../utils/communityLimits'

// Gradients an earlier visit queued in this browser (the old
// `vs-gradient-submissions` key) can move to the signed-in account, but only
// when the person says they are theirs: a shared machine's browser may hold
// someone else's work. This hook reports how many are waiting and runs the move
// on `keep`; `notMine` stops the question for this account for the rest of the
// tab session and moves nothing. The work is in utils/gradientSubmissions.js.
//
// One run per uid at a time, shared by every page that mounts the hook. A run
// that could not finish (the listing failed, or a publish did) is not
// remembered, so pressing Keep again tries again; the browser key is only ever
// removed by a run that finished cleanly.
//
// The post limits (utils/communityLimits.js) let one item through every 30
// seconds, so a run with several waiting posts the first and is then refused.
// That stops the run without an error: the rest stay in the browser key and are
// offered again on a later visit, and the toast says why in plain words.
const inFlight = new Map()

// A page of the account's queue big enough to tell what is already there: the
// browser key holds at most 30, so this leaves room for everything the account
// has queued before.
const LIST_MAX = 500
const listAll = (uid, kind) => listMySubmissions(uid, kind, LIST_MAX)

/**
 * @param {object}   opts
 * @param {Function} [opts.toast]       page toast; says what happened after Keep
 * @param {Function} [opts.onMigrated]  called with the result when a Keep run settles
 * @returns {{ waiting: number, busy: boolean, keep: Function, notMine: Function, recount: Function }}
 */
export default function useGradientSubmissionMigration({ toast, onMigrated } = {}) {
  const { user } = useAuth()
  const uid = user?.uid || null
  const [busy, setBusy] = useState(false)
  // Bumped after an answer, so the count is read from storage again.
  const [answered, setAnswered] = useState(0)
  const waiting = useMemo(
    () => (uid && !readMigrationDismissed(uid) ? countLegacyGradientSubmissions() : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uid, answered],
  )

  const keep = useCallback(async () => {
    if (!user?.uid || inFlight.has(user.uid)) return
    setBusy(true)
    const run = migrateGradientSubmissions({ user, list: listAll, publish: publishToQueueOnce })
      .catch(() => ({ published: 0, skipped: 0, failed: 1, cleared: false, listFailed: false }))
    inFlight.set(user.uid, run)
    const result = await run
    inFlight.delete(user.uid)
    setBusy(false)
    if (result.listFailed || result.failed > 0) {
      toast?.('Couldn’t keep all of them. Try again.', 'error')
    } else if (result.limited) {
      // The post limits stopped the run: what is left stays in this browser and
      // is offered again on a later visit. Not an error, so nothing says "Try again".
      setAnswered(n => n + 1)
      const n = result.published
      toast?.(n > 0
        ? `Kept ${n} ${n === 1 ? 'gradient' : 'gradients'} from this browser with your account. ${POST_LIMIT_RULE} The rest can move over on your next visit.`
        : `${POST_LIMIT_RULE} Your gradients can move over on your next visit.`)
    } else {
      setAnswered(n => n + 1)
      const n = result.published
      toast?.(n > 0
        ? `Kept ${n} ${n === 1 ? 'gradient' : 'gradients'} from this browser with your account`
        : 'Those gradients were already with your account')
    }
    onMigrated?.(result)
  }, [user, toast, onMigrated])

  const notMine = useCallback(() => {
    writeMigrationDismissed(uid)
    setAnswered(n => n + 1)
  }, [uid])

  // Read the count again, for a page that removed a browser-held entry itself.
  const recount = useCallback(() => setAnswered(n => n + 1), [])

  return { waiting, busy, keep, notMine, recount }
}
