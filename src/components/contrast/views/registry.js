// The views a Contrast Checker pair is painted on, one lazy chunk each.
//
// A view is src/components/contrast/views/<Name>.jsx (default export: the
// component) with its own <Name>.css, and for the story-driven ones a plain
// <Name>.data.js beside it that holds the copy. They are separate from the
// Palette Builder's examples (palette/examples/registry.js) because a pair is
// two colours, not five brand slots: nothing here is painted in a tint.
//
// Built the same way as that registry, with the same load tracking, so a chunk
// that fails to download shows "This view didn't load" with a Try again button
// and the page around it keeps working.
import { lazyRoute as lazy } from '../../../utils/lazyRoute'
import ViewUnavailable from './ViewUnavailable.jsx'
import { trackExampleLoad } from '../../palette/examples/loading.js'

// view id -> () => import('./<File>.jsx'). Each default-exports the view.
const LOADERS = {
  interface: () => import('./Interface.jsx'),
  specimen: () => import('./Specimen.jsx'),
}

export const hasPairExample = (id) => Object.hasOwn(LOADERS, id)

// A failed chunk resolves to the stub instead of throwing, which would drop the
// pair being checked. React keeps a lazy component's first result for good, so
// the stub would be cached for the page's life; retryPairExample swaps in a
// fresh lazy for one view.
//
// A fresh lazy alone is not enough: Chromium keeps a failed module in the page's
// module map, so importing the same address again fails without a request. The
// failure message names the chunk's address (Chromium; Safari and Firefox do not
// cache a failure and do not name it), so a retry imports that address with a
// query on the end, which is a new module as far as the page is concerned.
const chunkUrl = new Map() // view id -> address of its chunk, once a failure named it
const attempts = {} // view id -> how many retries have been asked for
const ADDRESS = /https?:\/\/[^\s'"]+?\.js/

const makeLazy = (id) => lazy(() => {
  const retry = attempts[id] ? chunkUrl.get(id) : null
  const load = retry ? () => import(/* @vite-ignore */ `${retry}?retry=${attempts[id]}`) : LOADERS[id]
  return trackExampleLoad(load).catch((error) => {
    const found = String(error?.message ?? error).match(ADDRESS)
    if (found) chunkUrl.set(id, found[0])
    return { default: ViewUnavailable }
  })
})

// One lazy component per view, made once at module level (retryPairExample
// replaces one): a component made in render would be a new type every render
// and remount the view.
export const PAIR_EXAMPLES = Object.fromEntries(Object.keys(LOADERS).map((id) => [id, makeLazy(id)]))

/** Rebuilds one view's lazy component, so the next render fetches its chunk
 *  again. The caller re-renders after it. */
export function retryPairExample(id) {
  if (!hasPairExample(id)) return
  attempts[id] = (attempts[id] ?? 0) + 1
  PAIR_EXAMPLES[id] = makeLazy(id)
}

// Starts the download without rendering. Safe to call twice: the module system
// hands back the same promise.
export function preloadPairExample(id) {
  const load = LOADERS[id]
  return load ? trackExampleLoad(load).catch(() => null) : Promise.resolve(null)
}
