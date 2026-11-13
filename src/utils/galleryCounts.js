// How many rows of a library match the filters, counted over the WHOLE library
// and not only over the rows the viewer can open.
//
// The galleries used to count `browsable` alone, so a filter whose matches all
// sit behind the tier read "0 gradients", showed "Nothing open to you matches
// those filters." and no gate, while the library holds plenty. The count line
// and the gate now read three numbers:
//
//   S  shown      matching rows this viewer can open (the grid's length)
//   A  account    S plus the matching rows a free account opens and this viewer
//                 does not (signed out only; the same as S from the free rung)
//   T  total      A plus every other matching row: locked ones
//
// from which the gate takes P, how many Pro opens that this viewer lacks
// (T - A signed out, T - S on the free rung).
//
// WHAT MAY BE MATCHED. An open row is matched on everything, search included.
// A row the viewer cannot open is matched on public facets only: its name, and
// the facet fields its stub carries. Never its colours: the search haystack
// indexes every hex, so matching a locked row against a typed query would tell
// anyone who types a hex whether that colour is in a Pro row (the oracle
// utils/lockedPreview.js closes). A name is already on the page.
//
// WHEN A FACET IS UNKNOWN. A stub carries `id`, `name`, `slots` and, for a
// palette, `kind` and `pro`. A mood filter on palettes or a type or mood filter
// on gradients asks about a field it does not have yet, so that row's answer is
// `null`, and the count says `lockedUnknown` instead of guessing. The day the
// stubs carry `moods` (palettes) or `type` and `tags` (gradients) the matchers
// below find them and the counts become exact with no page change.
import { classifyPalette } from './paletteMood.js'

/** Public-facet matcher for a gradient row (a stub or a full record). */
export function gradientPublicMatch({ tag = 'all', types = ['all'], query = '' } = {}) {
  const needTag = tag !== 'all'
  const needType = !types.includes('all')
  return (row) => {
    if (query && !String(row.name || '').toLowerCase().includes(query)) return false
    let unknown = false
    if (needTag) {
      if (Array.isArray(row.tags)) { if (!row.tags.includes(tag)) return false } else unknown = true
    }
    if (needType) {
      if (typeof row.type === 'string') { if (!types.includes(row.type)) return false } else unknown = true
    }
    return unknown ? null : true
  }
}

/** Public-facet matcher for a palette row (a stub or a full record). */
export function palettePublicMatch({ group = 'all', mood = 'all', query = '' } = {}) {
  return (row) => {
    if (query && !String(row.name || '').toLowerCase().includes(query)) return false
    if (group !== 'all' && row.kind !== group) return false
    if (mood === 'all') return true
    if (Array.isArray(row.colors)) return Boolean(classifyPalette(row.colors)[mood])
    if (Array.isArray(row.moods)) return row.moods.includes(mood)
    return null
  }
}

/**
 * Count a library against a filter.
 *
 *   rows      the library as the page holds it, in canonical order.
 *   split     the result of splitLockedLibrary over those rows: `open` and
 *             `next` say which rows this viewer has and which a free account
 *             opens. Everything else is locked.
 *   matchOpen (row) => boolean, the full filter (search included) for an open row.
 *   matchPublic (row) => true | false | null, the public-facet filter for the
 *             rest; null is "this row cannot say".
 *   take      how many matching locked stubs to hand back for the fade.
 */
export function countGallery(rows, split, { matchOpen, matchPublic, take = 12 }) {
  const open = split.open.filter(matchOpen)
  const taken = new Set(split.open)
  const nextSet = new Set(split.next)
  const nextRows = []
  const lockedRows = []
  let lockedMatches = 0
  let lockedUnknown = false
  for (const row of Array.isArray(rows) ? rows : []) {
    if (taken.has(row)) continue
    const verdict = matchPublic(row)
    if (verdict === null) { lockedUnknown = true; continue }
    if (!verdict) continue
    if (nextSet.has(row)) nextRows.push(row)
    else {
      lockedMatches += 1
      if (lockedRows.length < take) lockedRows.push(row)
    }
  }
  const S = open.length
  const A = S + nextRows.length
  const T = A + lockedMatches
  return { open, nextRows, lockedRows, S, A, T, lockedUnknown }
}

/**
 * What the gate and the count line read, from the counts and the viewer's rung.
 * `null` for the gate means there is nothing to say: Pro, or nothing withheld.
 *
 *   tier      'anonymous' | 'free' | 'pro'
 *   pending   a Pro library is still on its way: say nothing about the rest.
 *
 * `P` is how many rows Pro opens beyond what this viewer, or this viewer once
 * signed up, has. `variant` is which copy the gate runs.
 */
export function gateFor({ tier, counts, pending = false }) {
  const { S, A, T, lockedUnknown } = counts
  if (pending || tier === 'pro') return null
  const unknown = lockedUnknown
  if (!(T > S || unknown)) return null
  const anonymous = tier === 'anonymous'
  const P = anonymous ? T - A : T - S
  let variant
  if (unknown) variant = 'unknown'
  else if (anonymous && A > S) variant = 'account'
  else variant = S > 0 ? 'more' : 'pro-only'
  return { anonymous, P, variant }
}
