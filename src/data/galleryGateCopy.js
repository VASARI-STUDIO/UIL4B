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

import { LIBRARY_TOTALS } from './libraryTotals.js'

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

// The icon-group and prompt galleries. The palette and gradient libraries count a
// filter over the whole library and read libraryGateCopy (end of this file).
export const GALLERY_GATE_COPY = {
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

/* The gate under the Palette and Gradient libraries, which count a filter over
 * the whole library (utils/galleryCounts.js) and so can say what a filter would
 * open. `variant` is which case the counts are in; the page turns each action
 * into a handler.
 *
 *   account   signed out, and a free account opens more than is on screen
 *   more      Pro opens more than is on screen (the free rung, or signed out
 *             with nothing more a free account adds)
 *   pro-only  nothing is open under these filters and Pro opens them
 *   unknown   a facet filter the locked rows cannot answer yet (their stubs do
 *             not carry it), so the gate speaks for the whole library
 *
 *   S, A, T   shown, account and total counts; P how many Pro opens beyond the
 *             viewer; opens what a free account opens in all.
 *   nounFor   (count) => the noun for the filter ("radial gradients").
 *
 * Returns { heading, body, primary: { label, action }, secondary? }, where an
 * action is 'signup', 'login' or 'plans'. Every number comes from the counts.
 */
const LIBRARY_COPY = {
  palettes: { one: 'palette', many: 'palettes', proTail: ', including every brand system' },
  gradients: { one: 'gradient', many: 'gradients', proTail: ', each one editable in the Gradient Generator' },
}

const upper = (text) => text.charAt(0).toUpperCase() + text.slice(1)

export function libraryGateCopy(kind, { variant, anonymous, S, A, T, P, opens, nounFor }) {
  const lib = LIBRARY_COPY[kind]
  const total = LIBRARY_TOTALS[kind]
  const word = (count) => (count === 1 ? lib.one : lib.many)
  const login = { label: 'Log in', action: 'login' }

  if (variant === 'unknown') {
    if (anonymous) {
      return {
        heading: `Log in to access ${n(opens)} ${word(opens)}`,
        body: `Some of the ${n(total)} ${lib.many} that match are locked. A free account opens ${n(opens)}; Pro opens all ${n(total)}.`,
        primary: { label: 'Create a free account', action: 'signup' },
        secondary: login,
      }
    }
    return {
      heading: `Pro opens every ${lib.one}`,
      body: S > 0
        ? `Your free account opens ${n(S)} that match these filters. Pro opens all ${n(total)}${lib.proTail}.`
        : `Pro opens all ${n(total)}${lib.proTail}.`,
      primary: { label: 'Upgrade to Pro', action: 'plans' },
    }
  }

  if (variant === 'account') {
    return {
      heading: `Log in to access ${n(A)} ${nounFor(A)}`,
      body: `You're seeing ${n(S)} of the ${n(T)} ${nounFor(T)}. A free account opens ${n(A)}; Pro opens all ${n(T)}.`,
      primary: { label: 'Create a free account', action: 'signup' },
      secondary: login,
    }
  }

  const primary = anonymous
    ? { label: 'See what Pro includes', action: 'plans' }
    : { label: 'Upgrade to Pro', action: 'plans' }
  const secondary = anonymous ? login : undefined
  if (variant === 'more') {
    return {
      heading: `${n(P)} more ${nounFor(P)} with Pro`,
      body: `You're seeing ${n(S)} of the ${n(T)} ${nounFor(T)}. Pro opens the remaining ${n(P)}${lib.proTail}.`,
      primary,
      secondary,
    }
  }
  return {
    heading: `${upper(nounFor(T))} ${T === 1 ? 'is' : 'are'} part of Pro`,
    body: `Pro opens all ${n(T)} ${nounFor(T)}.`,
    primary,
    secondary,
  }
}
