// What a search can tell a viewer about the matches they cannot open yet: which
// packs to ask about, how to count what comes back, and where the band that says
// so goes.
//
// Pure functions only, no React and no window, so tests/unit can import this
// under plain `node --test`. IconLibrary.jsx owns the request, the state and the
// markup.
//
// The rule from src/utils/lockedPreview.js holds here as everywhere: a locked
// icon's markup never reaches the browser. The one request this feeds is a
// /search, which answers with names (`pack:name`) and nothing drawable, and the
// summary keeps counts and pack labels only. Nothing in this file builds a glyph
// URL.
import { canSeePack, isAnimatedPack, isBlockedPack, isProOnlyIcon, tierOf } from '../data/iconPackTiers.js'

/**
 * The packs to ask the search endpoint about: the ones this viewer may not
 * browse, from `packs` (IconLibrary's ALL_PACKS).
 *
 * An empty list means "send nothing", and it is the answer for every case that
 * must not probe: a Pro viewer has no locked packs, and a single pack filter is
 * a different question (the pack menu already says what that pack needs).
 * Animated sets are left out because their names only come through the server's
 * Pro check, and blocked sets because no tier is ever offered them.
 *
 *   tier        viewerTier()'s output.
 *   packFilter  the pack the viewer narrowed to, or ''.
 *   groupPacks  the packs of the active group chip, or null. A chip narrows the
 *               question to its own packs.
 */
export function lockedSearchPacks({ packs, tier, packFilter = '', groupPacks = null } = {}) {
  if (!Array.isArray(packs) || packFilter) return []
  if (tier !== 'anon' && tier !== 'free') return []
  return packs.filter((p) => (
    (!groupPacks || groupPacks.includes(p))
    && !canSeePack(p, tier)
    && !isAnimatedPack(p)
    && !isBlockedPack(p)
  ))
}

/**
 * The key a summary is remembered under. Everything that changes the answer is
 * in it: the tier decides which packs are locked, the chip narrows them, the
 * weight filters the names, and the query is the question. Case is folded
 * because the search endpoint does.
 */
export function searchTeaseKey({ tier, group = null, weight = 'regular', query = '' } = {}) {
  return [tier, group || '', weight, String(query).trim().toLowerCase()].join('|')
}

// The tier that opens one icon: 'free' means an account does, 'paid' means Pro.
// A pack's own Pro-only names (Carbon's logo-*) need Pro even in a free pack.
function needOf(pack, name) {
  if (isProOnlyIcon(pack, name)) return 'paid'
  return tierOf(pack) === 'free' ? 'free' : 'paid'
}

/**
 * Turn the two answers into the summary the band is drawn from, or null when
 * there is nothing to say.
 *
 *   probeIds  the ids the locked-pack probe returned ('pack:name').
 *   probed    the packs that probe asked about. An id from any other pack is
 *             dropped: the request is a convenience, the check is on arrival.
 *   mainIds   the ids the viewer's own search returned. The ones a visible pack
 *             keeps for Pro (Carbon's logo-*) are the main search's drops, and
 *             count here as matches the viewer cannot open.
 *   limit     the `limit` the probe was sent with. An answer that fills it is
 *             cut short, so the count is a floor and `capped` says so.
 *   accept    (pack, name) => boolean, the same weight filter the grid applies.
 *   labelOf   pack prefix => display name.
 *
 * Only `{ pack, name }` is read from an id and nothing of it is kept but the
 * counts and the labels:
 *
 *   { free, paid, total, capped, labels }
 *
 * `free` and `paid` split the matches by the tier that opens them, and `labels`
 * are the distinct pack names, the pack with the most matches first.
 */
export function summariseLockedMatches({
  probeIds = [], probed = [], mainIds = [], tier, limit = 0, accept = () => true, labelOf = (p) => p,
} = {}) {
  if (tier !== 'anon' && tier !== 'free') return null
  const asked = new Set(probed)
  const seen = new Set()
  const perPack = new Map()
  let free = 0
  let paid = 0
  const take = (id, allowed) => {
    if (typeof id !== 'string' || seen.has(id)) return
    const at = id.indexOf(':')
    const pack = id.slice(0, at)
    const name = id.slice(at + 1)
    if (at < 1 || !name || !allowed(pack, name) || !accept(pack, name)) return
    seen.add(id)
    if (needOf(pack, name) === 'free') free += 1
    else paid += 1
    perPack.set(pack, (perPack.get(pack) || 0) + 1)
  }
  const list = (ids) => (Array.isArray(ids) ? ids : [])
  for (const id of list(probeIds)) take(id, (pack) => asked.has(pack) && !canSeePack(pack, tier))
  for (const id of list(mainIds)) take(id, (pack, name) => canSeePack(pack, tier) && isProOnlyIcon(pack, name))
  const total = free + paid
  if (!total) return null
  const labels = [...perPack.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([pack]) => labelOf(pack))
  return { free, paid, total, capped: list(probeIds).length >= limit && limit > 0, labels: [...new Set(labels)] }
}

/**
 * The tier the one way in has to reach. Any match that needs Pro makes it Pro,
 * because an account alone would not open them all; only when every match is
 * account-tier does a login do.
 */
export function searchTeaseNeed(summary) {
  return summary && summary.paid > 0 ? 'paid' : 'free'
}

/**
 * Where the matches sit, for the heading: 'paid' (Pro sets only), 'free' (sets a
 * free account opens) or 'both'.
 */
export function searchTeaseWhere(summary) {
  if (!summary) return 'paid'
  if (summary.paid > 0 && summary.free > 0) return 'both'
  return summary.paid > 0 ? 'paid' : 'free'
}

/**
 * Which band the summary asks for, or null.
 *
 *   'empty'  the viewer's own search found nothing: the band and blurred rows
 *            take the place of the "No icons match" message.
 *   'end'    results ran out for a free viewer: this band stands in for the
 *            generic upgrade band, which says less about the same plan.
 *   'anon'   the signed-out band is already under the grid; it takes the search
 *            count in its own copy rather than a second band stacking under it.
 *
 * `endKind` is endBandKind()'s answer, which already holds every "is the page
 * settled" rule (auth, plan, loading, gated, My Icons, run out). `searchEmpty`
 * must be true only once those same things are settled for an empty search.
 * A Pro viewer, or one with nothing locked to count, gets null.
 */
export function searchTeaseBand({ summary, tier, endKind, searchEmpty } = {}) {
  if (!summary || !(summary.total > 0) || (tier !== 'anon' && tier !== 'free')) return null
  if (searchEmpty) return 'empty'
  if (endKind === 'anon') return 'anon'
  if (endKind === 'free') return 'end'
  return null
}

// What a search says about its matches in sets the viewer cannot open yet
// (counted above). Whole sentences, one function each,
// so no call site joins fragments. `query` is the trimmed search, `count` the
// matches, `capped` that the count is a floor, `where` is 'paid', 'free' or
// 'both' (searchTeaseWhere), `more` that results are already on screen, and
// `labels` the pack names, the busiest first.
export const SEARCH_TEASE_COPY = {
  heading: (count, capped, query, where, more) => {
    const n = count.toLocaleString('en-AU')
    const lead = capped
      ? `More than ${n} icons match`
      : `${n}${more ? ' more' : ''} ${count === 1 ? 'icon matches' : 'icons match'}`
    const place = where === 'free' ? 'in sets a free account opens'
      : where === 'both' ? 'in sets that need an account or Pro'
        : 'in Pro sets'
    return `${lead} “${query}” ${place}`
  },
  // Up to three sets by name; the rest are counted. `empty` is a search that
  // found nothing in the sets the viewer can open, which the band must say
  // because it takes the place of the "No icons match" message.
  body: (labels, empty) => {
    const named = labels.slice(0, 3)
    const rest = labels.length - named.length
    const list = rest > 0
      ? `${named.join(', ')} and ${rest.toLocaleString('en-AU')} more ${rest === 1 ? 'set' : 'sets'}`
      : named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}` : named[0]
    return empty
      ? `Nothing matches in the sets you can open. The matches are in ${list}.`
      : `They are in ${list}.`
  },
  // The same two sentences as one, for the signed-out band that is already on screen.
  sentence: (count, capped, query, where, labels) => (
    `${SEARCH_TEASE_COPY.heading(count, capped, query, where, true)}. ${SEARCH_TEASE_COPY.body(labels, false)}`
  ),
  action: { paid: 'See Pro', free: 'Log in' },
}
