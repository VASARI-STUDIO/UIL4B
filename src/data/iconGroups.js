// Premade icon groups: themed sets drawn from several packs that read as one
// family, so a set of icons for one job can be taken in one go.
//
// ── The style rule every group follows ──────────────────────────────────────
//
// A group mixes packs only where the packs draw the same way:
//
//   grid     24 × 24 viewBox, no exceptions.
//   style    stroke-based outline. The silhouette is a stroke on
//            `currentColor`; a filled glyph (a `-solid`, `-filled` or `-fill`
//            variant, or a pack whose glyphs are filled shapes) never shares a
//            group with outline glyphs. Small filled detail dots that a pack
//            draws inside an outline glyph are part of the outline style.
//   caps     round line caps and round line joins.
//   weight   ONE stroke weight for the whole group. Lucide and Tabler draw at
//            2px, Iconoir and Heroicons at 1.5px; the group view rewrites every
//            glyph's stroke-width to the group's weight, so a mixed group
//            renders and exports at a single weight rather than two.
//   corners  the packs above all round their corners at a similar radius
//            (about 2 units), which is why they are the only packs allowed.
//
// GROUP_STYLE_PACKS lists the packs that meet the rule, with the stroke weight
// each draws natively. tests/unit/icon-groups.test.js checks every icon id
// (free groups here, Pro groups from the library resolver) against a recorded
// snapshot of the real glyph data (tests/unit/fixtures/icon-groups-snapshot.json,
// written by scripts/snapshot-icon-groups.mjs): the id exists, the viewBox is
// 24, the glyph is stroked on currentColor, and caps and joins are round.
//
// ── Who sees which group ────────────────────────────────────────────────────
//
// `access: 'free'` groups open for every viewer, signed out included; taking
// the files away still goes through the account gate (useExportGate).
// `access: 'pro'` groups open on Pro only, and ship here as a stub (name,
// count, packs) with no icon ids: a Pro account fetches the lists from
// /api/ai?library=icongroups and withProIcons() puts them back in place. On
// top of that, a group is only
// open when the viewer may see EVERY pack it draws from
// (src/data/iconPackTiers.js) — so a group can never be the way a gated pack's
// glyphs reach a viewer. glyphRequestPlan() is the only source of names the
// group view fetches, and it leaves locked groups out entirely.

import { canSeePack, isAnimatedPack, tierOf, TIER_ORDER } from './iconPackTiers.js'

export const ICON_GROUPS_ROUTE = '/create/icons/groups'

/** Packs that meet the style rule, and the stroke weight each draws natively. */
export const GROUP_STYLE_PACKS = Object.freeze({
  lucide: Object.freeze({ stroke: 2 }),
  tabler: Object.freeze({ stroke: 2 }),
  iconoir: Object.freeze({ stroke: 1.5 }),
  heroicons: Object.freeze({ stroke: 1.5 }),
})

/** The stroke weights the group view offers, in px on the 24 grid. */
export const GROUP_STROKES = Object.freeze([1, 1.5, 2, 2.5])
export const DEFAULT_GROUP_STROKE = 2

const STYLE = Object.freeze({ grid: 24, stroke: DEFAULT_GROUP_STROKE, cap: 'round', join: 'round' })

const group = (id, label, access, icons) => Object.freeze({ id, label, access, style: STYLE, icons: Object.freeze(icons) })
const stub = (id, label, count, packs) => Object.freeze({ id, label, access: 'pro', style: STYLE, count, packs: Object.freeze(packs) })

export const PREMADE_ICON_GROUPS = Object.freeze([
  group('wayfinding', 'Wayfinding', 'free', [
    'lucide:arrow-up', 'lucide:arrow-down', 'lucide:arrow-left', 'lucide:arrow-right',
    'lucide:arrow-up-right', 'lucide:arrow-down-left', 'lucide:chevron-up', 'lucide:chevron-down',
    'lucide:chevron-left', 'lucide:chevron-right', 'lucide:chevrons-up-down', 'lucide:corner-up-left',
    'lucide:corner-down-right', 'lucide:external-link', 'lucide:move', 'lucide:map-pin',
    'lucide:map', 'lucide:compass', 'lucide:navigation', 'lucide:signpost',
    'lucide:route', 'lucide:milestone', 'lucide:locate-fixed', 'tabler:arrow-back-up',
    'tabler:arrow-forward-up', 'tabler:direction-sign', 'tabler:current-location', 'tabler:arrows-exchange',
    'tabler:arrow-bear-left', 'tabler:arrow-bear-right', 'tabler:arrow-ramp-right', 'tabler:arrow-rotary-right',
  ]),
  group('media', 'Media controls', 'free', [
    'tabler:player-play', 'tabler:player-pause', 'tabler:player-stop', 'tabler:player-record',
    'tabler:player-skip-back', 'tabler:player-skip-forward', 'tabler:player-track-prev', 'tabler:player-track-next',
    'tabler:player-eject', 'lucide:rewind', 'lucide:fast-forward', 'lucide:repeat',
    'lucide:repeat-1', 'lucide:shuffle', 'lucide:volume', 'lucide:volume-1',
    'lucide:volume-2', 'lucide:volume-x', 'lucide:mic', 'lucide:mic-off',
    'lucide:headphones', 'lucide:music', 'lucide:list-music', 'lucide:captions',
    'lucide:cast', 'lucide:airplay', 'lucide:maximize', 'lucide:minimize',
    'lucide:picture-in-picture-2', 'lucide:disc-3',
  ]),
  group('settings', 'Settings & system', 'free', [
    'lucide:settings', 'lucide:settings-2', 'lucide:sliders-horizontal', 'lucide:sliders-vertical',
    'lucide:toggle-left', 'lucide:toggle-right', 'lucide:power', 'lucide:bell',
    'lucide:bell-off', 'lucide:lock', 'lucide:lock-open', 'lucide:shield',
    'lucide:shield-check', 'lucide:key-round', 'lucide:user-cog', 'lucide:wifi',
    'lucide:wifi-off', 'lucide:bluetooth', 'lucide:battery', 'lucide:battery-charging',
    'lucide:cpu', 'lucide:hard-drive', 'lucide:monitor', 'lucide:smartphone',
    'lucide:sun', 'lucide:moon', 'lucide:languages', 'lucide:refresh-cw',
    'tabler:adjustments', 'tabler:adjustments-horizontal', 'tabler:device-desktop-cog', 'tabler:fingerprint',
  ]),
  // The Pro groups' icon lists are served to Pro accounts by
  // /api/ai?library=icongroups; the browser holds only what the index shows.
  stub('commerce', 'Commerce', 28, ['lucide', 'tabler', 'iconoir']),
  stub('communication', 'Communication', 28, ['lucide', 'tabler', 'iconoir']),
  stub('files', 'Files & data', 30, ['lucide', 'tabler']),
  stub('social', 'Social', 32, ['lucide', 'tabler']),
  stub('editor', 'Editor & text', 32, ['lucide', 'tabler']),
  stub('weather', 'Weather', 28, ['lucide', 'tabler']),
  stub('status', 'Status & alerts', 28, ['lucide', 'tabler']),
  stub('dashboard', 'Dashboard & analytics', 27, ['lucide', 'tabler']),
  stub('app-navigation', 'App navigation', 26, ['lucide', 'tabler']),
  stub('code', 'Code & terminal', 27, ['lucide', 'tabler']),
  stub('portfolio', 'Portfolio & creative', 30, ['lucide', 'tabler']),
  stub('events', 'Events & tickets', 29, ['lucide', 'tabler']),
  stub('tech-brands', 'Tech brands', 25, ['tabler', 'iconoir']),
  stub('payment-brands', 'Payments & crypto', 20, ['tabler', 'iconoir']),
  stub('developer-tools', 'Languages & frameworks', 28, ['tabler', 'iconoir']),
])

/** How many icons an index card previews for an open group. */
export const GROUP_PREVIEW_COUNT = 8

/** `'pack:name'` → `{ pack, name }`. */
export function parseIconRef(ref) {
  const s = String(ref || '')
  const at = s.indexOf(':')
  return at > 0 ? { pack: s.slice(0, at), name: s.slice(at + 1) } : { pack: '', name: s }
}

export function groupById(id) {
  return PREMADE_ICON_GROUPS.find((g) => g.id === id) || null
}

/** The group's own URL: the groups tab with the group selected. */
export function groupRoute(id) {
  return `${ICON_GROUPS_ROUTE}?group=${encodeURIComponent(id)}`
}

/** The packs a group draws from, in first-use order. */
export function groupPacks(g) {
  if (Array.isArray(g?.icons)) return [...new Set(g.icons.map((ref) => parseIconRef(ref).pack))]
  return [...(g?.packs || [])]
}

/** How many icons a group holds, whether or not its list is loaded. */
export function groupCount(g) {
  return g?.icons?.length ?? g?.count ?? 0
}

/**
 * The groups with each Pro stub's icon list put back from the library rows a
 * Pro account fetched ([{ id, label, icons }]). A stub with no matching row
 * stays a stub, so the result is safe to render before the rows arrive.
 */
export function withProIcons(proItems) {
  const byId = new Map()
  for (const row of Array.isArray(proItems) ? proItems : []) {
    if (row && typeof row.id === 'string' && Array.isArray(row.icons) && row.icons.length) byId.set(row.id, row)
  }
  if (!byId.size) return PREMADE_ICON_GROUPS
  return Object.freeze(PREMADE_ICON_GROUPS.map((g) => {
    const row = g.access === 'pro' && !g.icons ? byId.get(g.id) : null
    return row ? group(g.id, g.label, 'pro', row.icons.map(String)) : g
  }))
}

const RANK = Object.fromEntries(TIER_ORDER.map((t, i) => [t, i]))

/**
 * What a viewer at `tier` ('anon' | 'free' | 'paid', see viewerTier) needs to
 * open this group: null when it is open, otherwise the tier that opens it —
 * 'free' (an account) or 'paid' (Pro). Fail-closed: an unknown pack needs Pro.
 */
export function groupNeeds(g, tier) {
  if (!g) return 'paid'
  let need = g.access === 'free' ? null : 'paid'
  for (const pack of groupPacks(g)) {
    if (canSeePack(pack, tier)) continue
    const packTier = tierOf(pack) || 'paid'
    if (!need || RANK[packTier] > RANK[need]) need = packTier
  }
  if (tier === 'paid') return null
  return need
}

export function isGroupOpen(g, tier) {
  return groupNeeds(g, tier) === null
}

/**
 * The glyphs this viewer may fetch for these groups, as Map(pack → names).
 * Locked groups contribute nothing, so no request is ever made for a group
 * (or a pack) the viewer cannot see. `limit` caps the names taken from each
 * group — the index only needs a preview.
 */
export function glyphRequestPlan(groups, tier, { limit = Infinity } = {}) {
  const plan = new Map()
  for (const g of groups || []) {
    if (!isGroupOpen(g, tier)) continue
    for (const ref of (g.icons || []).slice(0, limit)) {
      const { pack, name } = parseIconRef(ref)
      if (!canSeePack(pack, tier)) continue
      // The animated sets are not group material and never load from the Iconify host.
      if (isAnimatedPack(pack)) continue
      if (!plan.has(pack)) plan.set(pack, [])
      const names = plan.get(pack)
      if (!names.includes(name)) names.push(name)
    }
  }
  return plan
}

/**
 * The groups as a viewer at `tier` sees them. Open groups carry their preview
 * icon ids; locked groups carry only public facts (name, count, packs, what
 * opens them) and never an icon id. Shared with any surface that lists the
 * groups, so every list agrees on what is locked.
 */
export function listIconGroups({ tier = 'anon', groups = PREMADE_ICON_GROUPS } = {}) {
  return groups.map((g) => {
    const need = groupNeeds(g, tier)
    return {
      id: g.id,
      label: g.label,
      route: groupRoute(g.id),
      count: groupCount(g),
      packs: groupPacks(g),
      access: g.access,
      locked: need !== null,
      need,
      preview: need === null ? (g.icons || []).slice(0, GROUP_PREVIEW_COUNT) : [],
    }
  })
}
