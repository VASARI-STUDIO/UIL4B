// The preview examples, one lazy chunk each.
//
// An example is src/components/palette/examples/<id>.jsx (default export: the
// component) with its own <id>.css and a plain <id>.data.js beside it (ROLES,
// the text recipe and the colour vars, which tests read without a DOM).
// Nothing here is imported until its scene is picked, so opening the preview
// costs the dialog and one example, not all of them.
import { lazy } from 'react'

// id -> () => import('./<id>.jsx'). Empty until the first example lands.
const LOADERS = {}

// One lazy component per example, made once at module level: a component made
// in render would be a new type every render and remount the scene.
export const EXAMPLES = Object.fromEntries(
  Object.entries(LOADERS).map(([id, load]) => [id, lazy(load)]),
)

// Starts the download without rendering. Safe to call twice: the module system
// hands back the same promise.
export function preloadExample(id) {
  const load = LOADERS[id]
  return load ? load().catch(() => null) : Promise.resolve(null)
}
