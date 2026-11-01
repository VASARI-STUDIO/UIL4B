// The prompt gallery's arithmetic: which prompts a section holds, which of
// them the overview shows, and in what order. Pure, so the page and the tests
// read the same answers.
//
// Two different questions, kept apart on purpose:
//   members  primary-category prompts and tag matches. Lists, chips and the
//            section's count line use this, so filtering stays complete.
//   own      the prompts whose main `category` is this one. The overview shows
//            only these, so each prompt appears there exactly once.
//
// Nothing here can move a prompt across the gate: `isOpen` is the page's
// answer for this viewer, computed by splitLockedLibrary before any of this.
import { parseTags } from '../../utils/promptStore'
import { TAG_CATEGORIES } from '../../data/promptCategories'

/** How many main prompts a section needs, with an open one first, to get a shelf. */
export const SHELF_MIN = 5
/** A shelf shows its lead and this many more above 640px. */
export const SHELF_REST = 4
/** At 640 and below a shelf shows its lead and 2 rows. */
export const PHONE_SHELF = 3
/** A cover shows up to this many outputs. */
export const COVER_MAX = 4

export const categoryBySlug = (slug) => TAG_CATEGORIES.find((c) => c.slug === slug) || null

/** Primary-category and tag-matching prompts, in the order given. */
export function categoryMembers(cat, rows) {
  if (!cat) return rows
  return rows.filter((p) => mainCategoryOf(p) === cat.slug || parseTags(p.tags).some((tag) => cat.tags.includes(tag)))
}

/**
 * A prompt's main category slug. The data field when it names a real
 * category; otherwise the first category its tags match, so a prompt added
 * without the field still appears once rather than not at all.
 */
export function mainCategoryOf(p) {
  if (p?.category && categoryBySlug(p.category)) return p.category
  const tags = parseTags(p?.tags)
  return TAG_CATEGORIES.find((c) => tags.some((tag) => c.tags.includes(tag)))?.slug || null
}

/**
 * Overview order inside a section: open before locked, open by saves (most
 * first), locked in library order (a stub publishes no saves).
 */
export function orderForOverview(items, isOpen, indexOf) {
  return [...items].sort((a, b) => {
    const oa = isOpen(a)
    const ob = isOpen(b)
    if (oa !== ob) return oa ? -1 : 1
    return oa ? (b.saves || 0) - (a.saves || 0) : indexOf(a) - indexOf(b)
  })
}

/**
 * The overview, built once per viewer.
 *
 *   rows    the whole library in canonical order (open rows and locked stubs).
 *   isOpen  (row) => true when this viewer may open it.
 *
 * Returns { shelves, covers }. Each section is
 *   { cat, members, own, shown, more, moreOnPhone }
 * A shelf needs SHELF_MIN main prompts with an open one first, so its large
 * lead is never a blur; any other section with main prompts is a cover. A
 * category with no main prompts is left out (it stays in the list's chips).
 * Shelves run largest first (by members); covers run by how many outputs they
 * show, most first, so equal covers pair up and an unpaired one spans the row.
 * `more` is true only when the list holds prompts the section does not show,
 * so View more never opens a list that repeats what the section already shows.
 */
export function buildOverview(rows, isOpen) {
  const index = new Map(rows.map((p, i) => [p.id, i]))
  const indexOf = (p) => index.get(p.id) ?? 0
  const sections = TAG_CATEGORIES.map((cat) => {
    const members = categoryMembers(cat, rows)
    const own = orderForOverview(rows.filter((p) => mainCategoryOf(p) === cat.slug), isOpen, indexOf)
    return { cat, members, own }
  }).filter((s) => s.own.length > 0)

  const isShelf = (s) => s.own.length >= SHELF_MIN && isOpen(s.own[0])
  const shelves = sections.filter(isShelf)
    .sort((a, b) => b.members.length - a.members.length)
    .map((s) => {
      const shown = s.own.slice(0, 1 + SHELF_REST)
      const shownIds = new Set(shown.map((p) => p.id))
      const phoneIds = new Set(shown.slice(0, PHONE_SHELF).map((p) => p.id))
      return { ...s, kind: 'shelf', shown, more: s.members.some((p) => !shownIds.has(p.id)), moreOnPhone: s.members.some((p) => !phoneIds.has(p.id)) }
    })
  const covers = sections.filter((s) => !isShelf(s))
    .map((s) => {
      const shown = s.own.slice(0, COVER_MAX)
      const shownIds = new Set(shown.map((p) => p.id))
      const more = s.members.some((p) => !shownIds.has(p.id))
      return { ...s, kind: 'cover', shown, more, moreOnPhone: more }
    })
    .sort((a, b) => (b.shown.length - a.shown.length) || (b.members.length - a.members.length))
  // Covers sit two to a row. Pair them in order; one with no partner showing the
  // same number of outputs takes the whole row, so no row has an empty half.
  for (let i = 0; i < covers.length;) {
    const partner = covers[i + 1]
    if (partner && partner.shown.length === covers[i].shown.length) i += 2
    else { covers[i].span = true; i += 1 }
  }
  return { shelves, covers }
}

/** "10 prompts · 3 open to you"; a viewer who opens everything gets the count alone. */
export function countLine(items, isOpen, showsOpen = true) {
  const n = items.length
  const words = `${n} ${n === 1 ? 'prompt' : 'prompts'}`
  if (!showsOpen) return words
  return `${words} · ${items.filter(isOpen).length} open to you`
}
