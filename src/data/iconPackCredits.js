// WHAT THIS PRODUCT OWES THE PEOPLE WHOSE ICONS IT SHOWS.
//
// ── The defect this ends ────────────────────────────────────────────────────
//
// /create/icons renders glyphs from twenty-five third-party sets. Four of them
// are Creative Commons Attribution sets — `solar` and `fa6-solid` (CC-BY-4.0),
// `twemoji` (CC-BY-4.0) and `openmoji` (CC-BY-SA-4.0) — and attribution is a
// CONDITION of those licences, not a courtesy. Two of the four sit on the FREE
// tier (see src/data/iconPackTiers.js), so the obligation is owed to a
// signed-out visitor, on first paint, with no account.
//
// Until this file existed the app carried exactly ONE attribution string: a
// `<p className="ig-attrib">` in IconLibrary.jsx rendered only when
// `pack === 'logodev'`. Every other set was uncredited, and the one credit that
// did exist disappeared the moment the visitor changed packs — including
// logo.dev's own, whose free tier requires the link wherever its logos appear.
//
// ── Why this table is a FALLBACK and not the answer ─────────────────────────
//
// Iconify's `/collection?prefix=<pack>&info=1` response carries the licence as
// data — `info.license = { title, spdx, url }` — and the pack's author with it.
// IconLibrary.jsx asks for `info=1` on the twenty-five requests it was already
// making, so on a normal visit the licence a visitor reads is the one the
// registry is publishing TODAY. A pack that relicenses is credited correctly on
// the next page load, with nobody editing anything.
//
// This table is what is shown when that data is not there, and it is there for
// three states that are all real:
//
//   · the offline/refused state. Every Iconify host answering 429 or 403 is a
//     measured event here (2026-09-08, 2026-09-15) and the page falls back to
//     built-in icons — which are still Lucide, Tabler, Iconoir, Heroicons and
//     Simple Icons, and still owe their notices.
//   · the acceptance suite, which answers /collection from committed fixtures
//     under tests/user-sim/fixtures/iconify/. Those fixtures carry no `info`
//     block, so a suite run reads this table. That is deliberate: the fixtures
//     are not ours to grow, and an attribution line that only appears when a
//     third party is up is not an attribution line.
//   · /credits, which lists every pack including the ones this visitor's tier
//     never requested. Nothing is fetched for a pack nobody browsed
//     (src/utils/lockedPreview.js), so the credits page cannot be live-derived
//     without making requests for packs the viewer is not entitled to.
//
// ── Where the values came from ──────────────────────────────────────────────
//
// Every row below was READ OUT OF https://api.iconify.design/collections on
// 2026-09-23 — the same registry the live path reads — rather than typed from
// memory. tests/unit/credits-coverage.test.js asserts the key set here is
// exactly the key set of ICON_PACK_TIERS, so a pack cannot be added to the
// library without a credit row, and a row cannot outlive its pack.
import { ICON_PACK_TIERS } from './iconPackTiers.js'

/**
 * What a licence asks of a surface that DISPLAYS the work, in one sentence.
 *
 * Stated per licence rather than per pack because it is a property of the
 * licence, and because the four words that matter — "attribution is required" —
 * should not be re-decided pack by pack.
 *
 * `required` is the narrow legal question: does this licence make crediting a
 * CONDITION of the grant? Where it is false we credit anyway; the field exists
 * so /credits can say which rows are an obligation and which are manners,
 * rather than implying all twenty-five are the same kind of thing.
 */
export const LICENCES = {
  'CC-BY-4.0': {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    required: true,
    asks: 'Credit the creator and link the licence wherever the work appears.',
  },
  'CC-BY-SA-4.0': {
    name: 'CC BY-SA 4.0',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    required: true,
    asks: 'Credit the creator, link the licence, and share any adaptation on the same terms.',
  },
  'Apache-2.0': {
    name: 'Apache 2.0',
    url: 'https://www.apache.org/licenses/LICENSE-2.0',
    required: true,
    asks: 'Keep the copyright and licence notices with every copy of the work.',
  },
  MIT: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
    required: true,
    asks: 'Keep the copyright notice and the licence text with every copy.',
  },
  ISC: {
    name: 'ISC',
    url: 'https://opensource.org/licenses/ISC',
    required: true,
    asks: 'Keep the copyright notice and the licence text with every copy.',
  },
  'CC0-1.0': {
    name: 'CC0 1.0',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    required: false,
    asks: 'Dedicated to the public domain. Nothing is required; the credit is ours to give.',
  },
  'OFL-1.1': {
    name: 'SIL Open Font License 1.1',
    url: 'https://openfontlicense.org/',
    required: true,
    asks: 'Ship the copyright notice and the licence with the font files, and never sell the fonts on their own.',
  },
  'MIT OR GPL-3.0-or-later': {
    name: 'MIT or GPL-3.0-or-later',
    url: 'https://opensource.org/licenses/MIT',
    required: true,
    asks: 'Dual-licensed. UIL4B elects MIT, and keeps the MIT notice with every copy.',
  },
  proprietary: {
    name: 'Proprietary terms',
    url: '',
    required: true,
    asks: 'Used under the publisher’s own terms rather than an open licence.',
  },
}

/** The SPDX ids whose licence makes crediting a condition of the grant. */
export const REQUIRES_ATTRIBUTION = Object.freeze(
  Object.entries(LICENCES).filter(([, l]) => l.required).map(([id]) => id),
)

/* ── THE TABLE ──────────────────────────────────────────────────────────────
 *
 * One row per prefix in ICON_PACK_TIERS, plus nothing else — the test asserts
 * the two key sets are identical in both directions.
 *
 *   name    what the registry calls the set. Not IconLibrary's PACK_MENU label,
 *           which is a nav word ("Font Awesome", "Logos (colour)"); a credit
 *           names the thing its authors named.
 *   author  the person or organisation the licence says to credit.
 *   url     where the set lives. This is the attribution LINK.
 *   spdx    a key of LICENCES above.
 */
export const ICON_PACK_CREDITS = {
  lucide: { name: 'Lucide', author: 'Lucide Contributors', url: 'https://github.com/lucide-icons/lucide', spdx: 'ISC' },
  tabler: { name: 'Tabler Icons', author: 'Paweł Kuna', url: 'https://github.com/tabler/tabler-icons', spdx: 'MIT' },
  iconoir: { name: 'Iconoir', author: 'Luca Burgio', url: 'https://github.com/iconoir-icons/iconoir', spdx: 'MIT' },
  heroicons: { name: 'Heroicons', author: 'Refactoring UI Inc', url: 'https://github.com/tailwindlabs/heroicons', spdx: 'MIT' },
  ph: { name: 'Phosphor', author: 'Phosphor Icons', url: 'https://github.com/phosphor-icons/core', spdx: 'MIT' },

  mdi: { name: 'Material Design Icons', author: 'Pictogrammers', url: 'https://github.com/Templarian/MaterialDesign', spdx: 'Apache-2.0' },
  'material-symbols': { name: 'Material Symbols', author: 'Google', url: 'https://github.com/google/material-design-icons', spdx: 'Apache-2.0' },
  // ── One of the two CC-BY sets a signed-out visitor can see. ──
  solar: { name: 'Solar', author: '480 Design', url: 'https://www.figma.com/community/file/1166831539721848736', spdx: 'CC-BY-4.0' },
  // ── The other. Font Awesome's FREE icons are CC-BY-4.0; the Pro sets are not
  //    here at all. ──
  'fa6-solid': { name: 'Font Awesome 6 Solid', author: 'Dave Gandy / Fonticons, Inc.', url: 'https://github.com/FortAwesome/Font-Awesome', spdx: 'CC-BY-4.0' },
  bxs: { name: 'BoxIcons v2 Solid', author: 'Boxicons', url: 'https://github.com/box-icons/boxicons', spdx: 'MIT' },

  'simple-icons': { name: 'Simple Icons', author: 'Simple Icons Collaborators', url: 'https://github.com/simple-icons/simple-icons', spdx: 'CC0-1.0' },
  logos: { name: 'SVG Logos', author: 'Gil Barbara', url: 'https://github.com/gilbarbara/logos', spdx: 'CC0-1.0' },
  devicon: { name: 'Devicon', author: 'konpa and the Devicon contributors', url: 'https://github.com/devicons/devicon', spdx: 'MIT' },
  'skill-icons': { name: 'Skill Icons', author: 'tandpfun', url: 'https://github.com/tandpfun/skill-icons', spdx: 'MIT' },
  'vscode-icons': { name: 'VSCode Icons', author: 'Roberto Huertas', url: 'https://github.com/vscode-icons/vscode-icons', spdx: 'MIT' },
  'token-branded': { name: 'Web3 Icons Branded', author: '0xa3k5', url: 'https://github.com/0xa3k5/web3icons', spdx: 'MIT' },
  // ── The registry publishes no licence URL for this one, so LICENCES supplies
  //    the canonical MIT text instead of the row carrying a guess. ──
  'flat-color-icons': { name: 'Flat Color Icons', author: 'Icons8', url: 'https://github.com/icons8/flat-Color-icons', spdx: 'MIT' },

  'circle-flags': { name: 'Circle Flags', author: 'HatScripts', url: 'https://github.com/HatScripts/circle-flags', spdx: 'MIT' },
  flag: { name: 'Flag Icons', author: 'Panayiotis Lipiridis', url: 'https://github.com/lipis/flag-icons', spdx: 'MIT' },
  flagpack: { name: 'Flagpack', author: 'Yummygum', url: 'https://github.com/Yummygum/flagpack-core', spdx: 'MIT' },
  cif: { name: 'CoreUI Flags', author: 'creativeLabs Łukasz Holeczek', url: 'https://github.com/coreui/coreui-icons', spdx: 'CC0-1.0' },

  // ── Two more CC-BY sets. Both are Pro, which changes who sees them and
  //    changes nothing about what is owed when they do. ──
  twemoji: { name: 'Twemoji', author: 'Twitter, Inc and other contributors', url: 'https://github.com/jdecked/twemoji', spdx: 'CC-BY-4.0' },
  openmoji: { name: 'OpenMoji', author: 'OpenMoji — the open-source emoji and icon project', url: 'https://openmoji.org/', spdx: 'CC-BY-SA-4.0' },
  'fluent-emoji': { name: 'Fluent Emoji', author: 'Microsoft Corporation', url: 'https://github.com/microsoft/fluentui-emoji', spdx: 'MIT' },
  noto: { name: 'Noto Emoji', author: 'Google Inc', url: 'https://github.com/googlefonts/noto-emoji', spdx: 'Apache-2.0' },

  /* THE ONE PACK THAT IS NOT ICONIFY AT ALL, and the one whose attribution was
     already here. img.logo.dev is a commercial API on our publishable token,
     and its free tier's condition is a visible link back to logo.dev wherever
     its logos are shown. `spdx: 'proprietary'` is not a licence id — it is this
     module saying, in the one field that could have quietly implied otherwise,
     that there is no open licence behind these marks. The live path can never
     overwrite this row: logo.dev makes no /collection request. */
  logodev: {
    name: 'Logo.dev',
    author: 'Logo.dev',
    url: 'https://logo.dev',
    spdx: 'proprietary',
    note: 'Company logos are the trademarks of their owners, served through the Logo.dev API. Its free tier requires this link wherever the logos appear.',
  },
}

/** The licence record for an SPDX id, or the proprietary row for an unknown one. */
export function licenceOf(spdx) {
  return LICENCES[spdx] || LICENCES.proprietary
}

/**
 * Pull the credit out of an Iconify `/collection?...&info=1` response.
 *
 * Returns null for a response with no `info` block, which is what the plain
 * `/collection` endpoint answers and what every committed fixture holds — so a
 * caller that gets null falls through to the table above rather than rendering
 * a pack with no licence beside it.
 *
 * `spdx` is taken only when LICENCES knows it. An id this module has no
 * sentence for would render a licence name with no statement of what it asks,
 * which is the shape of an attribution that has stopped meaning anything.
 */
export function iconifyCredit(collection) {
  const info = collection?.info
  if (!info || typeof info !== 'object') return null
  const spdx = info.license?.spdx
  const out = {}
  if (typeof info.name === 'string' && info.name) out.name = info.name
  if (typeof info.author?.name === 'string' && info.author.name) out.author = info.author.name
  if (typeof info.author?.url === 'string' && /^https:\/\//.test(info.author.url)) out.url = info.author.url
  if (typeof spdx === 'string' && LICENCES[spdx]) out.spdx = spdx
  // The registry's own licence URL, when it publishes one, is more specific
  // than LICENCES[spdx].url — it points at that project's LICENSE file rather
  // than at the generic text.
  if (typeof info.license?.url === 'string' && /^https:\/\//.test(info.license.url)) out.licenceUrl = info.license.url
  return Object.keys(out).length ? out : null
}

/**
 * The credit to display for a pack: the table row, with anything the live
 * registry answered laid over the top.
 *
 * Merge direction is deliberate. The table is the floor — a row always has a
 * name, an author, a link and a licence — and the live values only ever replace
 * a field they actually carry. A partial `info` block cannot blank a credit.
 */
export function packCredit(prefix, live) {
  const base = ICON_PACK_CREDITS[prefix]
  if (!base) return null
  const merged = { prefix, ...base, ...(live || {}) }
  const licence = licenceOf(merged.spdx)
  return {
    ...merged,
    licenceName: licence.name,
    licenceUrl: merged.licenceUrl || licence.url,
    licenceAsks: licence.asks,
    licenceRequired: licence.required,
  }
}

/**
 * Every pack, credited, in the order src/data/iconPackTiers.js declares them —
 * which is anon, then free, then paid. Read from that table's key order rather
 * than from this file's, so the credits page cannot list a pack the product no
 * longer carries, and cannot miss one it has just gained.
 */
export function allPackCredits() {
  return Object.keys(ICON_PACK_TIERS).map((prefix) => ({
    ...packCredit(prefix),
    tier: ICON_PACK_TIERS[prefix].tier,
  }))
}
