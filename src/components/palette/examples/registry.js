// The preview examples, one lazy chunk each.
//
// An example is src/components/palette/examples/<id>.jsx (default export: the
// component) with its own <id>.css and a plain <id>.data.js beside it (ROLES,
// the text recipe and the colour vars, which tests read without a DOM).
// Nothing here is imported until its scene is picked, so opening the preview
// costs the dialog and one example, not all of them.
//
// lazyRoute, not React's lazy, like every other code-split component. A failed
// example never reaches its reload hold: main.jsx lets the failure through
// while an example is loading (see ./loading.js), so the catch below answers it.
import { lazyRoute as lazy } from '../../../utils/lazyRoute'
import Unavailable from './Unavailable.jsx'
import { trackExampleLoad } from './loading.js'

// scene id -> () => import('./<File>.jsx'). Each default-exports the example.
const LOADERS = {
  editorial: () => import('./SlackWater.jsx'),
  energy: () => import('./Sundial.jsx'),
  product: () => import('./OrraWorkroom.jsx'),
  trail: () => import('./Ridgeline.jsx'),
  studio: () => import('./HaleOkoro.jsx'),
  card: () => import('./Tally.jsx'),
}

export const hasExample = (id) => Object.hasOwn(LOADERS, id)

// One lazy component per example, made once at module level: a component made
// in render would be a new type every render and remount the scene.
export const EXAMPLES = Object.fromEntries(
  Object.entries(LOADERS).map(([id, load]) => [id, lazy(() => trackExampleLoad(load).catch(() => ({ default: Unavailable })))]),
)

// Starts the download without rendering. Safe to call twice: the module system
// hands back the same promise.
export function preloadExample(id) {
  const load = LOADERS[id]
  return load ? trackExampleLoad(load).catch(() => null) : Promise.resolve(null)
}
