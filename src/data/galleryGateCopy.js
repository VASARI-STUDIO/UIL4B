/* What each gallery's closing gate says (components/library/GalleryEndGate).
 *
 * The same shape as ICON_GATE_COPY.end in data/iconPackTiers.js: a heading, a
 * body, a primary action and, where a second way on is true, a secondary link.
 * Every number is passed in from the gallery's live data (the rows it was
 * handed, the tier cap, the groups it lists), so a change to the library or to
 * a cap changes the words with it. Nothing here types a count.
 *
 * Two gates per gallery:
 *   anon  a signed-out viewer, where a free account opens more. The primary
 *         action is "Log in"; the secondary link goes to the plans.
 *   pro   a viewer for whom only Pro opens more. The primary action is the
 *         plans page.
 *
 * Plain Australian English; no emoji.
 */

const n = (v) => Number(v).toLocaleString('en-AU')

/* The pair of gates for a gallery that lists countable items.
 *   one / many   the item as a singular and a plural noun.
 *   proTail      what Pro adds beyond the open count, as a clause that starts
 *                with a comma (or nothing). */
function counted(one, many, proTail = '') {
  const noun = (v) => (v === 1 ? one : many)
  return {
    anon: {
      // `opens` is what a free account opens in all, not what is on screen.
      heading: (opens) => `Log in to access ${n(opens)} ${noun(opens)}`,
      // `shown` is what the viewer has now, `total` the whole library.
      body: (shown, total, opens) => `You're seeing ${n(shown)} of the ${n(total)} ${noun(total)}. A free account opens ${n(opens)}; Pro opens all ${n(total)}.`,
      action: 'Log in',
      secondary: 'See the plans',
    },
    pro: {
      // `more` is how many Pro opens beyond what the viewer has.
      heading: (more) => `Pro opens ${n(more)} more ${noun(more)}`,
      body: (shown, total, more) => `You're seeing ${n(shown)} of the ${n(total)} ${noun(total)}. Pro opens the remaining ${n(more)}${proTail}.`,
      action: 'See what Pro includes',
    },
  }
}

const iconCount = (v) => `${n(v)} ${v === 1 ? 'icon' : 'icons'}`

export const GALLERY_GATE_COPY = {
  palettes: {
    ...counted('palette', 'palettes', ', including every brand system'),
    // A collection the viewer has no open palette of at all, because the tier
    // cap fell before it. `kind` is the collection's name ('Curated', 'Brand').
    emptied: {
      anon: {
        heading: (opens) => `Log in to access ${n(opens)} ${opens === 1 ? 'palette' : 'palettes'}`,
        body: (kind, opens, total) => `No ${kind.toLowerCase()} palettes are open signed out. A free account opens ${n(opens)} of the ${n(total)} palettes; Pro opens all ${n(total)}.`,
        action: 'Log in',
        secondary: 'See the plans',
      },
      pro: {
        heading: (kind) => `${kind} palettes are part of Pro`,
        // Brand systems are Pro outright, so a free account does not help; a
        // signed-out viewer is told the whole offer in one line.
        body: ({ anonymous, total, locked, brand }) => (anonymous
          ? `Pro opens all ${n(total)} palettes, brand systems included.`
          : `Another ${n(locked)} ${locked === 1 ? 'palette opens' : 'palettes open'} with Pro${brand ? ', including every brand system' : ''}.`),
        action: 'See what Pro includes',
      },
    },
  },
  gradients: counted('gradient', 'gradients', ', each one editable in the Gradient Generator'),
  // Groups of icons, listed as cards on the index.
  iconGroups: {
    ...counted('icon group', 'icon groups'),
    // One group the viewer cannot open. `icons` is how many it holds and
    // `sets` the names of the icon sets they come from.
    locked: {
      free: {
        heading: (label) => `${label} needs a free account`,
        body: (icons, sets) => `${iconCount(icons)} from ${sets}. A free account opens it.`,
        action: 'Log in',
        secondary: 'See the plans',
      },
      pro: {
        heading: (label) => `${label} is Pro`,
        body: (icons, sets) => `${iconCount(icons)} from ${sets}. Pro opens it.`,
        action: 'See what Pro includes',
      },
    },
  },
  prompts: counted('community prompt', 'community prompts', ', each as the full brief its author wrote, ready to copy'),
}
