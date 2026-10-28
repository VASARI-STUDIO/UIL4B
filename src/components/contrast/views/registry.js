// The views a Contrast Checker pair is painted on, one lazy chunk each.
//
// A view is src/components/contrast/views/<Name>.jsx (default export: the
// component) with its own <Name>.css, and for the story-driven ones a plain
// <Name>.data.js beside it that holds the copy. They are separate from the
// Palette Builder's examples (palette/examples/registry.js) because a pair is
// two colours, not five brand slots: nothing here is painted in a tint.
//
// Built the same way as that registry, with the same load tracking and the same
// fallback, so a chunk that fails to download shows "This example didn't load"
// and the page around it keeps working.
import { lazyRoute as lazy } from '../../../utils/lazyRoute'
import Unavailable from '../../palette/examples/Unavailable.jsx'
import { trackExampleLoad } from '../../palette/examples/loading.js'

// view id -> () => import('./<File>.jsx'). Each default-exports the view.
const LOADERS = {
  interface: () => import('./Interface.jsx'),
  specimen: () => import('./Specimen.jsx'),
}

export const hasPairExample = (id) => Object.hasOwn(LOADERS, id)

// One lazy component per view, made once at module level: a component made in
// render would be a new type every render and remount the view.
export const PAIR_EXAMPLES = Object.fromEntries(
  Object.entries(LOADERS).map(([id, load]) => [id, lazy(() => trackExampleLoad(load).catch(() => ({ default: Unavailable })))]),
)

// Starts the download without rendering. Safe to call twice: the module system
// hands back the same promise.
export function preloadPairExample(id) {
  const load = LOADERS[id]
  return load ? trackExampleLoad(load).catch(() => null) : Promise.resolve(null)
}
