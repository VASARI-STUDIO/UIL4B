// WHAT THE APP HEADER'S MENUS SAY — `UIL4B App.dc.html` lines 1058-1130 (the NAV
// table) and 2019-2082 (what the file renders from it).
//
// The copy is the design's, from that table, word for word. The NUMBERS in it
// are not typed: each is counted here from the data the menus list, so the
// sentence cannot be wrong on the day a tool ships.
import { createTools, DISCOVER_GROUPS } from '../../data/toolTree'
import { LEARN_ARTICLES, readingMinutes } from '../../data/learnIndex'

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty']

/** 13 → "Thirteen". Numbers past twenty stay numerals. */
export function numberWord(n) {
  return WORDS[n] || String(n)
}

/** Live = opens a working tool today: not Soon, and not Beta. */
export function liveCreateToolCount() {
  return createTools().filter((t) => !t.soon && !t.beta).length
}

export function liveLibraryCount() {
  return DISCOVER_GROUPS.filter((g) => !g.soon).length
}

export function publishedGuideCount() {
  return LEARN_ARTICLES.length
}

/**
 * The menu's columns, as the design stacks them. Create is three columns in
 * the tree already. Discover and Learn are two in the file (Browse | Community
 * + Your library; Guides | Foundations + Growth and help), while the tree deals
 * each group into its own column, so every column after the first is stacked
 * into one. Presentation only: the tree's own shape is untouched.
 */
export function menuStacks(section) {
  const cols = section.columns || []
  if (section.id === 'create' || cols.length <= 2) return cols
  return [cols[0], cols.slice(1).flat()]
}

/** The foot's left-hand line (NAV[i][2] in the file). */
export function menuFootNote(section) {
  if (section.id === 'create') {
    return `${numberWord(liveCreateToolCount())} live tools across colour, type, icons, media and AI.`
  }
  if (section.id === 'discover') return `${numberWord(liveLibraryCount())} libraries, free to browse.`
  return `${numberWord(publishedGuideCount())} published guides, more on the way.`
}

/** "View all create tools" — the file builds it the same way (line 2082). */
export function menuViewAll(section) {
  return `View all ${section.label.toLowerCase()} tools`
}

/** The promo pane's title, blurb and button label (NAV[i][3] in the file). */
export function menuPromo(section) {
  if (section.id === 'create') {
    return {
      title: 'Build your brand kit, step by step',
      blurb: 'A guided flow through colour, fonts, type scale and icons. Everything saves as you go, then exports as one system.',
      cta: 'Build a brand kit',
    }
  }
  if (section.id === 'discover') {
    return {
      title: 'Palettes, gradients, fonts, icons and prompts',
      blurb: `${numberWord(liveLibraryCount())} libraries you can open without an account, each with a way straight into the tool that finishes the job.`,
      cta: 'Open Discover',
      href: '/discover',
    }
  }
  return {
    title: 'Understand the why',
    blurb: 'Principles, theme systems and guides that make your interfaces hold up under real content.',
    cta: 'Read the guides',
    href: '/learn',
  }
}

/** The Learn pane: every published guide, its route and its reading time. */
export function menuGuides() {
  return LEARN_ARTICLES.map((a) => ({
    label: a.title,
    to: `/learn/${a.slug}`,
    mins: `${readingMinutes(a.words)} MIN`,
  }))
}
