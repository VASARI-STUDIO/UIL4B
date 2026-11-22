import { PROOF_STATS, TOOL_COUNT } from '../spectrum/spectrumFacts.js'
import { BOOKMARK_COUNT } from './bookmarkFolders.js'

// The first three figures are the sizes of the Discover palettes, the Discover
// gradients and the Icon Library's sets, read from PROOF_STATS, which counts
// each off the array the page renders. The product measures no usage, so no
// figure here claims anything about other people.
export const STATS = PROOF_STATS.slice(1).map(({ value, label }) => ({ n: value, label }))

// The fourth figure is a fact about the product, derived from the tool list and
// from the bookmark folders the bookmarks section draws.
export const TOOLS_FOR_BOOKMARKS = { n: TOOL_COUNT, label: `tools in place of ${BOOKMARK_COUNT} bookmarks` }

// The rows in the order the bar prints them.
export const PROOF_ROWS = [...STATS, TOOLS_FOR_BOOKMARKS]
