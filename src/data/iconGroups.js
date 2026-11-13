// Premade icon groups: themed sets, most drawn from several packs that read as
// one family, so a set of icons for one job can be taken in one go.
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
// against a recorded snapshot of the real glyph data
// (tests/unit/fixtures/icon-groups-snapshot.json, written by
// scripts/snapshot-icon-groups.mjs): the id exists, the viewBox is 24, the
// glyph is stroked on currentColor, and caps and joins are round.
//
// ── Who sees which group ────────────────────────────────────────────────────
//
// `access: 'free'` groups open for every viewer, signed out included; taking
// the files away still goes through the account gate (useExportGate).
// `access: 'pro'` groups open on Pro only. On top of that, a group is only
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

export const PREMADE_ICON_GROUPS = Object.freeze([
  // Wayfinding is drawn from Lucide alone: it is the free group most people take,
  // and one pack means one licence and one source for every glyph in it.
  group('wayfinding', 'Wayfinding', 'free', [
    'lucide:arrow-up', 'lucide:arrow-down', 'lucide:arrow-left', 'lucide:arrow-right',
    'lucide:arrow-up-right', 'lucide:arrow-down-left', 'lucide:chevron-up', 'lucide:chevron-down',
    'lucide:chevron-left', 'lucide:chevron-right', 'lucide:chevrons-up-down', 'lucide:corner-up-left',
    'lucide:corner-down-right', 'lucide:external-link', 'lucide:move', 'lucide:map-pin',
    'lucide:map', 'lucide:compass', 'lucide:navigation', 'lucide:signpost',
    'lucide:route', 'lucide:milestone', 'lucide:locate-fixed', 'lucide:undo-2',
    'lucide:redo-2', 'lucide:signpost-big', 'lucide:locate', 'lucide:arrow-left-right',
    'lucide:split', 'lucide:merge', 'lucide:corner-up-right', 'lucide:navigation-2',
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
  group('commerce', 'Commerce', 'pro', [
    'lucide:shopping-cart', 'lucide:shopping-bag', 'lucide:shopping-basket', 'lucide:store',
    'lucide:credit-card', 'lucide:wallet', 'lucide:receipt', 'lucide:tag',
    'lucide:tags', 'lucide:percent', 'lucide:badge-percent', 'lucide:gift',
    'lucide:package', 'lucide:package-check', 'lucide:truck', 'lucide:coins',
    'lucide:banknote', 'lucide:scan-barcode', 'lucide:hand-coins', 'lucide:piggy-bank',
    'tabler:shopping-cart-plus', 'tabler:shopping-cart-x', 'tabler:credit-card-refund', 'tabler:receipt-refund',
    'tabler:discount', 'tabler:building-store', 'iconoir:cart-plus', 'iconoir:cart-minus',
  ]),
  group('communication', 'Communication', 'pro', [
    'lucide:mail', 'lucide:mail-open', 'lucide:inbox', 'lucide:send',
    'lucide:reply', 'lucide:reply-all', 'lucide:forward', 'lucide:at-sign',
    'lucide:message-circle', 'lucide:message-square', 'lucide:messages-square', 'lucide:message-square-more',
    'lucide:phone', 'lucide:phone-call', 'lucide:phone-off', 'lucide:video',
    'lucide:video-off', 'lucide:voicemail', 'lucide:megaphone', 'lucide:contact',
    'lucide:paperclip', 'tabler:mail-forward', 'tabler:message-2', 'tabler:message-dots',
    'tabler:phone-incoming', 'tabler:phone-outgoing', 'iconoir:chat-bubble', 'iconoir:chat-lines',
  ]),
  group('files', 'Files & data', 'pro', [
    'lucide:file', 'lucide:file-text', 'lucide:file-plus', 'lucide:file-minus',
    'lucide:file-check', 'lucide:file-x', 'lucide:files', 'lucide:folder',
    'lucide:folder-open', 'lucide:folder-plus', 'lucide:archive', 'lucide:clipboard',
    'lucide:clipboard-list', 'lucide:database', 'lucide:hard-drive-download', 'lucide:download',
    'lucide:upload', 'lucide:cloud', 'lucide:cloud-upload', 'lucide:cloud-download',
    'lucide:table', 'lucide:sheet', 'lucide:chart-bar', 'lucide:chart-line',
    'lucide:chart-pie', 'tabler:file-zip', 'tabler:file-export', 'tabler:file-import',
    'tabler:database-export', 'tabler:table-export',
  ]),
  group('social', 'Social', 'pro', [
    'lucide:heart', 'lucide:thumbs-up', 'lucide:thumbs-down', 'lucide:star',
    'lucide:bookmark', 'lucide:share', 'lucide:share-2', 'lucide:repeat-2',
    'lucide:message-circle', 'lucide:user', 'lucide:users', 'lucide:user-plus',
    'lucide:user-check', 'lucide:user-minus', 'lucide:at-sign', 'lucide:hash',
    'lucide:link', 'lucide:smile', 'lucide:flag', 'lucide:eye',
    'lucide:trending-up', 'lucide:rss', 'tabler:brand-x', 'tabler:brand-instagram',
    'tabler:brand-facebook', 'tabler:brand-linkedin', 'tabler:brand-youtube', 'tabler:brand-tiktok',
    'tabler:brand-github', 'tabler:brand-threads', 'tabler:brand-bluesky', 'tabler:brand-pinterest',
  ]),
  group('editor', 'Editor & text', 'pro', [
    'lucide:bold', 'lucide:italic', 'lucide:underline', 'lucide:strikethrough',
    'lucide:heading-1', 'lucide:heading-2', 'lucide:heading-3', 'lucide:pilcrow',
    'lucide:type', 'lucide:quote', 'lucide:code', 'lucide:list',
    'lucide:list-ordered', 'lucide:list-checks', 'lucide:align-left', 'lucide:align-center',
    'lucide:align-right', 'lucide:align-justify', 'lucide:indent-increase', 'lucide:indent-decrease',
    'lucide:link', 'lucide:unlink', 'lucide:image', 'lucide:table',
    'lucide:undo-2', 'lucide:redo-2', 'lucide:highlighter', 'lucide:eraser',
    'lucide:subscript', 'lucide:superscript', 'tabler:text-size', 'tabler:clear-formatting',
  ]),
  group('weather', 'Weather', 'pro', [
    'lucide:sun', 'lucide:moon', 'lucide:cloud', 'lucide:cloud-sun',
    'lucide:cloud-moon', 'lucide:cloud-rain', 'lucide:cloud-drizzle', 'lucide:cloud-snow',
    'lucide:cloud-lightning', 'lucide:cloud-fog', 'lucide:cloud-hail', 'lucide:cloudy',
    'lucide:snowflake', 'lucide:wind', 'lucide:tornado', 'lucide:rainbow',
    'lucide:umbrella', 'lucide:thermometer', 'lucide:thermometer-sun', 'lucide:thermometer-snowflake',
    'lucide:droplets', 'lucide:sunrise', 'lucide:sunset', 'lucide:haze',
    'tabler:temperature-celsius', 'tabler:temperature-fahrenheit', 'tabler:uv-index', 'tabler:wind-electricity',
  ]),
  group('status', 'Status & alerts', 'pro', [
    'lucide:circle-check', 'lucide:circle-x', 'lucide:circle-alert', 'lucide:triangle-alert',
    'lucide:info', 'lucide:circle-question-mark', 'lucide:circle-dot', 'lucide:circle-dashed',
    'lucide:circle-pause', 'lucide:circle-stop', 'lucide:loader', 'lucide:loader-circle',
    'lucide:hourglass', 'lucide:clock', 'lucide:ban', 'lucide:shield-alert',
    'lucide:badge-check', 'lucide:badge-alert', 'lucide:bell-ring', 'lucide:check',
    'lucide:x', 'lucide:plus', 'lucide:minus', 'lucide:octagon-alert',
    'tabler:progress', 'tabler:progress-check', 'tabler:progress-alert', 'tabler:alert-hexagon',
  ]),
  // ── Added from handover/specs/icon-group-use-cases-2026-11-06.md ───────────
  // Every name below was checked against the pack's own icon list
  // (public/iconify/collections/<pack>.json) and its glyph data. All of them are
  // Pro: the free allowance stays at three groups (see icon-groups.test.js).
  group('dashboard', 'Dashboard & analytics', 'pro', [
    'lucide:layout-dashboard', 'lucide:layout-grid', 'lucide:panel-left', 'lucide:gauge',
    'lucide:circle-gauge', 'lucide:activity', 'lucide:trending-up', 'lucide:trending-down',
    'lucide:target', 'lucide:funnel', 'lucide:list-filter', 'lucide:search',
    'lucide:calendar-days', 'lucide:users', 'lucide:chart-column', 'lucide:chart-area',
    'lucide:kanban', 'lucide:columns-3', 'lucide:table-2', 'lucide:sigma',
    'tabler:dashboard', 'tabler:report-analytics', 'tabler:chart-donut', 'tabler:chart-radar',
    'tabler:chart-candle', 'tabler:timeline', 'tabler:chart-arcs',
  ]),
  group('app-navigation', 'App navigation', 'pro', [
    'lucide:house', 'lucide:search', 'lucide:bell', 'lucide:circle-user-round',
    'lucide:menu', 'lucide:ellipsis', 'lucide:plus', 'lucide:circle-plus',
    'lucide:heart', 'lucide:bookmark', 'lucide:settings', 'lucide:compass',
    'lucide:map-pin', 'lucide:message-circle', 'lucide:inbox', 'lucide:calendar',
    'lucide:camera', 'lucide:library', 'lucide:shopping-bag', 'lucide:wallet',
    'lucide:log-in', 'lucide:log-out', 'lucide:list', 'tabler:apps',
    'tabler:menu-2', 'tabler:dots-vertical',
  ]),
  group('code', 'Code & terminal', 'pro', [
    'lucide:terminal', 'lucide:square-terminal', 'lucide:code', 'lucide:code-xml',
    'lucide:braces', 'lucide:file-code', 'lucide:git-branch', 'lucide:git-commit-horizontal',
    'lucide:git-merge', 'lucide:git-pull-request', 'lucide:git-fork', 'lucide:bug',
    'lucide:webhook', 'lucide:server', 'lucide:database', 'lucide:container',
    'lucide:cpu', 'lucide:command', 'lucide:binary', 'lucide:regex',
    'lucide:variable', 'lucide:package', 'lucide:book-open', 'tabler:api',
    'tabler:api-app', 'tabler:brackets-contain', 'tabler:git-compare',
  ]),
  group('portfolio', 'Portfolio & creative', 'pro', [
    'lucide:briefcase', 'lucide:pen-tool', 'lucide:camera', 'lucide:image',
    'lucide:film', 'lucide:clapperboard', 'lucide:paintbrush', 'lucide:layers',
    'lucide:layout-template', 'lucide:award', 'lucide:trophy', 'lucide:user',
    'lucide:mail', 'lucide:globe', 'lucide:link', 'lucide:folder-open',
    'lucide:lightbulb', 'lucide:sparkles', 'lucide:ruler', 'lucide:crop',
    'lucide:aperture', 'lucide:presentation', 'lucide:graduation-cap', 'lucide:external-link',
    'tabler:palette', 'tabler:color-swatch', 'tabler:vector-bezier', 'tabler:typography',
    'tabler:certificate', 'tabler:file-cv',
  ]),
  group('events', 'Events & tickets', 'pro', [
    'lucide:calendar-check', 'lucide:calendar-plus', 'lucide:calendar-clock', 'lucide:clock',
    'lucide:ticket', 'lucide:ticket-check', 'lucide:map-pin', 'lucide:map-pinned',
    'lucide:users', 'lucide:user-plus', 'lucide:mic-vocal', 'tabler:music',
    'lucide:party-popper', 'lucide:megaphone', 'lucide:bell', 'lucide:share-2',
    'lucide:qr-code', 'lucide:utensils', 'lucide:coffee', 'lucide:wine',
    'lucide:plane', 'lucide:hotel', 'lucide:handshake', 'lucide:accessibility',
    'tabler:confetti', 'tabler:calendar-event', 'tabler:building-stadium', 'tabler:microphone-2',
    'tabler:parking',
  ]),
  // The brand groups draw the OUTLINE brand marks the style rule allows (Tabler's
  // brand-* glyphs, Iconoir's brand glyphs). Simple Icons, Logos and Logo.dev are
  // filled or coloured, so they stay in the library's Brand logos chip, not here.
  // Linear has no outline mark in any group pack, so it is not in Tech brands.
  group('tech-brands', 'Tech brands', 'pro', [
    'tabler:brand-github', 'tabler:brand-gitlab', 'tabler:brand-figma', 'tabler:brand-slack',
    'tabler:brand-notion', 'tabler:brand-vercel', 'tabler:brand-stripe', 'tabler:brand-apple',
    'tabler:brand-windows', 'tabler:brand-aws', 'tabler:brand-azure', 'tabler:brand-dropbox',
    'tabler:brand-zoom', 'tabler:brand-openai', 'tabler:brand-meta', 'tabler:brand-amazon',
    'tabler:brand-cloudflare', 'tabler:brand-airtable', 'tabler:brand-asana', 'tabler:brand-jira',
    'tabler:brand-trello', 'tabler:brand-supabase', 'iconoir:google', 'iconoir:discord',
    'iconoir:telegram',
  ]),
  group('payment-brands', 'Payments & crypto', 'pro', [
    'tabler:brand-stripe', 'tabler:brand-paypal', 'tabler:brand-visa', 'tabler:brand-mastercard',
    'tabler:brand-alipay', 'tabler:brand-cashapp', 'tabler:brand-revolut', 'tabler:brand-paypay',
    'tabler:brand-samsungpass', 'tabler:brand-binance', 'tabler:brand-coinbase', 'tabler:brand-tether',
    'tabler:brand-stellar', 'tabler:brand-gumroad', 'tabler:brand-patreon', 'tabler:brand-kickstarter',
    'iconoir:bitcoin-circle', 'iconoir:ethereum-circle', 'iconoir:litecoin-circle', 'iconoir:dogecoin-circle',
  ]),
  group('developer-tools', 'Languages & frameworks', 'pro', [
    'tabler:brand-git', 'tabler:brand-github-copilot', 'tabler:brand-docker', 'tabler:brand-npm',
    'tabler:brand-nodejs', 'tabler:brand-python', 'tabler:brand-javascript', 'tabler:brand-typescript',
    'tabler:brand-react', 'tabler:brand-vue', 'tabler:brand-angular', 'tabler:brand-svelte',
    'tabler:brand-php', 'tabler:brand-swift', 'tabler:brand-golang', 'tabler:brand-rust',
    'tabler:brand-flutter', 'tabler:brand-mongodb', 'tabler:brand-firebase', 'tabler:brand-redux',
    'tabler:brand-sass', 'tabler:brand-tailwind', 'tabler:brand-vite', 'tabler:brand-vscode',
    'tabler:brand-graphql', 'iconoir:html5', 'iconoir:css3', 'iconoir:codepen',
  ]),
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
  return [...new Set((g?.icons || []).map((ref) => parseIconRef(ref).pack))]
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
    for (const ref of g.icons.slice(0, limit)) {
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
export function listIconGroups({ tier = 'anon' } = {}) {
  return PREMADE_ICON_GROUPS.map((g) => {
    const need = groupNeeds(g, tier)
    return {
      id: g.id,
      label: g.label,
      route: groupRoute(g.id),
      count: g.icons.length,
      packs: groupPacks(g),
      access: g.access,
      locked: need !== null,
      need,
      preview: need === null ? g.icons.slice(0, GROUP_PREVIEW_COUNT) : [],
    }
  })
}
