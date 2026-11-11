// Which Iconify icon draws a given emoji in each of the four emoji art sets the
// detail dialog offers. Pure string work: no React, no DOM, no network.
//
// The four sets name their icons after the emoji's Unicode (CLDR) name in
// kebab-case, so the emoji's name is all that is needed to guess the icon:
//
//   "waving hand"            ->  waving-hand
//   "flag: United States"    ->  flag-united-states
//   "woman’s hat"            ->  womans-hat
//   "antigua & barbuda"      ->  antigua-and-barbuda
//
// A skin tone is appended, and the sets disagree about how:
//
//   noto, twemoji, openmoji  ->  waving-hand-medium-light-skin-tone
//   fluent-emoji             ->  waving-hand-medium-light
//
// Two quirks of the same kind. Noto, Twemoji and OpenMoji put the tone before
// the hair or beard of a person (man-medium-skin-tone-beard) where Fluent puts
// it last (man-beard-medium), and Fluent spells "blond" as "blonde".
//
// A guess can miss: a set may not draw that emoji, or may spell its name
// another way. The caller asks the Iconify API for the name and hides the
// tile of a set that answers "not found", so a wrong guess costs a tile and
// never a broken image.

/**
 * The four sets, in the order their tiles appear. `label` is the set's own
 * name (never a vendor's), matching src/data/iconPackCredits.js.
 * `toneSuffix` is what follows the tone word in a toned icon's name.
 * `toneBeforeHair` puts the tone straight after the person word for a person
 * with hair or a beard. `respell` rewrites a word the set spells differently.
 */
export const EMOJI_STYLE_SETS = Object.freeze([
  { prefix: 'noto', label: 'Noto Emoji', toneSuffix: '-skin-tone', toneBeforeHair: true },
  { prefix: 'twemoji', label: 'Twemoji', toneSuffix: '-skin-tone', toneBeforeHair: true },
  { prefix: 'fluent-emoji', label: 'Fluent Emoji', toneSuffix: '', respell: [['blond-hair', 'blonde-hair']] },
  { prefix: 'openmoji', label: 'OpenMoji', toneSuffix: '-skin-tone', toneBeforeHair: true },
])

// "man: red hair" and its kin: a person word, then the hair or beard.
const HAIRED_PERSON = /^(person|man|woman)-(beard|bald|blond-hair|curly-hair|red-hair|white-hair)$/

/**
 * An emoji name as an Iconify icon name: lower-case, accents folded away,
 * apostrophes and quotes dropped, "&" spelt out, every other run of
 * non-alphanumerics collapsed to one hyphen.
 *
 * Returns '' for a name with nothing usable in it.
 */
export function kebabEmojiName(name) {
  if (typeof name !== 'string') return ''
  // "keycap: #" would otherwise lose its symbol and name the blank keycap.
  if (name.includes('#')) return ''
  return name
    .replace(/\*/g, ' asterisk ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2019'\u2018\u201C\u201D"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * The icon name `set` would use for an emoji called `name` in skin tone
 * `toneId` (one of SKIN_TONES[n].id, or '' / undefined for no tone).
 * '' when no name can be built.
 */
export function styleIconName(set, name, toneId) {
  let base = kebabEmojiName(name)
  if (!base) return ''
  for (const [from, to] of set.respell || []) base = base.replace(from, to)
  if (!toneId) return base
  const tone = `${toneId}${set.toneSuffix}`
  const hair = set.toneBeforeHair && base.match(HAIRED_PERSON)
  return hair ? `${hair[1]}-${tone}-${hair[2]}` : `${base}-${tone}`
}

/**
 * Every set's candidate icon for one emoji: `[{ set, icon }]`, skipping a set
 * whose name cannot be built.
 */
export function styleCandidates(name, toneId) {
  return EMOJI_STYLE_SETS
    .map(set => ({ set, icon: styleIconName(set, name, toneId) }))
    .filter(c => c.icon)
}
