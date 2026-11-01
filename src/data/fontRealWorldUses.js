// Documented real-world uses of a typeface, listed per family, and the rule that
// decides whether an entry may be shown.
//
// Each entry is a LINK to the page that documents the use. The app hosts no
// third-party imagery: a documenting page (a Fonts In Use entry, or the brand's
// own typography page) is cited, not copied.
//
// REAL_WORLD_USES is keyed by family name, spelled exactly as the Google Fonts
// catalogue spells it ("Playfair Display", not "playfair-display"), because that
// is the string every caller already holds. Each value is an array; the panel
// shows the entries in the order given.
//
//   title    What the use is: a brand or a project.
//   year     Optional. Four digits, only when the documenting page states it.
//   where    One short plain line on where the family appears. When the
//            documenting page does not say, use "Documented on Fonts In Use".
//   credit   Who documented it, shown as the credit line.
//   url      The documenting page. Absolute https only.
//
// An entry may also carry an image, but only with all of its provenance. These
// four fields travel together: leave all of them out, or give all of them.
//
//   image    Path to a local file under `public/`, starting with "/". Never a
//            hot link.
//   alt      What is in the picture, for a reader who cannot see it.
//   author   Who made the picture.
//   licence  The permission it is shown under, for example "CC BY-SA 4.0".
//
// `isShowable` fails closed: an entry that is malformed, or that names an image
// without its alt text, author and licence, is dropped rather than drawn partly.

/** Family name → the documented uses for it. */
export const REAL_WORLD_USES = {
  Roboto: [
    {
      title: '7-Eleven rebranding',
      where: 'Roboto is used on the brand’s website.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/uses/41967/7-eleven-rebranding',
    },
    {
      title: 'Canton of Bern corporate design',
      where: 'Roboto is used on the canton’s website.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/uses/40563/canton-of-bern-corporate-design-2020',
    },
    {
      title: 'All Roboto uses on Fonts In Use',
      where: 'Every documented use of Roboto, on the Fonts In Use typeface page.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/typefaces/31435/roboto',
    },
  ],
  'Open Sans': [
    {
      title: 'America250',
      where: 'Open Sans is used on the America250 website.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/uses/78716/america250',
    },
    {
      title: 'All Open Sans uses on Fonts In Use',
      where: 'Every documented use of Open Sans, on the Fonts In Use typeface page.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/typefaces/7520/open-sans',
    },
  ],
  Montserrat: [
    {
      title: 'Wikimedia Foundation',
      where: 'Montserrat is used in the Wikimedia Foundation logo and for all of its branded content.',
      credit: 'Wikimedia Foundation brand guidelines',
      url: 'https://meta.wikimedia.org/wiki/Brand/Typography',
    },
    {
      title: 'All Montserrat uses on Fonts In Use',
      where: 'Every documented use of Montserrat, on the Fonts In Use typeface page.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/typefaces/32481/montserrat',
    },
  ],
  Poppins: [
    {
      title: 'All Poppins uses on Fonts In Use',
      where: 'Every documented use of Poppins, on the Fonts In Use typeface page.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/typefaces/45323/poppins',
    },
  ],
  Inter: [
    {
      title: 'Ville de Fribourg identity',
      where: 'Documented on Fonts In Use',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/uses/72741/ville-de-fribourg-stadt-freiburg-identity',
    },
    {
      title: 'Verhaalpaal Noord',
      where: 'Documented on Fonts In Use',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/uses/69280/verhaalpaal-noord-exhibition-and-gogme-hoe-am',
    },
    {
      title: 'Hjärnfonden',
      where: 'Documented on Fonts In Use',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/uses/45179/hjaernfonden',
    },
    {
      title: 'All Inter uses on Fonts In Use',
      where: 'Every documented use of Inter, on the Fonts In Use typeface page.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/typefaces/93554/inter',
    },
  ],
  'Roboto Condensed': [
    {
      title: 'All Roboto Condensed uses on Fonts In Use',
      where: 'Every documented use of Roboto Condensed, on the Fonts In Use typeface page.',
      credit: 'Fonts In Use',
      url: 'https://fontsinuse.com/typefaces/90008/roboto-condensed',
    },
  ],
}

/** Fields every entry must carry. */
export const REQUIRED_USE_FIELDS = ['title', 'where', 'credit', 'url']

/** The four fields that travel together: all present, or all absent. */
export const IMAGE_USE_FIELDS = ['image', 'alt', 'author', 'licence']

/** True when a value is a non-empty string once trimmed. */
function filled(value) {
  return typeof value === 'string' && value.trim().length > 0
}

/** True for an absolute https URL. */
export function isHttpsUrl(value) {
  if (!filled(value)) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** True for a path into `public/` ("/font-uses/x.jpg"), not a URL. */
function isLocalPath(value) {
  return filled(value) && /^\/(?!\/)/.test(value)
}

/**
 * May this entry be shown?
 *
 * A link-only entry needs its title, line, credit and an https URL. An entry
 * that names any image field needs all four, so a picture is never drawn
 * without its alt text, author and licence.
 */
export function isShowable(use) {
  if (!use || typeof use !== 'object' || Array.isArray(use)) return false
  if (!REQUIRED_USE_FIELDS.every(field => filled(use[field]))) return false
  if (!isHttpsUrl(use.url)) return false
  if (use.year !== undefined && !/^\d{4}$/.test(String(use.year))) return false
  const hasImageField = IMAGE_USE_FIELDS.some(field => use[field] !== undefined)
  if (hasImageField) {
    if (!IMAGE_USE_FIELDS.every(field => filled(use[field]))) return false
    if (!isLocalPath(use.image)) return false
  }
  return true
}

/**
 * The showable uses for a family, in the order they were listed.
 *
 * Always an array. An unknown family, a family with no entries and a family
 * whose entries are all refused give the same answer: nothing to show.
 */
export function usesFor(family) {
  if (!filled(family)) return []
  const rows = Object.hasOwn(REAL_WORLD_USES, family) ? REAL_WORLD_USES[family] : null
  if (!Array.isArray(rows)) return []
  return rows.filter(isShowable)
}
