// Things a signed-in person leaves in memory that must go the moment they sign out, kept without importing them.
//
// AuthContext is in the entry bundle and a visitor who never opens the export dialog should not download its code, so
// AuthContext cannot import the export preview cache to clear it. The cache registers here when its own module loads, and
// AuthContext calls runSignOutHooks() when Firebase reports no user. A module that never loaded has nothing to clear.

const hooks = new Set()

/** Registers a function to run on sign-out. Returns a function that takes it off again. */
export function onSignOut(fn) {
  hooks.add(fn)
  return () => { hooks.delete(fn) }
}

/** Runs every registered function. One that throws does not stop the others. */
export function runSignOutHooks() {
  for (const fn of [...hooks]) {
    try { fn() } catch { /* a cache that will not clear must not break signing out */ }
  }
}
