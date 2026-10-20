// The design a project is saved with, built from the working design.
//
// DOM-free and React-free so a unit test can call the real merge instead of a
// copy of it.

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

/** Apply a patch one level deep, the way the working design's updater does. */
export function applyDesignPatch(base, patch) {
  const out = { ...base }
  for (const [key, value] of Object.entries(patch || {})) {
    out[key] = isObj(value) && isObj(base?.[key]) ? { ...base[key], ...value } : value
  }
  return out
}

/**
 * The design a saved project keeps. `identityName` names the kit in the saved
 * copy for a caller that set the working design's identity in the same event.
 * `patch` is for a caller that has just changed the working design in that
 * event (the design passed in is still the render before it).
 */
export function projectSnapshot(base, opts = {}) {
  const named = typeof opts.identityName === 'string'
    ? { ...base, identity: { ...(base?.identity || {}), name: opts.identityName } }
    : base
  return applyDesignPatch(named, opts.patch)
}
