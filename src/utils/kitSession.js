// Two small facts the brand kit chooser reads: when the working design was last
// edited, and what this tab has already been asked.
//
// Kept in a module of its own, with no imports, so the project provider can write
// them without pulling the walkthrough's rules in with it.
//
//   · EDITED_KEY    localStorage. Milliseconds since the working design last
//                   changed. This browser only: a design that follows the account
//                   to a second device has no stamp there and reads as long ago.
//   · SESSION_KEY   sessionStorage. What this tab has settled:
//                     'on'    the chooser was answered or skipped
//                     'done'  the walkthrough just saved a project
//                     'auth'  the person signed in or out in this tab
//                   Nothing stored means the tab has not been asked yet.

export const EDITED_KEY = 'vs-current-design-at'
export const SESSION_KEY = 'vs-kit-session'

export const SESSION_ON = 'on'
export const SESSION_DONE = 'done'
export const SESSION_AUTH = 'auth'

const local = () => (typeof localStorage === 'undefined' ? null : localStorage)
const session = () => (typeof sessionStorage === 'undefined' ? null : sessionStorage)

/** Note that the working design changed just now. */
export function stampEdited(storage = local(), now = Date.now()) {
  try { storage?.setItem(EDITED_KEY, String(now)) } catch { /* quota or blocked */ }
}

/** When the working design last changed, or null when nobody noted it. */
export function readEditedAt(storage = local()) {
  try {
    const at = Number(storage?.getItem(EDITED_KEY))
    return Number.isFinite(at) && at > 0 ? at : null
  } catch {
    return null
  }
}

export function markSession(value, storage = session()) {
  try { storage?.setItem(SESSION_KEY, value) } catch { /* private mode */ }
}

export function readSession(storage = session()) {
  try {
    const value = storage?.getItem(SESSION_KEY)
    return value === SESSION_ON || value === SESSION_DONE || value === SESSION_AUTH ? value : null
  } catch {
    return null
  }
}
