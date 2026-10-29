// What the Admin Prompts tab asks Firestore for. Dependency-free so a test can
// read it without the Firebase SDK.
//
// A prompt document can carry up to ~900 KB of inline media and any signed-in
// account can create one, so the list is never read whole: it is one status at
// a time, newest first, and capped. `status: null` is the "all" view, which is
// the same newest-first cap without a status clause.

export const ADMIN_PROMPT_FILTERS = Object.freeze(['pending', 'approved', 'rejected', 'all'])
export const ADMIN_PROMPT_DEFAULT_FILTER = 'pending'
export const ADMIN_PROMPT_LIMIT = 200

/** A filter name from the tab's buttons -> { status, max }. Anything else reads as the default. */
export function adminPromptQuerySpec(filter) {
  const name = ADMIN_PROMPT_FILTERS.includes(filter) ? filter : ADMIN_PROMPT_DEFAULT_FILTER
  return { status: name === 'all' ? null : name, max: ADMIN_PROMPT_LIMIT }
}

/**
 * The loader behind the Prompts tab, with the Firestore read and the screen
 * state passed in so it can be run without either.
 *
 *   read(spec)         -> Promise<list>; rejects when the read is refused or fails
 *   onStart(spec, o)   called as a read begins; `o.clear` is true on a filter switch
 *   onList(list)       the newest read finished
 *   onError(err)       the newest read failed
 *
 * Only the newest read may report. A slower earlier read (the admin switched
 * filter while it was in flight) is dropped, whether it succeeded or failed, so
 * it can never put one filter's rows, or its error, under another filter's button.
 */
export function createPromptLoader({ read, onStart, onList, onError }) {
  let latest = 0
  return async function load(filter, { clear = false } = {}) {
    const spec = adminPromptQuerySpec(filter)
    const seq = ++latest
    onStart?.(spec, { clear })
    try {
      const list = await read(spec)
      if (seq !== latest) return
      onList(list)
    } catch (err) {
      if (seq !== latest) return
      onError(err)
    }
  }
}

/** One line for the screen from whatever a refused read threw. */
export function promptReadErrorText(err) {
  const text = String(err?.message || err || 'Unknown error').slice(0, 200)
  // The code that means "the composite index is not deployed yet".
  return err?.code === 'failed-precondition'
    ? `${text} (the community-prompts index may not be deployed: firebase deploy --only firestore:indexes)`
    : text
}
