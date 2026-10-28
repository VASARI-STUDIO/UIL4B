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
