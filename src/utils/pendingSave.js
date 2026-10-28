// A save waiting on sign-up. A brand-new account is routed to onboarding, which
// unmounts the tool the person was saving from, taking the typed project name
// with it. The tool stashes the name here before it asks for the account and
// reads it back when it mounts signed in, so it can reopen the Save menu with
// the name restored. Nothing is saved from the stash: the person presses Save.
//
// sessionStorage (this tab only), one slot, and only fresh ones are honoured.
const KEY = 'vs-pending-save'
const MAX_AGE_MS = 30 * 60 * 1000

function store(storage) {
  return storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
}

export function stashPendingSave(tool, name, storage) {
  try { store(storage)?.setItem(KEY, JSON.stringify({ tool, name: String(name || '').slice(0, 80), at: Date.now() })) } catch { /* private mode */ }
}

export function clearPendingSave(storage) {
  try { store(storage)?.removeItem(KEY) } catch { /* private mode */ }
}

/** The stashed name for this tool ('' when none was typed), or null. Consumes it. */
export function takePendingSave(tool, storage, now = Date.now()) {
  const s = store(storage)
  let parsed = null
  try { parsed = JSON.parse(s?.getItem(KEY) || 'null') } catch { /* unreadable: treated as none */ }
  if (!parsed || parsed.tool !== tool) return null
  clearPendingSave(s)
  if (!(now - Number(parsed.at) < MAX_AGE_MS)) return null
  return typeof parsed.name === 'string' ? parsed.name : ''
}
