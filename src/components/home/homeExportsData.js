// Data for the homepage exports section: the Kerbside ramp, card 2's rows and
// copy, and card 3's project pill. Plain functions so a unit test can run them
// with the export themes switch both ways.

import { tintsFor } from '../../utils/projectTints.js'
import { tintLabelsFor } from '../../utils/tintLabels.js'
import { FREE_SAVE_LIMITS } from '../../config/plans.js'
import { THEME_FACTS, numberWord } from '../../config/planFacts.js'
import {
  EXPORT_GROUPS,
  EXPORT_THEMES_LIVE,
  EXPORT_THEME_EXPORTS,
  isGroupPro,
} from '../../config/exportFormats.js'
import { ratio } from '../spectrum/spectrumKit.js'

// Where the pinned cards dock, in px from the top of the screen with the nav
// hidden. The CSS custom properties --stack-top-0/1/2 and the script's TOPS both
// read this one list.
export const STACK_TOPS = Object.freeze([84, 116, 148])

// Kerbside's primary. Every colour on the card is derived from it.
export const SIGNAL = '#FF5A1F'

/**
 * The palette tool's ramp for the Signal colour: ten steps, 50 to 900, made by
 * the app's own tint function. The 500 step is the brand colour itself (the tool
 * returns the nearest rounded hex there), so the row marked primary is exact.
 * Each step carries the ink that reads on it and its contrast grade.
 */
export function kerbsideRamp(seed = SIGNAL) {
  const labels = tintLabelsFor(10)
  const scale = tintsFor(seed).scale.slice(0, 10)
  return scale.map((made, i) => {
    const hex = labels[i] === '500' ? seed : made
    const dark = ratio(hex, '#0B0C0E')
    const light = ratio(hex, '#FFFFFF')
    const best = Math.max(dark, light)
    const grade = best >= 7 ? 'AAA' : best >= 4.5 ? 'AA' : best >= 3 ? 'AA large' : 'Fails'
    return {
      step: labels[i],
      hex,
      primary: labels[i] === '500',
      ink: dark >= light ? '#0B0C0E' : '#FFFFFF',
      ground: dark >= light ? 'black' : 'white',
      grade: `${grade} ${(Math.floor(best * 10) / 10).toFixed(1)}`,
    }
  })
}

// ships with the export themes
// Card 2's rows. With the themes live they are the exports a theme offers, in
// the order the card brings them forward (the brand kit is inside the brand book); otherwise they are what the export
// panel makes today (the guidelines deck, the design system book, the UI kit),
// read from the panel's own rows. `art` names the picture the row brings forward.
export function exportRows(live = EXPORT_THEMES_LIVE) {
  if (live) {
    const byId = Object.fromEntries(EXPORT_THEME_EXPORTS.map((e) => [e.id, e]))
    const pages = byId['brand-guidelines'].guidelinesPages
    const sub = {
      'brand-guidelines': `${pages} pages, as PDF and print-ready HTML`,
      'brand-book': 'A small site that works offline, with the brand kit inside',
      'ui-kit': 'A designed document and a code package',
    }
    return ['brand-guidelines', 'brand-book', 'ui-kit'].map((id) => ({
      id,
      art: id,
      name: byId[id].name,
      sub: sub[id],
      tag: byId[id].proOnly ? 'Pro' : THEME_FACTS.freeTag,
    }))
  }
  const group = (id) => EXPORT_GROUPS.find((g) => g.id === id)
  return [['guidelines', 'brand-guidelines'], ['book', 'brand-book'], ['kit', 'ui-kit']].map(([gid, art]) => ({
    id: gid,
    art,
    name: group(gid).name,
    sub: group(gid).desc,
    tag: isGroupPro(gid) ? 'Pro' : 'Free',
  }))
}

// ships with the export themes
// Card 2's paragraph and note.
export function exportCopy(live = EXPORT_THEMES_LIVE) {
  if (live) {
    return {
      body: `Your colour, type and spacing leave as ${THEME_FACTS.exportsPerThemeWord} exports: brand guidelines, an HTML brand book with the brand kit inside, and a UI kit. Choose from ${THEME_FACTS.countWord} themes, each with its own design language.`,
      note: `${THEME_FACTS.uiKitNote}. Everything else is Pro.`,
    }
  }
  const rows = exportRows(false)
  // Lower-case the first word, but leave an initialism such as "UI" alone.
  const lower = (n) => (/^[A-Z]{2}/.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1))
  const names = rows.map((r) => lower(r.name))
  const pro = rows.filter((r) => r.tag === 'Pro').map((r) => lower(r.name))
  const free = rows.filter((r) => r.tag !== 'Pro').map((r) => r.name)
  return {
    body: `Your colour, type and spacing leave as ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}.`,
    note: `The ${free.join(' and ')} ${free.length > 1 ? 'are' : 'is'} free. The ${pro.join(' and ')} ${pro.length > 1 ? 'are' : 'is'} Pro.`,
  }
}

// Card 3's pill and the sentence under the copy, from the Free project limit.
// `shown` is how many sample projects the card draws.
export function projectsLimit(shown) {
  const limit = FREE_SAVE_LIMITS.projects
  return {
    pill: `${shown} of ${limit}`,
    pillLong: ' projects on Free',
    note: `${numberWord(limit).replace(/^./, (c) => c.toUpperCase())} projects on Free, unlimited on Pro.`,
    // The card shows a full account; the pill must not claim more than the limit allows.
    full: shown >= limit,
  }
}
