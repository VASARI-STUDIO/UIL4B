import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { migrateGradientSubmissions } from '../utils/gradientSubmissions'
import { listMySubmissions, publishToQueue } from '../utils/communityQueueApi'

// Moves gradients an earlier visit queued in this browser (the old
// `vs-gradient-submissions` key) to the signed-in account, once per session per
// uid. The work is in utils/gradientSubmissions.js; this only decides when to
// run it and says so when something moved.
//
// One run per uid is shared across every page that mounts the hook, so going
// from the generator to the gallery while it is still in flight neither
// repeats it nor loses its result. A run that could not finish (the listing
// failed, or a publish did) is forgotten, so the next mount tries again; the
// browser key is only ever removed by a run that finished cleanly.
const runs = new Map()

/**
 * @param {object}   opts
 * @param {Function} [opts.toast]       page toast; used only when something was published
 * @param {Function} [opts.onMigrated]  called with the result when a run for this uid settles
 */
export default function useGradientSubmissionMigration({ toast, onMigrated } = {}) {
  const { user } = useAuth()
  const uid = user?.uid || null
  // Kept current without re-running the effect when the page re-renders.
  const latest = useRef({ user, toast, onMigrated })
  useEffect(() => { latest.current = { user, toast, onMigrated } })

  useEffect(() => {
    if (!uid) return undefined
    let cancelled = false
    let run = runs.get(uid)
    const starter = !run
    if (!run) {
      run = migrateGradientSubmissions({
        user: latest.current.user,
        list: listMySubmissions,
        publish: publishToQueue,
      }).catch(() => ({ published: 0, skipped: 0, failed: 1, cleared: false, listFailed: false }))
      runs.set(uid, run)
    }
    run.then((result) => {
      if (result.listFailed || result.failed > 0) {
        if (runs.get(uid) === run) runs.delete(uid)
      }
      // The run that started the work reports it even if its page has gone (or
      // StrictMode remounted it): the toast is app-level, the page is not.
      if (starter && result.published > 0) {
        const n = result.published
        latest.current.toast?.(`Kept ${n} ${n === 1 ? 'gradient' : 'gradients'} from this browser with your account`)
      }
      if (!cancelled) latest.current.onMigrated?.(result)
    })
    return () => { cancelled = true }
  }, [uid])
}
