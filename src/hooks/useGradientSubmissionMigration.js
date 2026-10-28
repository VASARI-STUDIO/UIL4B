import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  migrateGradientSubmissions, countLegacyGradientSubmissions,
  readMigrationDismissed, writeMigrationDismissed,
} from '../utils/gradientSubmissions'
import { listMySubmissions, publishToQueueOnce } from '../utils/communityQueueApi'

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
 * @returns {{ waiting: number, busy: boolean, keep: Function, notMine: Function }}
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

  return { waiting, busy, keep, notMine }
}
